import { getInvoices } from "./actions";
import { InvoicesList } from "./invoices-list";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  // Serialize Decimal values for client components
  const serializedInvoices = invoices.map((invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
  }));

  return <InvoicesList invoices={serializedInvoices} />;
}
