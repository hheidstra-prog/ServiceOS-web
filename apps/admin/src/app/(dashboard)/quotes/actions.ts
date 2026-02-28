"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { QuoteStatus, TaxType } from "@servible/database";
import { taxRateFromType } from "@/lib/tax-utils";
import { generateQuotePdf } from "@servible/pdf/generate";
import type { PdfQuoteData } from "@servible/pdf";
import { sendQuoteEmail } from "@/lib/email";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
          contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isPrimary: true,
            },
            orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
          },
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
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
  contactId?: string;
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
      contactId: data.contactId || null,
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
  return { id: quote.id };
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
    portalVisible?: boolean;
    sentAt?: Date;
    contactId?: string | null;
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
  return { id: quote.id };
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
  return { id: item.id };
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
  return { id: item.id };
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
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          status: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          country: true,
          vatNumber: true,
        },
      },
      contact: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        orderBy: { sortOrder: "asc" as const },
      },
    },
  });

  // Promote lead to prospect when sending a quote
  if (quote.client.status === "LEAD") {
    await db.client.update({
      where: { id: quote.clientId },
      data: { status: "PROSPECT" },
    });
  }

  // Determine email recipient: prefer contact email, fall back to client email
  const recipientEmail = quote.contact?.email || quote.client.email;
  const contactFullName = quote.contact
    ? [quote.contact.firstName, quote.contact.lastName].filter(Boolean).join(" ")
    : null;

  // Send email notification (async, non-blocking)
  if (recipientEmail) {
    const locale = organization.locale || "en";
    const currency = quote.currency || "EUR";

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat(locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US", {
        style: "currency",
        currency,
      }).format(amount);

    const formatDate = (date: Date | null) =>
      date
        ? new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(date)
        : null;

    const pdfData: PdfQuoteData = {
      quote: {
        number: quote.number,
        status: quote.status,
        title: quote.title,
        introduction: quote.introduction,
        terms: quote.terms,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
        subtotal: Number(quote.subtotal),
        taxAmount: Number(quote.taxAmount),
        total: Number(quote.total),
        currency,
        items: quote.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          taxType: item.taxType,
          taxAmount: Number(item.taxAmount),
          subtotal: Number(item.subtotal),
          total: Number(item.total),
          isOptional: item.isOptional,
          isSelected: item.isSelected,
        })),
      },
      organization: {
        name: organization.name,
        logo: organization.logo,
        addressLine1: organization.addressLine1,
        addressLine2: organization.addressLine2,
        postalCode: organization.postalCode,
        city: organization.city,
        country: organization.country,
        vatNumber: organization.vatNumber,
        registrationNumber: organization.registrationNumber,
        iban: organization.iban,
        email: organization.email,
        phone: organization.phone,
      },
      client: {
        ...quote.client,
        contactName: contactFullName,
      },
    };

    generateQuotePdf(pdfData)
      .then((pdfBuffer) =>
        sendQuoteEmail({
          to: recipientEmail,
          clientName: contactFullName || quote.client.companyName || quote.client.name,
          organizationName: organization.name,
          quoteNumber: quote.number,
          quoteTitle: quote.title,
          totalFormatted: formatCurrency(Number(quote.total)),
          validUntilFormatted: formatDate(quote.validUntil),
          locale,
          pdfBuffer,
          pdfFilename: `${quote.number}.pdf`,
        })
      )
      .catch((err) => console.error("Failed to send quote email:", err));
  } else {
    console.warn(`Quote ${quote.number}: no recipient email, skipping notification`);
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/clients");
  return { id: quote.id };
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
      contactId: original.contactId,
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
  return { id: newQuote.id };
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

// Get contacts for a client (for contact selector)
export async function getContactsForClient(clientId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.contact.findMany({
    where: {
      clientId,
      client: { organizationId: organization.id },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
  });
}

// Get services for dropdown
export async function getServicesForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const services = await db.service.findMany({
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

  return services.map((s) => ({
    ...s,
    price: Number(s.price),
  }));
}

// Generate AI introduction for a quote
export async function generateQuoteIntroduction(quoteId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const quote = await db.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
    include: {
      client: {
        select: { name: true, companyName: true },
      },
      items: {
        select: { description: true, quantity: true, unitPrice: true, total: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!quote) throw new Error("Quote not found");

  const org = await db.organization.findUnique({
    where: { id: organization.id },
    select: {
      name: true,
      locale: true,
      toneOfVoice: true,
      industry: true,
    },
  });

  const locale = org?.locale || "en";
  const langMap: Record<string, string> = {
    nl: "Dutch", en: "English", de: "German", fr: "French",
  };
  const language = langMap[locale] || "English";

  const clientName = quote.client.companyName || quote.client.name;
  const itemsSummary = quote.items.length > 0
    ? quote.items.map((i) => `- ${i.description} (${Number(i.quantity)} × €${Number(i.unitPrice)})`).join("\n")
    : "No items yet";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: `Write a professional quote introduction paragraph for a client.

Company: ${org?.name}
${org?.industry ? `Industry: ${org.industry}` : ""}
${org?.toneOfVoice ? `Tone: ${org.toneOfVoice}` : ""}
Client: ${clientName}
${quote.title ? `Quote title: ${quote.title}` : ""}

Line items:
${itemsSummary}

Requirements:
- Write in ${language}
- 2-4 sentences, professional but warm
- Reference the services/work being quoted
- Do NOT include greetings like "Dear..." — this is the body introduction, not a letter
- Do NOT include pricing or amounts
- Output ONLY the introduction text, nothing else`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}
