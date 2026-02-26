"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, X, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { acceptQuote, rejectQuote } from "@/lib/actions/quote";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxType: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  isOptional: boolean;
  isSelected: boolean;
}

interface QuoteData {
  id: string;
  number: string;
  title: string | null;
  introduction: string | null;
  terms: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  validUntil: Date | null;
  createdAt: Date;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  client: {
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
  organization: {
    name: string;
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

interface QuoteDetailClientProps {
  quote: QuoteData;
  domain: string;
}

const TAX_TYPE_LABELS: Record<string, string> = {
  STANDARD: "21%",
  REDUCED: "9%",
  EXEMPT: "0% Exempt",
  REVERSE_CHARGE: "0% Reverse Charge",
  ZERO: "0%",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}

export function QuoteDetailClient({ quote, domain }: QuoteDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(quote.status);
  const [acceptedAt, setAcceptedAt] = useState(quote.acceptedAt);
  const [rejectedAt, setRejectedAt] = useState(quote.rejectedAt);
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRespond = status === "FINALIZED" || status === "SENT" || status === "VIEWED";

  const handleAccept = async () => {
    setIsSubmitting(true);
    const result = await acceptQuote(domain, quote.id);
    if ("success" in result) {
      setStatus("ACCEPTED");
      setAcceptedAt(new Date());
    }
    setConfirmAction(null);
    setIsSubmitting(false);
    router.refresh();
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    const result = await rejectQuote(domain, quote.id);
    if ("success" in result) {
      setStatus("REJECTED");
      setRejectedAt(new Date());
    }
    setConfirmAction(null);
    setIsSubmitting(false);
    router.refresh();
  };

  // VAT breakdown
  const activeItems = quote.items.filter((item) => !item.isOptional || item.isSelected);
  const vatGroups = activeItems.reduce<Record<string, { label: string; rate: number; amount: number }>>((acc, item) => {
    const type = item.taxType || "STANDARD";
    if (!acc[type]) {
      acc[type] = { label: TAX_TYPE_LABELS[type] || `${item.taxRate}%`, rate: item.taxRate, amount: 0 };
    }
    acc[type].amount += item.taxAmount;
    return acc;
  }, {});
  const vatLines = Object.entries(vatGroups);
  const hasReverseCharge = quote.items.some((item) => item.taxType === "REVERSE_CHARGE");

  const statusBadge: Record<string, { label: string; color: string }> = {
    FINALIZED: { label: "Pending", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    SENT: { label: "Pending", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    VIEWED: { label: "Viewed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    EXPIRED: { label: "Expired", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" },
  };

  const currentStatus = statusBadge[status];

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${currentStatus?.color}`}>
          {currentStatus?.label}
        </span>
        {quote.validUntil && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Valid until {format(new Date(quote.validUntil), "MMM d, yyyy")}
          </span>
        )}
      </div>

      {/* Status Notices */}
      {status === "ACCEPTED" && acceptedAt && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-400">
            Accepted on {format(new Date(acceptedAt), "MMMM d, yyyy")}
          </p>
        </div>
      )}

      {status === "REJECTED" && rejectedAt && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">
            Rejected on {format(new Date(rejectedAt), "MMMM d, yyyy")}
          </p>
        </div>
      )}

      {status === "EXPIRED" && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Clock className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This quote has expired.
          </p>
        </div>
      )}

      {/* Addresses */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* From */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">From</h3>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{quote.organization.name}</p>
          {quote.organization.addressLine1 && (
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>{quote.organization.addressLine1}</p>
              {quote.organization.addressLine2 && <p>{quote.organization.addressLine2}</p>}
              <p>{quote.organization.postalCode} {quote.organization.city}</p>
              {quote.organization.country && <p>{quote.organization.country}</p>}
            </div>
          )}
          {quote.organization.vatNumber && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">VAT: {quote.organization.vatNumber}</p>
          )}
        </div>

        {/* To */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">To</h3>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {quote.client.companyName || quote.client.name}
          </p>
          {quote.client.companyName && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{quote.client.name}</p>
          )}
          {quote.client.addressLine1 && (
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>{quote.client.addressLine1}</p>
              {quote.client.addressLine2 && <p>{quote.client.addressLine2}</p>}
              <p>{quote.client.postalCode} {quote.client.city}</p>
              {quote.client.country && <p>{quote.client.country}</p>}
            </div>
          )}
          {quote.client.vatNumber && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">VAT: {quote.client.vatNumber}</p>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="flex gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Created</p>
          <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
            {format(new Date(quote.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        {quote.validUntil && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Valid Until</p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {format(new Date(quote.validUntil), "MMM d, yyyy")}
            </p>
          </div>
        )}
      </div>

      {/* Introduction */}
      {quote.introduction && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {quote.introduction}
          </p>
        </div>
      )}

      {/* Line Items */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Qty
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Unit Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tax
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {quote.items.map((item) => {
              const isDeselected = item.isOptional && !item.isSelected;
              return (
                <tr key={item.id} className={isDeselected ? "opacity-50" : ""}>
                  <td className="px-6 py-4">
                    <span className={`text-sm text-zinc-900 dark:text-zinc-100 ${isDeselected ? "line-through" : ""}`}>
                      {item.description}
                    </span>
                    {item.isOptional && (
                      <span className="ml-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400 ${isDeselected ? "line-through" : ""}`}>
                    {item.quantity}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400 ${isDeselected ? "line-through" : ""}`}>
                    {formatCurrency(item.unitPrice, quote.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-500 dark:text-zinc-400">
                    {item.taxRate}%
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100 ${isDeselected ? "line-through" : ""}`}>
                    {formatCurrency(item.total, quote.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/50">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(quote.subtotal, quote.currency)}
                </span>
              </div>
              {vatLines.map(([type, group]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">VAT {group.label}</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(group.amount, quote.currency)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(quote.total, quote.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reverse charge notice */}
        {hasReverseCharge && (
          <div className="border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">VAT reverse charged / BTW verlegd</span>
              {quote.organization.vatNumber && <> — Supplier VAT: {quote.organization.vatNumber}</>}
              {quote.client.vatNumber && <> — Client VAT: {quote.client.vatNumber}</>}
            </p>
          </div>
        )}
      </div>

      {/* Terms */}
      {quote.terms && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Terms & Conditions
          </h3>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {quote.terms}
          </p>
        </div>
      )}

      {/* Accept / Reject Buttons */}
      {canRespond && !confirmAction && (
        <div className="flex gap-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <button
            onClick={() => setConfirmAction("accept")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            Accept Quote
          </button>
          <button
            onClick={() => setConfirmAction("reject")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <X className="h-4 w-4" />
            Reject Quote
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="rounded-xl border-2 border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${confirmAction === "accept" ? "text-green-600" : "text-red-600"}`} />
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {confirmAction === "accept" ? "Accept this quote?" : "Reject this quote?"}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {confirmAction === "accept"
                  ? "By accepting, you agree to the terms and conditions of this quote."
                  : "Are you sure you want to reject this quote? This action cannot be undone."}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={confirmAction === "accept" ? handleAccept : handleReject}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                    confirmAction === "accept"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isSubmitting ? "Processing..." : confirmAction === "accept" ? "Yes, Accept" : "Yes, Reject"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
