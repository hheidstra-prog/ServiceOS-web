"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteStatus } from "@servible/database";
import { NewQuoteDialog } from "../../../quotes/new-quote-dialog";

interface Quote {
  id: string;
  number: string;
  title: string | null;
  status: QuoteStatus;
  total: number | null;
  currency: string;
  validUntil: Date | null;
  createdAt: Date;
}

interface QuotesTabProps {
  client: {
    id: string;
    quotes: Quote[];
  };
}

const statusConfig: Record<QuoteStatus, { label: string; badgeColor: string; borderColor: string }> = {
  DRAFT: {
    label: "Draft",
    badgeColor: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    borderColor: "",
  },
  SENT: {
    label: "Sent",
    badgeColor: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    borderColor: "border-sky-300 dark:border-sky-500/50",
  },
  VIEWED: {
    label: "Viewed",
    badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    borderColor: "border-violet-300 dark:border-violet-500/50",
  },
  ACCEPTED: {
    label: "Accepted",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-500/50",
  },
  REJECTED: {
    label: "Rejected",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-300 dark:border-rose-500/50",
  },
  EXPIRED: {
    label: "Expired",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-500/50",
  },
};

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function QuotesTab({ client }: QuotesTabProps) {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Quotes</h3>
          <p className="text-sm text-muted-foreground">
            Quotes and proposals for this client
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      {client.quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <FileText className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-muted-foreground">No quotes yet.</p>
            <Button onClick={() => setIsNewDialogOpen(true)} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create First Quote
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {client.quotes.map((quote) => {
            const config = statusConfig[quote.status];
            return (
              <Card key={quote.id} className={config.borderColor}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="hover:underline"
                        >
                          {quote.number}
                        </Link>
                      </CardTitle>
                      {quote.title && (
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                          {quote.title}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <Link href={`/quotes/${quote.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${config.badgeColor}`}
                    >
                      {config.label}
                    </span>
                    <span className="font-medium text-zinc-950 dark:text-white">
                      {formatCurrency(quote.total, quote.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Created</span>
                    <span>{formatDate(quote.createdAt)}</span>
                  </div>
                  {quote.validUntil && (
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>Valid until</span>
                      <span>{formatDate(quote.validUntil)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Quote Dialog */}
      <NewQuoteDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        preselectedClientId={client.id}
      />
    </div>
  );
}
