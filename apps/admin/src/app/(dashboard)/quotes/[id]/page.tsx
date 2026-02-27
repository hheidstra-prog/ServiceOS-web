import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuote } from "../actions";
import { QuoteDetail } from "./quote-detail";
import { getCurrentUserAndOrg } from "@/lib/auth";

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = await params;
  const [quote, { organization }] = await Promise.all([
    getQuote(id),
    getCurrentUserAndOrg(),
  ]);

  if (!quote) {
    notFound();
  }

  // Serialize Decimal values for client components
  const serializedQuote = {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quotes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
            {quote.number}
          </h1>
          {quote.title && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{quote.title}</p>
          )}
        </div>
      </div>

      <QuoteDetail quote={serializedQuote} orgVatNumber={organization?.vatNumber} />
    </div>
  );
}
