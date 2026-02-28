"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Send, Copy, CreditCard, MoreHorizontal, Download, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceStatus, TaxType } from "@servible/database";
import { TAX_TYPE_CONFIG } from "@/lib/tax-utils";
import { deleteInvoice, deleteInvoiceItem, duplicateInvoice, finalizeInvoice, sendInvoice, toggleInvoicePortalVisibility, updateInvoice } from "../actions";
import { InvoiceItemDialog } from "./invoice-item-dialog";
import { RecordPaymentDialog } from "../record-payment-dialog";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxType: TaxType;
  subtotal: number;
  taxAmount: number;
  total: number;
  service: { id: string; name: string } | null;
}

interface ContactInfo {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  isPrimary?: boolean;
}

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  notes: string | null;
  paymentTerms: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  currency: string;
  sentAt: Date | null;
  paidAt: Date | null;
  portalVisible: boolean;
  contact: ContactInfo | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    vatNumber: string | null;
    contacts: ContactInfo[];
  };
  items: InvoiceItem[];
}

interface InvoiceDetailProps {
  invoice: Invoice;
  orgVatNumber?: string | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; className: string; borderColor: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    borderColor: "",
  },
  FINALIZED: {
    label: "Finalized",
    className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    borderColor: "border-indigo-300 dark:border-indigo-500/50",
  },
  SENT: {
    label: "Sent",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    borderColor: "border-sky-300 dark:border-sky-500/50",
  },
  VIEWED: {
    label: "Viewed",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    borderColor: "border-violet-300 dark:border-violet-500/50",
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-500/50",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-500/50",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-300 dark:border-rose-500/50",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500",
    borderColor: "",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-300 dark:border-purple-500/50",
  },
};

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
    month: "long",
    year: "numeric",
  });
}

export function InvoiceDetail({ invoice, orgVatNumber }: InvoiceDetailProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const config = statusConfig[invoice.status];
  const remaining = invoice.total - invoice.paidAmount;
  const canEdit = invoice.status === "DRAFT";
  const canRecordPayment = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status);

  const canSend = ["FINALIZED", "SENT", "VIEWED", "OVERDUE"].includes(invoice.status);
  const isSent = invoice.sentAt !== null;

  const handleFinalize = async () => {
    try {
      await finalizeInvoice(invoice.id);
      toast.success("Invoice finalized");
    } catch {
      toast.error("Failed to finalize invoice");
    }
  };

  const handleSend = async () => {
    try {
      await sendInvoice(invoice.id);
      toast.success("Invoice sent to client");
    } catch {
      toast.error("Failed to send invoice");
    }
  };

  const handleDuplicate = async () => {
    try {
      const newInvoice = await duplicateInvoice(invoice.id);
      toast.success("Invoice duplicated");
      router.push(`/invoices/${newInvoice.id}`);
    } catch {
      toast.error("Failed to duplicate invoice");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: "Delete invoice", description: "Are you sure you want to delete this invoice? This action cannot be undone.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await deleteInvoice(invoice.id);
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    const ok = await confirm({ title: "Delete item", description: "Are you sure you want to delete this invoice item?", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await deleteInvoiceItem(itemId, invoice.id);
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  return (
    <>{ConfirmDialog}
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="space-y-6 lg:col-span-2">
        {/* Status & Actions */}
        <Card className={config.borderColor}>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ${config.className}`}>
                {config.label}
              </span>
              {invoice.status === "PAID" && invoice.paidAt && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Paid on {formatDate(invoice.paidAt)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {invoice.status === "DRAFT" && (
                <Button onClick={handleFinalize} size="sm">
                  <Lock className="mr-1.5 h-4 w-4" />
                  Finalize
                </Button>
              )}
              {canSend && (
                <Button onClick={handleSend} size="sm">
                  {isSent ? <RefreshCw className="mr-1.5 h-4 w-4" /> : <Send className="mr-1.5 h-4 w-4" />}
                  {isSent ? "Resend" : "Send to Client"}
                </Button>
              )}
              {canRecordPayment && (
                <Button onClick={() => setIsPaymentDialogOpen(true)} size="sm" variant="outline">
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Record Payment
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={`/api/invoices/${invoice.id}/pdf`} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Line Items</CardTitle>
            {canEdit && (
              <Button onClick={handleAddItem} size="sm" variant="outline">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Item
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {invoice.items.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No items yet. Add your first line item.
                </p>
                {canEdit && (
                  <Button onClick={handleAddItem} size="sm" className="mt-4">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-950/10 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className="py-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Description
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Price
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Tax
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Total
                      </th>
                      {canEdit && <th className="py-2 pl-3"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-950/10 dark:divide-white/10">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-3">
                          <div className="text-sm text-zinc-950 dark:text-white">
                            {item.description}
                          </div>
                          {item.service && (
                            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              Service: {item.service.name}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-zinc-950 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-zinc-950 dark:text-white">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-zinc-500 dark:text-zinc-400">
                          {item.taxRate}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-zinc-950 dark:text-white">
                          {formatCurrency(item.total, invoice.currency)}
                        </td>
                        {canEdit && (
                          <td className="whitespace-nowrap py-3 pl-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleEditItem(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            {invoice.items.length > 0 && (() => {
              // Group tax amounts by taxType
              const vatGroups = invoice.items.reduce<Record<string, { label: string; rate: number; amount: number }>>((acc, item) => {
                const type = item.taxType || "STANDARD";
                const config = TAX_TYPE_CONFIG[type as keyof typeof TAX_TYPE_CONFIG];
                if (!acc[type]) {
                  acc[type] = { label: config?.label || `${item.taxRate}%`, rate: item.taxRate, amount: 0 };
                }
                acc[type].amount += item.taxAmount;
                return acc;
              }, {});
              const vatLines = Object.entries(vatGroups);
              const hasReverseCharge = invoice.items.some((item) => item.taxType === "REVERSE_CHARGE");

              return (
                <div className="mt-4 border-t border-zinc-950/10 pt-4 dark:border-white/10">
                  <div className="w-full space-y-2 sm:ml-auto sm:max-w-xs">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                      <span className="text-zinc-950 dark:text-white">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    {vatLines.map(([type, group]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">VAT {group.label}</span>
                        <span className="text-zinc-950 dark:text-white">
                          {formatCurrency(group.amount, invoice.currency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-zinc-950/10 pt-2 text-base font-medium dark:border-white/10">
                      <span className="text-zinc-950 dark:text-white">Total</span>
                      <span className="text-zinc-950 dark:text-white">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </div>
                    {invoice.paidAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500 dark:text-zinc-400">Paid</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            -{formatCurrency(invoice.paidAmount, invoice.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-950/10 pt-2 text-base font-medium dark:border-white/10">
                          <span className="text-zinc-950 dark:text-white">Balance Due</span>
                          <span className="text-zinc-950 dark:text-white">
                            {formatCurrency(remaining, invoice.currency)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {hasReverseCharge && (
                    <div className="mt-4 rounded-md border border-zinc-950/10 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-400">
                      <p className="font-medium">VAT reverse charged / BTW verlegd</p>
                      {orgVatNumber && <p>Supplier VAT: {orgVatNumber}</p>}
                      {invoice.client.vatNumber && <p>Client VAT: {invoice.client.vatNumber}</p>}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Portal Visibility */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="portalVisible">Client Portal</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Show this invoice on the client portal
                </p>
              </div>
              <Switch
                id="portalVisible"
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

        {/* Invoice Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Issue Date</span>
              <span className="text-zinc-950 dark:text-white">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Due Date</span>
              <span className="text-zinc-950 dark:text-white">{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.sentAt && (
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Sent</span>
                <span className="text-zinc-950 dark:text-white">{formatDate(invoice.sentAt)}</span>
              </div>
            )}
            {invoice.paymentTerms && (
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Terms</span>
                <span className="text-zinc-950 dark:text-white">{invoice.paymentTerms}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <Link
                href={`/clients/${invoice.client.id}`}
                className="font-medium text-zinc-950 hover:underline dark:text-white"
              >
                {invoice.client.companyName || invoice.client.name}
              </Link>
              {invoice.contact && (
                <p className="text-zinc-600 dark:text-zinc-300">
                  Attn: {invoice.contact.firstName} {invoice.contact.lastName}
                </p>
              )}
              {!invoice.contact && invoice.client.companyName && (
                <p className="text-zinc-500 dark:text-zinc-400">{invoice.client.name}</p>
              )}
            </div>
            {invoice.client.contacts.length > 0 && (
              <Select
                value={invoice.contact?.id || "none"}
                onValueChange={async (value) => {
                  try {
                    await updateInvoice(invoice.id, { contactId: value === "none" ? null : value });
                    toast.success("Contact updated");
                  } catch {
                    toast.error("Failed to update contact");
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {invoice.client.contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.email ? ` (${c.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(invoice.client.addressLine1 || invoice.client.city) && (
              <div className="text-zinc-500 dark:text-zinc-400">
                {invoice.client.addressLine1 && <p>{invoice.client.addressLine1}</p>}
                {invoice.client.addressLine2 && <p>{invoice.client.addressLine2}</p>}
                {(invoice.client.postalCode || invoice.client.city) && (
                  <p>
                    {invoice.client.postalCode} {invoice.client.city}
                  </p>
                )}
                {invoice.client.country && <p>{invoice.client.country}</p>}
              </div>
            )}
            {invoice.client.vatNumber && (
              <p className="text-zinc-500 dark:text-zinc-400">
                VAT: {invoice.client.vatNumber}
              </p>
            )}
            {invoice.client.email && (
              <p className="text-zinc-500 dark:text-zinc-400">{invoice.client.email}</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
                {invoice.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <InvoiceItemDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        invoiceId={invoice.id}
        currency={invoice.currency}
        editingItem={editingItem}
      />

      <RecordPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        invoice={invoice}
      />
    </div>
    </>
  );
}
