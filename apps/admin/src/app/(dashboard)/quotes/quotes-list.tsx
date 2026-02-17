"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, FileText, Send, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuoteStatus } from "@serviceos/database";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteQuote, duplicateQuote, sendQuote } from "./actions";
import { NewQuoteDialog } from "./new-quote-dialog";

interface Quote {
  id: string;
  number: string;
  title: string | null;
  status: QuoteStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  validUntil: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
  };
  _count: {
    items: number;
  };
}

interface QuotesListProps {
  quotes: Quote[];
}

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
  SENT: {
    label: "Sent",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  VIEWED: {
    label: "Viewed",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number, currency: string) {
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

export function QuotesList({ quotes }: QuotesListProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "ALL">("ALL");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const filteredQuotes = quotes.filter((quote) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      quote.number.toLowerCase().includes(searchLower) ||
      quote.title?.toLowerCase().includes(searchLower) ||
      quote.client.name.toLowerCase().includes(searchLower) ||
      quote.client.companyName?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "ALL" || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSend = async (id: string) => {
    try {
      await sendQuote(id);
      toast.success("Quote sent");
    } catch {
      toast.error("Failed to send quote");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newQuote = await duplicateQuote(id);
      toast.success("Quote duplicated");
      router.push(`/quotes/${newQuote.id}`);
    } catch {
      toast.error("Failed to duplicate quote");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Delete quote", description: "Are you sure you want to delete this quote? This action cannot be undone.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await deleteQuote(id);
      toast.success("Quote deleted");
    } catch {
      toast.error("Failed to delete quote");
    }
  };

  return (
    <>{ConfirmDialog}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Quotes
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage quotes for your clients.
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          New quote
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-zinc-950/20 focus:bg-sky-50/50 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-sky-950/20"
          />
        </div>
        <div className="flex gap-1">
          {(["ALL", "DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {status === "ALL" ? "All" : statusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-900">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <FileText className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            {quotes.length === 0 ? "No quotes yet" : "No quotes found"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {quotes.length === 0
              ? "Create your first quote to get started."
              : "Try adjusting your search or filters."}
          </p>
          {quotes.length === 0 && (
            <Button onClick={() => setIsNewDialogOpen(true)} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              New quote
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-950/10 dark:divide-white/10">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="py-2.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:pl-5"
                >
                  Quote
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell"
                >
                  Client
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 md:table-cell"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Total
                </th>
                <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/10 dark:divide-white/10">
              {filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="transition-colors hover:bg-zinc-950/[0.025] dark:hover:bg-white/[0.025]"
                >
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-5">
                    <Link href={`/quotes/${quote.id}`} className="group block">
                      <div className="text-sm font-medium text-zinc-950 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300">
                        {quote.number}
                      </div>
                      {quote.title && (
                        <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                          {quote.title}
                        </div>
                      )}
                      <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 lg:hidden">
                        {quote.client.companyName || quote.client.name}
                      </div>
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 lg:table-cell">
                    <Link href={`/clients/${quote.client.id}`} className="hover:underline">
                      {quote.client.companyName || quote.client.name}
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 md:table-cell">
                    {formatDate(quote.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-zinc-950 dark:text-white">
                    {formatCurrency(quote.total, quote.currency)}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right sm:pr-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/quotes/${quote.id}`}>View</Link>
                        </DropdownMenuItem>
                        {quote.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleSend(quote.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Send to client
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(quote.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(quote.id)}
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Quote Dialog */}
      <NewQuoteDialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen} />
    </div>
    </>
  );
}
