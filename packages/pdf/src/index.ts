// ----- Types only — no runtime imports -----
// This file is safe to import from any Next.js context (pages, layouts, etc.)
// without pulling in @react-pdf/renderer.

export interface PdfOrganization {
  name: string;
  logo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  iban?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PdfClient {
  name: string;
  companyName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  vatNumber?: string | null;
  email?: string | null;
}

export interface PdfInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxType: string;
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface PdfInvoice {
  number: string;
  status: string;
  issueDate: Date | string;
  dueDate: Date | string;
  paidAt?: Date | string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  currency: string;
  items: PdfInvoiceItem[];
}

export interface PdfInvoiceData {
  invoice: PdfInvoice;
  organization: PdfOrganization;
  client: PdfClient;
}

// ----- Quote Types -----

export interface PdfQuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxType: string;
  taxAmount: number;
  subtotal: number;
  total: number;
  isOptional: boolean;
  isSelected: boolean;
}

export interface PdfQuote {
  number: string;
  status: string;
  title?: string | null;
  introduction?: string | null;
  terms?: string | null;
  createdAt: Date | string;
  validUntil?: Date | string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  items: PdfQuoteItem[];
}

export interface PdfQuoteData {
  quote: PdfQuote;
  organization: PdfOrganization;
  client: PdfClient;
}

export type { PdfAddress, PdfLineItem } from "./shared/components";
