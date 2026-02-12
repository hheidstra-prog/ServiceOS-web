"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  Copy,
  Trash2,
  Plus,
  Pencil,
  MoreHorizontal,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuoteStatus } from "@serviceos/database";
import {
  deleteQuote,
  duplicateQuote,
  sendQuote,
  deleteQuoteItem,
} from "../actions";
import { QuoteItemDialog } from "./quote-item-dialog";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  isOptional: boolean;
  isSelected: boolean;
  sortOrder: number;
  service: { id: string; name: string } | null;
}

interface Quote {
  id: string;
  number: string;
  title: string | null;
  introduction: string | null;
  terms: string | null;
  status: QuoteStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  validUntil: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
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
  };
  items: QuoteItem[];
}

interface QuoteDetailProps {
  quote: Quote;
}

const statusConfig: Record<QuoteStatus, { label: string; className: string; borderClass: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    borderClass: "",
  },
  SENT: {
    label: "Sent",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    borderClass: "border-sky-300 dark:border-sky-500/50",
  },
  VIEWED: {
    label: "Viewed",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    borderClass: "border-violet-300 dark:border-violet-500/50",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-300 dark:border-emerald-500/50",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderClass: "border-rose-300 dark:border-rose-500/50",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-300 dark:border-amber-500/50",
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

export function QuoteDetail({ quote }: QuoteDetailProps) {
  const router = useRouter();
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);

  const handleSend = async () => {
    try {
      await sendQuote(quote.id);
      toast.success("Quote sent to client");
    } catch {
      toast.error("Failed to send quote");
    }
  };

  const handleDuplicate = async () => {
    try {
      const newQuote = await duplicateQuote(quote.id);
      toast.success("Quote duplicated");
      router.push(`/quotes/${newQuote.id}`);
    } catch {
      toast.error("Failed to duplicate quote");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this quote?")) return;
    try {
      await deleteQuote(quote.id);
      toast.success("Quote deleted");
      router.push("/quotes");
    } catch {
      toast.error("Failed to delete quote");
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: QuoteItem) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteQuoteItem(itemId, quote.id);
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const statusInfo = statusConfig[quote.status];
  const isDraft = quote.status === "DRAFT";

  return (
    <div className="space-y-6">
      {/* Status & Actions Bar */}
      <Card className={statusInfo.borderClass}>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Created {formatDate(quote.createdAt)}
            </span>
          </div>
          <div className="flex gap-2">
            {isDraft && (
              <Button onClick={handleSend} size="sm">
                <Send className="mr-1.5 h-4 w-4" />
                Send to Client
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="mr-1.5 h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Introduction */}
          {quote.introduction && (
            <Card>
              <CardHeader>
                <CardTitle>Introduction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {quote.introduction}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              {isDraft && (
                <Button onClick={handleAddItem} size="sm" variant="outline">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {quote.items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No items added yet.
                  </p>
                  {isDraft && (
                    <Button onClick={handleAddItem} size="sm" className="mt-3">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add First Item
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-950/10 dark:border-white/10">
                        <th className="py-2 pl-6 pr-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
                        <th className="py-2 pl-3 pr-6 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Total
                        </th>
                        {isDraft && <th className="w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950/5 dark:divide-white/5">
                      {quote.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pl-6 pr-3">
                            <div className="text-sm text-zinc-950 dark:text-white">
                              {item.description}
                            </div>
                            {item.isOptional && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Optional
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300">
                            {formatCurrency(item.unitPrice, quote.currency)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-zinc-500 dark:text-zinc-400">
                            {item.taxRate}%
                          </td>
                          <td className="py-3 pl-3 pr-6 text-right text-sm font-medium text-zinc-950 dark:text-white">
                            {formatCurrency(item.total, quote.currency)}
                          </td>
                          {isDraft && (
                            <td className="py-3 pr-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-xs">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteItem(item.id)}
                                    variant="destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              {quote.items.length > 0 && (
                <div className="mt-4 border-t border-zinc-950/10 pt-4 dark:border-white/10">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                        <span className="text-zinc-950 dark:text-white">
                          {formatCurrency(quote.subtotal, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">Tax</span>
                        <span className="text-zinc-950 dark:text-white">
                          {formatCurrency(quote.taxAmount, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-950/10 pt-2 dark:border-white/10">
                        <span className="font-semibold text-zinc-950 dark:text-white">Total</span>
                        <span className="font-semibold text-zinc-950 dark:text-white">
                          {formatCurrency(quote.total, quote.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terms */}
          {quote.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {quote.terms}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href={`/clients/${quote.client.id}`}
                className="text-sm font-medium text-zinc-950 hover:underline dark:text-white"
              >
                {quote.client.companyName || quote.client.name}
              </Link>

              {quote.client.companyName && (
                <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Building className="h-4 w-4 shrink-0 mt-0.5" />
                  {quote.client.name}
                </div>
              )}

              {quote.client.email && (
                <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                  <a href={`mailto:${quote.client.email}`} className="hover:underline">
                    {quote.client.email}
                  </a>
                </div>
              )}

              {quote.client.phone && (
                <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Phone className="h-4 w-4 shrink-0 mt-0.5" />
                  <a href={`tel:${quote.client.phone}`} className="hover:underline">
                    {quote.client.phone}
                  </a>
                </div>
              )}

              {quote.client.addressLine1 && (
                <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <div>{quote.client.addressLine1}</div>
                    {quote.client.addressLine2 && <div>{quote.client.addressLine2}</div>}
                    <div>
                      {quote.client.postalCode} {quote.client.city}
                    </div>
                    {quote.client.country && <div>{quote.client.country}</div>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
                <div>
                  <div className="text-zinc-500 dark:text-zinc-400">Valid Until</div>
                  <div className="text-zinc-950 dark:text-white">
                    {formatDate(quote.validUntil)}
                  </div>
                </div>
              </div>

              {quote.sentAt && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-400">Sent</div>
                    <div className="text-zinc-950 dark:text-white">
                      {formatDate(quote.sentAt)}
                    </div>
                  </div>
                </div>
              )}

              {quote.viewedAt && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-400">Viewed</div>
                    <div className="text-zinc-950 dark:text-white">
                      {formatDate(quote.viewedAt)}
                    </div>
                  </div>
                </div>
              )}

              {quote.acceptedAt && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-400">Accepted</div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      {formatDate(quote.acceptedAt)}
                    </div>
                  </div>
                </div>
              )}

              {quote.rejectedAt && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-400">Rejected</div>
                    <div className="text-rose-600 dark:text-rose-400">
                      {formatDate(quote.rejectedAt)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Item Dialog */}
      <QuoteItemDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        quoteId={quote.id}
        currency={quote.currency}
        editingItem={editingItem}
      />
    </div>
  );
}
