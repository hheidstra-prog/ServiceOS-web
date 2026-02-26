"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { QuoteStatus, TaxType } from "@servible/database";
import { taxRateFromType } from "@/lib/tax-utils";

// Get all quotes for the organization
export async function getQuotes() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.quote.findMany({
    where: { organizationId: organization.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
        },
      },
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get a single quote with all details
export async function getQuote(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  return db.quote.findFirst({
    where: {
      id,
      organizationId: organization.id,
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
      items: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

// Generate next quote number
async function generateQuoteNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastQuote = await db.quote.findFirst({
    where: {
      organizationId,
      number: { startsWith: `Q-${year}-` },
    },
    orderBy: { number: "desc" },
  });

  let nextNum = 1;
  if (lastQuote) {
    const parts = lastQuote.number.split("-");
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `Q-${year}-${nextNum.toString().padStart(4, "0")}`;
}

// Create a new quote
export async function createQuote(data: {
  clientId: string;
  title?: string;
  introduction?: string;
  terms?: string;
  validUntil?: Date;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const number = await generateQuoteNumber(organization.id);

  const quote = await db.quote.create({
    data: {
      organizationId: organization.id,
      clientId: data.clientId,
      number,
      title: data.title,
      introduction: data.introduction,
      terms: data.terms,
      validUntil: data.validUntil,
      status: "DRAFT",
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      currency: organization.defaultCurrency,
    },
  });

  revalidatePath("/quotes");
  return quote;
}

// Update quote details
export async function updateQuote(
  id: string,
  data: {
    title?: string;
    introduction?: string;
    terms?: string;
    validUntil?: Date | null;
    status?: QuoteStatus;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const quote = await db.quote.update({
    where: { id, organizationId: organization.id },
    data,
  });

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  return quote;
}

// Delete a quote
export async function deleteQuote(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.quote.delete({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/quotes");
}

// Add a line item to a quote
export async function addQuoteItem(
  quoteId: string,
  data: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxType?: TaxType;
    taxRate?: number;
    isOptional?: boolean;
    serviceId?: string;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify quote belongs to org
  const quote = await db.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
  });
  if (!quote) throw new Error("Quote not found");

  const taxType = data.taxType ?? "STANDARD";
  const taxRate = data.taxRate ?? taxRateFromType(taxType);
  const subtotal = data.quantity * data.unitPrice;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // Get max sort order
  const lastItem = await db.quoteItem.findFirst({
    where: { quoteId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  const item = await db.quoteItem.create({
    data: {
      quoteId,
      serviceId: data.serviceId,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      taxRate,
      taxType,
      subtotal,
      taxAmount,
      total,
      isOptional: data.isOptional ?? false,
      sortOrder,
    },
  });

  // Recalculate quote totals
  await recalculateQuoteTotals(quoteId);

  revalidatePath(`/quotes/${quoteId}`);
  return item;
}

// Update a line item
export async function updateQuoteItem(
  itemId: string,
  quoteId: string,
  data: {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    taxType?: TaxType;
    taxRate?: number;
    isOptional?: boolean;
    isSelected?: boolean;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify quote belongs to org
  const quote = await db.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
  });
  if (!quote) throw new Error("Quote not found");

  // Get current item
  const currentItem = await db.quoteItem.findUnique({ where: { id: itemId } });
  if (!currentItem) throw new Error("Item not found");

  const taxType = data.taxType ?? currentItem.taxType;
  const quantity = data.quantity ?? Number(currentItem.quantity);
  const unitPrice = data.unitPrice ?? Number(currentItem.unitPrice);
  const taxRate = data.taxRate ?? taxRateFromType(taxType);

  const subtotal = quantity * unitPrice;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const item = await db.quoteItem.update({
    where: { id: itemId },
    data: {
      description: data.description,
      quantity,
      unitPrice,
      taxType,
      taxRate,
      subtotal,
      taxAmount,
      total,
      isOptional: data.isOptional,
      isSelected: data.isSelected,
    },
  });

  // Recalculate quote totals
  await recalculateQuoteTotals(quoteId);

  revalidatePath(`/quotes/${quoteId}`);
  return item;
}

// Delete a line item
export async function deleteQuoteItem(itemId: string, quoteId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify quote belongs to org
  const quote = await db.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
  });
  if (!quote) throw new Error("Quote not found");

  await db.quoteItem.delete({ where: { id: itemId } });

  // Recalculate quote totals
  await recalculateQuoteTotals(quoteId);

  revalidatePath(`/quotes/${quoteId}`);
}

// Recalculate quote totals based on items
async function recalculateQuoteTotals(quoteId: string) {
  const items = await db.quoteItem.findMany({
    where: {
      quoteId,
      // Only include selected items (optional items can be deselected)
      OR: [{ isOptional: false }, { isOptional: true, isSelected: true }],
    },
  });

  const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const taxAmount = items.reduce((sum, item) => sum + Number(item.taxAmount), 0);
  const total = items.reduce((sum, item) => sum + Number(item.total), 0);

  await db.quote.update({
    where: { id: quoteId },
    data: { subtotal, taxAmount, total },
  });
}

// Send quote to client
export async function sendQuote(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const quote = await db.quote.update({
    where: { id, organizationId: organization.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
    include: {
      client: true,
    },
  });

  // Promote lead to prospect when sending a quote
  if (quote.client.status === "LEAD") {
    await db.client.update({
      where: { id: quote.clientId },
      data: { status: "PROSPECT" },
    });
  }

  // TODO: Send email notification

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/clients");
  return quote;
}

// Duplicate a quote
export async function duplicateQuote(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const original = await db.quote.findFirst({
    where: { id, organizationId: organization.id },
    include: { items: true },
  });
  if (!original) throw new Error("Quote not found");

  const number = await generateQuoteNumber(organization.id);

  const newQuote = await db.quote.create({
    data: {
      organizationId: organization.id,
      clientId: original.clientId,
      number,
      title: original.title ? `${original.title} (Copy)` : undefined,
      introduction: original.introduction,
      terms: original.terms,
      status: "DRAFT",
      subtotal: original.subtotal,
      taxAmount: original.taxAmount,
      total: original.total,
      currency: original.currency,
      items: {
        create: original.items.map((item) => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxType: item.taxType,
          subtotal: item.subtotal,
          taxAmount: item.taxAmount,
          total: item.total,
          isOptional: item.isOptional,
          isSelected: item.isSelected,
          sortOrder: item.sortOrder,
        })),
      },
    },
  });

  revalidatePath("/quotes");
  return newQuote;
}

// Get clients for dropdown
export async function getClientsForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.client.findMany({
    where: {
      organizationId: organization.id,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      companyName: true,
    },
    orderBy: { name: "asc" },
  });
}

// Get services for dropdown
export async function getServicesForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.service.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      pricingType: true,
      unit: true,
      taxType: true,
    },
    orderBy: { name: "asc" },
  });
}
