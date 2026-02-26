import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalQuote } from "@/lib/actions/quote";
import { QuoteDetailClient } from "./quote-detail-client";

interface QuoteDetailPageProps {
  params: Promise<{ domain: string; quoteId: string }>;
}

export const metadata: Metadata = {
  title: "Quote Details",
};

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { domain, quoteId } = await params;
  const quote = await getPortalQuote(domain, quoteId);

  if (!quote) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Quote not found</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This quote doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/portal/quotes"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/quotes"
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {quote.number}
          </h1>
          {quote.title && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{quote.title}</p>
          )}
        </div>
      </div>

      <QuoteDetailClient quote={quote} domain={domain} />
    </div>
  );
}
