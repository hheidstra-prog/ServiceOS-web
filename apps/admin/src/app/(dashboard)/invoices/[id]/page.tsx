import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInvoice } from "../actions";
import { InvoiceDetail } from "./invoice-detail";
import { getCurrentUserAndOrg } from "@/lib/auth";

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const [invoice, { organization }] = await Promise.all([
    getInvoice(id),
    getCurrentUserAndOrg(),
  ]);

  if (!invoice) {
    notFound();
  }

  // Serialize Decimal values for client components
  const serializedInvoice = {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      subtotal: Number(item.subtotal),
      taxAmount: Number(item.taxAmount),
      total: Number(item.total),
    })),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
            {invoice.number}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {invoice.client.companyName || invoice.client.name}
          </p>
        </div>
      </div>

      <InvoiceDetail invoice={serializedInvoice} orgVatNumber={organization?.vatNumber} />
    </div>
  );
}
