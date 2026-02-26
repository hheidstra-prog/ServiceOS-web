"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { InvoiceStatus } from "@servible/database";
import { toggleInvoicePortalVisibility } from "@/app/(dashboard)/invoices/actions";
import { NewInvoiceDialog } from "../../../invoices/new-invoice-dialog";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number | null;
  paidAmount: number | null;
  currency: string;
  dueDate: Date;
  createdAt: Date;
  portalVisible: boolean;
}

interface InvoicesTabProps {
  client: {
    id: string;
    invoices: Invoice[];
  };
}

const statusConfig: Record<InvoiceStatus, { label: string; badgeColor: string; borderColor: string }> = {
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
  PARTIALLY_PAID: {
    label: "Partial",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-500/50",
  },
  PAID: {
    label: "Paid",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-500/50",
  },
  OVERDUE: {
    label: "Overdue",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-300 dark:border-rose-500/50",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeColor: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500",
    borderColor: "",
  },
  REFUNDED: {
    label: "Refunded",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-300 dark:border-purple-500/50",
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

function isOverdue(dueDate: Date, status: InvoiceStatus) {
  if (status === "PAID" || status === "CANCELLED" || status === "REFUNDED") return false;
  return new Date(dueDate) < new Date();
}

export function InvoicesTab({ client }: InvoicesTabProps) {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Invoices</h3>
          <p className="text-sm text-muted-foreground">
            Invoices and payments for this client
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {client.invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <FileText className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-muted-foreground">No invoices yet.</p>
            <Button onClick={() => setIsNewDialogOpen(true)} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create First Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {client.invoices.map((invoice) => {
            const config = statusConfig[invoice.status];
            const overdue = isOverdue(invoice.dueDate, invoice.status);
            return (
              <Card key={invoice.id} className={config.borderColor}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <Link href={`/invoices/${invoice.id}`}>
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
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                  {invoice.paidAmount && invoice.paidAmount > 0 && invoice.total && invoice.paidAmount < invoice.total && (
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>Paid</span>
                      <span>{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Due</span>
                    <span className={overdue ? "text-rose-600 dark:text-rose-400" : ""}>
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-950/5 dark:border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <Globe className="h-3 w-3" />
                      Client portal
                    </div>
                    <Switch
                      checked={invoice.portalVisible}
                      onCheckedChange={async (checked) => {
                        try {
                          await toggleInvoicePortalVisibility(invoice.id, checked);
                          toast.success(checked ? "Visible on portal" : "Hidden from portal");
                        } catch {
                          toast.error("Failed to update visibility");
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Invoice Dialog */}
      <NewInvoiceDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        preselectedClientId={client.id}
      />
    </div>
  );
}
