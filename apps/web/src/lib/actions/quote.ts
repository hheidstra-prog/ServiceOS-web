"use server";

import { db } from "@servible/database";
import { cookies } from "next/headers";

// ─── Session Validation ───

async function validatePortalSession(domain: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;
  if (!token) return null;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: { organizationId: true },
  });

  if (!site) return null;

  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: { organizationId: site.organizationId },
    },
    select: { clientId: true },
  });

  if (!session) return null;

  return { clientId: session.clientId, organizationId: site.organizationId };
}

// ─── Get Portal Quotes (listing) ───

export async function getPortalQuotes(domain: string) {
  const session = await validatePortalSession(domain);
  if (!session) return null;

  const quotes = await db.quote.findMany({
    where: {
      clientId: session.clientId,
      portalVisible: true,
      status: { not: "DRAFT" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      total: true,
      currency: true,
      validUntil: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return quotes;
}

// ─── Get Single Portal Quote (detail) ───

export async function getPortalQuote(domain: string, quoteId: string) {
  const session = await validatePortalSession(domain);
  if (!session) return null;

  const quote = await db.quote.findFirst({
    where: {
      id: quoteId,
      clientId: session.clientId,
      portalVisible: true,
      status: { not: "DRAFT" },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          country: true,
          vatNumber: true,
        },
      },
      organization: {
        select: {
          name: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          country: true,
          vatNumber: true,
        },
      },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          taxRate: true,
          taxType: true,
          subtotal: true,
          taxAmount: true,
          total: true,
          isOptional: true,
          isSelected: true,
        },
      },
    },
  });

  if (!quote) return null;

  // Serialize Decimal values
  return {
    ...quote,
    subtotal: Number(quote.subtotal),
    taxAmount: Number(quote.taxAmount),
    total: Number(quote.total),
    items: quote.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      subtotal: Number(item.subtotal),
      taxAmount: Number(item.taxAmount),
      total: Number(item.total),
    })),
  };
}

// ─── Accept Quote ───

export async function acceptQuote(domain: string, quoteId: string) {
  const session = await validatePortalSession(domain);
  if (!session) return { error: "Unauthorized" };

  // Verify the quote belongs to this client and is in an acceptable state
  const quote = await db.quote.findFirst({
    where: {
      id: quoteId,
      clientId: session.clientId,
      portalVisible: true,
      status: { in: ["FINALIZED", "SENT", "VIEWED"] },
    },
    select: { id: true, clientId: true },
  });

  if (!quote) return { error: "Quote not found or cannot be accepted" };

  await db.$transaction([
    db.quote.update({
      where: { id: quoteId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    }),
    // Promote client from PROSPECT to CLIENT when they accept a quote
    db.client.updateMany({
      where: {
        id: quote.clientId,
        status: { in: ["LEAD", "PROSPECT"] },
      },
      data: { status: "CLIENT" },
    }),
  ]);

  return { success: true };
}

// ─── Reject Quote ───

export async function rejectQuote(domain: string, quoteId: string) {
  const session = await validatePortalSession(domain);
  if (!session) return { error: "Unauthorized" };

  const quote = await db.quote.findFirst({
    where: {
      id: quoteId,
      clientId: session.clientId,
      portalVisible: true,
      status: { in: ["FINALIZED", "SENT", "VIEWED"] },
    },
    select: { id: true },
  });

  if (!quote) return { error: "Quote not found or cannot be rejected" };

  await db.quote.update({
    where: { id: quoteId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });

  return { success: true };
}
