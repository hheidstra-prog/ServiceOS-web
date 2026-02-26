"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, FileText, Send, Copy, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InvoiceStatus } from "@servible/database";
import { deleteInvoice, duplicateInvoice, finalizeInvoice } from "./actions";
import { NewInvoiceDialog } from "./new-invoice-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  currency: string;
  dueDate: Date;
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

interface InvoicesListProps {
  invoices: Invoice[];
}

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
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
  PARTIALLY_PAID: {
    label: "Partial",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
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

function isOverdue(dueDate: Date, status: InvoiceStatus) {
  if (status === "PAID" || status === "CANCELLED" || status === "REFUNDED") return false;
  return new Date(dueDate) < new Date();
}

export function InvoicesList({ invoices }: InvoicesListProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchLower) ||
      invoice.client.name.toLowerCase().includes(searchLower) ||
      invoice.client.companyName?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleFinalize = async (id: string) => {
    try {
      await finalizeInvoice(id);
      toast.success("Invoice finalized");
    } catch {
      toast.error("Failed to finalize invoice");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newInvoice = await duplicateInvoice(id);
      toast.success("Invoice duplicated");
      router.push(`/invoices/${newInvoice.id}`);
    } catch {
      toast.error("Failed to duplicate invoice");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Delete invoice", description: "Are you sure you want to delete this invoice? This action cannot be undone.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await deleteInvoice(id);
      toast.success("Invoice deleted");
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  // Calculate summary stats
  const stats = {
    outstanding: invoices
      .filter((i) => ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0),
    overdue: invoices
      .filter((i) => i.status === "OVERDUE" || isOverdue(i.dueDate, i.status))
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0),
    paidThisMonth: invoices
      .filter((i) => {
        if (i.status !== "PAID") return false;
        const paidDate = i.sentAt ? new Date(i.sentAt) : new Date(i.createdAt);
        const now = new Date();
        return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, i) => sum + i.total, 0),
  };

  return (
    <>{ConfirmDialog}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage invoices for your clients.
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          New invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-950/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
            {formatCurrency(stats.outstanding, "EUR")}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-950/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Overdue</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.overdue, "EUR")}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-950/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Paid this month</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.paidThisMonth, "EUR")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-zinc-950/20 focus:bg-sky-50/50 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-sky-950/20"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const).map((status) => (
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

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-900">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <FileText className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            {invoices.length === 0 ? "No invoices yet" : "No invoices found"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {invoices.length === 0
              ? "Create your first invoice to get started."
              : "Try adjusting your search or filters."}
          </p>
          {invoices.length === 0 && (
            <Button onClick={() => setIsNewDialogOpen(true)} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              New invoice
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
                  Invoice
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
                  Due Date
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
                  Amount
                </th>
                <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/10 dark:divide-white/10">
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-zinc-950/[0.025] dark:hover:bg-white/[0.025]"
                >
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-5">
                    <Link href={`/invoices/${invoice.id}`} className="group block">
                      <div className="text-sm font-medium text-zinc-950 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300">
                        {invoice.number}
                      </div>
                      <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 lg:hidden">
                        {invoice.client.companyName || invoice.client.name}
                      </div>
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 lg:table-cell">
                    <Link href={`/clients/${invoice.client.id}`} className="hover:underline">
                      {invoice.client.companyName || invoice.client.name}
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm md:table-cell">
                    <span
                      className={
                        isOverdue(invoice.dueDate, invoice.status)
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }
                    >
                      {formatDate(invoice.dueDate)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="text-sm font-medium text-zinc-950 dark:text-white">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </div>
                    {invoice.paidAmount > 0 && invoice.paidAmount < invoice.total && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Paid: {formatCurrency(invoice.paidAmount, invoice.currency)}
                      </div>
                    )}
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
                          <Link href={`/invoices/${invoice.id}`}>View</Link>
                        </DropdownMenuItem>
                        {invoice.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleFinalize(invoice.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Finalize
                          </DropdownMenuItem>
                        )}
                        {["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status) && (
                          <DropdownMenuItem onClick={() => setPaymentInvoice(invoice)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Record payment
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(invoice.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(invoice.id)}
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

      {/* New Invoice Dialog */}
      <NewInvoiceDialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen} />

      {/* Record Payment Dialog */}
      {paymentInvoice && (
        <RecordPaymentDialog
          open={!!paymentInvoice}
          onOpenChange={(open) => !open && setPaymentInvoice(null)}
          invoice={paymentInvoice}
        />
      )}
    </div>
    </>
  );
}
