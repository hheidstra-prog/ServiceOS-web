import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf";
import { QuotePdfDocument } from "./quote-pdf";
import type { PdfInvoiceData, PdfQuoteData } from "./index";

export async function generateInvoicePdf(
  data: PdfInvoiceData
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(InvoicePdfDocument, { data }) as any
  );
  return Buffer.from(buffer);
}

export async function generateQuotePdf(
  data: PdfQuoteData
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(QuotePdfDocument, { data }) as any
  );
  return Buffer.from(buffer);
}
