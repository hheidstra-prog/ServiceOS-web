"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { InvoiceStatus, TaxType } from "@servible/database";
import { taxRateFromType } from "@/lib/tax-utils";
import { generateInvoicePdf } from "@servible/pdf/generate";
import type { PdfInvoiceData } from "@servible/pdf";
import { sendInvoiceEmail } from "@/lib/email";

// Get all invoices for the organization
export async function getInvoices() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.invoice.findMany({
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

// Get a single invoice with all details
export async function getInvoice(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  return db.invoice.findFirst({
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

// Generate next invoice number
async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastInvoice = await db.invoice.findFirst({
    where: {
      organizationId,
      number: { startsWith: `INV-${year}-` },
    },
    orderBy: { number: "desc" },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.number.split("-");
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `INV-${year}-${nextNum.toString().padStart(4, "0")}`;
}

// Create a new invoice
export async function createInvoice(data: {
  clientId: string;
  contactId?: string;
  notes?: string;
  paymentTerms?: string;
  dueDate?: Date;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const number = await generateInvoiceNumber(organization.id);

  // Default due date: 30 days from now
  const dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await db.invoice.create({
    data: {
      organizationId: organization.id,
      clientId: data.clientId,
      contactId: data.contactId || null,
      number,
      notes: data.notes,
      paymentTerms: data.paymentTerms || `Net ${organization.defaultPaymentTermDays} days`,
      dueDate,
      status: "DRAFT",
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      paidAmount: 0,
      currency: organization.defaultCurrency,
    },
  });

  revalidatePath("/invoices");
  return { id: invoice.id };
}

// Update invoice details
export async function updateInvoice(
  id: string,
  data: {
    notes?: string;
    paymentTerms?: string;
    dueDate?: Date;
    status?: InvoiceStatus;
    contactId?: string | null;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const invoice = await db.invoice.update({
    where: { id, organizationId: organization.id },
    data: {
      notes: data.notes,
      paymentTerms: data.paymentTerms,
      dueDate: data.dueDate,
      status: data.status,
      ...(data.contactId !== undefined && { contactId: data.contactId }),
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

// Delete an invoice
export async function deleteInvoice(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.invoice.delete({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/invoices");
}

// Add a line item to an invoice
export async function addInvoiceItem(
  invoiceId: string,
  data: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxType?: TaxType;
    taxRate?: number;
    serviceId?: string;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify invoice belongs to org
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
  });
  if (!invoice) throw new Error("Invoice not found");

  const taxType = data.taxType ?? "STANDARD";
  const taxRate = data.taxRate ?? taxRateFromType(taxType);
  const subtotal = data.quantity * data.unitPrice;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // Get max sort order
  const lastItem = await db.invoiceItem.findFirst({
    where: { invoiceId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  const item = await db.invoiceItem.create({
    data: {
      invoiceId,
      serviceId: data.serviceId,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      taxRate,
      taxType,
      subtotal,
      taxAmount,
      total,
      sortOrder,
    },
  });

  // Recalculate invoice totals
  await recalculateInvoiceTotals(invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { id: item.id };
}

// Update a line item
export async function updateInvoiceItem(
  itemId: string,
  invoiceId: string,
  data: {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    taxType?: TaxType;
    taxRate?: number;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify invoice belongs to org
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
  });
  if (!invoice) throw new Error("Invoice not found");

  // Get current item
  const currentItem = await db.invoiceItem.findUnique({ where: { id: itemId } });
  if (!currentItem) throw new Error("Item not found");

  const taxType = data.taxType ?? currentItem.taxType;
  const quantity = data.quantity ?? Number(currentItem.quantity);
  const unitPrice = data.unitPrice ?? Number(currentItem.unitPrice);
  const taxRate = data.taxRate ?? taxRateFromType(taxType);

  const subtotal = quantity * unitPrice;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const item = await db.invoiceItem.update({
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
    },
  });

  // Recalculate invoice totals
  await recalculateInvoiceTotals(invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { id: item.id };
}

// Delete a line item
export async function deleteInvoiceItem(itemId: string, invoiceId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify invoice belongs to org
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
  });
  if (!invoice) throw new Error("Invoice not found");

  await db.invoiceItem.delete({ where: { id: itemId } });

  // Recalculate invoice totals
  await recalculateInvoiceTotals(invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
}

// Recalculate invoice totals based on items
async function recalculateInvoiceTotals(invoiceId: string) {
  const items = await db.invoiceItem.findMany({
    where: { invoiceId },
  });

  const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const taxAmount = items.reduce((sum, item) => sum + Number(item.taxAmount), 0);
  const total = items.reduce((sum, item) => sum + Number(item.total), 0);

  await db.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, total },
  });
}

// Finalize invoice (lock editing, no email yet)
export async function finalizeInvoice(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const invoice = await db.invoice.update({
    where: { id, organizationId: organization.id },
    data: {
      status: "FINALIZED",
    },
    include: {
      client: { select: { id: true, status: true } },
    },
  });

  // Promote to CLIENT status if not already
  if (invoice.client.status !== "CLIENT" && invoice.client.status !== "ARCHIVED") {
    await db.client.update({
      where: { id: invoice.clientId },
      data: { status: "CLIENT" },
    });
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/clients");
}

// Send invoice to client (email + PDF)
export async function sendInvoice(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
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
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "DRAFT") throw new Error("Invoice must be finalized before sending");

  // Update status to SENT and set sentAt
  await db.invoice.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  // Determine email recipient: prefer contact email, fall back to client email
  const recipientEmail = invoice.contact?.email || invoice.client.email;
  const contactFullName = invoice.contact
    ? [invoice.contact.firstName, invoice.contact.lastName].filter(Boolean).join(" ")
    : null;

  // Send email notification (async, non-blocking)
  if (recipientEmail) {
    const locale = organization.locale || "en";
    const currency = invoice.currency || "EUR";

    const fmtCurrency = (amount: number) =>
      new Intl.NumberFormat(locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US", {
        style: "currency",
        currency,
      }).format(amount);

    const fmtDate = (date: Date | null) =>
      date
        ? new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(date)
        : "";

    const pdfData: PdfInvoiceData = {
      invoice: {
        number: invoice.number,
        status: "SENT",
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        notes: invoice.notes,
        paymentTerms: invoice.paymentTerms,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        total: Number(invoice.total),
        paidAmount: Number(invoice.paidAmount),
        currency,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          taxType: item.taxType,
          taxAmount: Number(item.taxAmount),
          subtotal: Number(item.subtotal),
          total: Number(item.total),
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
        ...invoice.client,
        contactName: contactFullName,
      },
    };

    generateInvoicePdf(pdfData)
      .then((pdfBuffer) =>
        sendInvoiceEmail({
          to: recipientEmail,
          clientName: contactFullName || invoice.client.companyName || invoice.client.name,
          organizationName: organization.name,
          invoiceNumber: invoice.number,
          totalFormatted: fmtCurrency(Number(invoice.total)),
          dueDateFormatted: fmtDate(invoice.dueDate),
          locale,
          pdfBuffer,
          pdfFilename: `${invoice.number}.pdf`,
        })
      )
      .catch((err) => console.error("Failed to send invoice email:", err));
  } else {
    console.warn(`Invoice ${invoice.number}: no recipient email, skipping notification`);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

// Record payment
export async function recordPayment(
  id: string,
  data: {
    amount: number;
    paidAt?: Date;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!invoice) throw new Error("Invoice not found");

  const newPaidAmount = Number(invoice.paidAmount) + data.amount;
  const total = Number(invoice.total);

  let newStatus: InvoiceStatus;
  if (newPaidAmount >= total) {
    newStatus = "PAID";
  } else if (newPaidAmount > 0) {
    newStatus = "PARTIALLY_PAID";
  } else {
    newStatus = invoice.status;
  }

  await db.invoice.update({
    where: { id, organizationId: organization.id },
    data: {
      paidAmount: newPaidAmount,
      paidAt: newPaidAmount >= total ? (data.paidAt || new Date()) : null,
      status: newStatus,
    },
  });

  // Payment status is tracked on the invoice itself — no client status change needed

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/clients");
}

// Duplicate an invoice
export async function duplicateInvoice(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const original = await db.invoice.findFirst({
    where: { id, organizationId: organization.id },
    include: { items: true },
  });
  if (!original) throw new Error("Invoice not found");

  const number = await generateInvoiceNumber(organization.id);

  // Default due date: 30 days from now
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const newInvoice = await db.invoice.create({
    data: {
      organizationId: organization.id,
      clientId: original.clientId,
      contactId: original.contactId,
      number,
      notes: original.notes,
      paymentTerms: original.paymentTerms,
      dueDate,
      status: "DRAFT",
      subtotal: original.subtotal,
      taxAmount: original.taxAmount,
      total: original.total,
      paidAmount: 0,
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
          sortOrder: item.sortOrder,
        })),
      },
    },
  });

  revalidatePath("/invoices");
  return { id: newInvoice.id };
}

// Create invoice from quote
export async function createInvoiceFromQuote(quoteId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const quote = await db.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
    include: {
      items: {
        where: {
          OR: [{ isOptional: false }, { isOptional: true, isSelected: true }],
        },
      },
    },
  });
  if (!quote) throw new Error("Quote not found");

  const number = await generateInvoiceNumber(organization.id);
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await db.invoice.create({
    data: {
      organizationId: organization.id,
      clientId: quote.clientId,
      contactId: quote.contactId,
      number,
      notes: quote.terms,
      dueDate,
      status: "DRAFT",
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      paidAmount: 0,
      currency: quote.currency,
      items: {
        create: quote.items.map((item) => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxType: item.taxType,
          subtotal: item.subtotal,
          taxAmount: item.taxAmount,
          total: item.total,
          sortOrder: item.sortOrder,
        })),
      },
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/quotes");
  return { id: invoice.id };
}

// Mark invoice as overdue (typically called by a cron job)
export async function markOverdueInvoices() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const now = new Date();

  await db.invoice.updateMany({
    where: {
      organizationId: organization.id,
      status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    data: {
      status: "OVERDUE",
    },
  });

  revalidatePath("/invoices");
}

// Toggle portal visibility
export async function toggleInvoicePortalVisibility(id: string, portalVisible: boolean) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.invoice.update({
    where: { id, organizationId: organization.id },
    data: { portalVisible },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
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
