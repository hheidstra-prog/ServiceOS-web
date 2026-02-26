"use client";

import Link from "next/link";
import {
  Users,
  Receipt,
  FolderKanban,
  Calendar,
  FileText,
  TrendingUp,
  Mail,
  Copy,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import type {
  ClientResult,
  InvoiceResult,
  ProjectResult,
  BookingResult,
  QuoteResult,
  BusinessSummaryResult,
  DraftEmailResult,
} from "./assistant-chat-actions";

// ===========================================
// STATUS BADGE STYLES
// ===========================================

const clientStatusStyles: Record<string, string> = {
  LEAD: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  PROSPECT: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  CLIENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  INACTIVE: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
};

const invoiceStatusStyles: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  SENT: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  PAID: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  OVERDUE: "bg-red-500/10 text-red-700 dark:text-red-400",
  PARTIALLY_PAID: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const projectStatusStyles: Record<string, string> = {
  NOT_STARTED: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  IN_PROGRESS: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ON_HOLD: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const bookingStatusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONFIRMED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const quoteStatusStyles: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  SENT: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ACCEPTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
  EXPIRED: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
};

function StatusBadge({
  status,
  styles,
}: {
  status: string;
  styles: Record<string, string>;
}) {
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${styles[status] || styles.DRAFT || "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"}`}
    >
      {label}
    </span>
  );
}

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===========================================
// CARD COMPONENTS
// ===========================================

export function ClientCard({ client }: { client: ClientResult }) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
        <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-950 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
            {client.companyName || client.name}
          </p>
          <StatusBadge status={client.status} styles={clientStatusStyles} />
        </div>
        {client.companyName && (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{client.name}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-400">
          {client.email && <span>{client.email}</span>}
          <span>{client.projectCount} project{client.projectCount !== 1 ? "s" : ""}</span>
          <span>{client.invoiceCount} invoice{client.invoiceCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600" />
    </Link>
  );
}

export function InvoiceCard({ invoice }: { invoice: InvoiceResult }) {
  const outstanding = invoice.total - invoice.paidAmount;
  return (
    <Link
      href={`/invoices/${invoice.id}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
        <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-950 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
            {invoice.number}
          </p>
          <StatusBadge status={invoice.status} styles={invoiceStatusStyles} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {invoice.clientName}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatCurrency(invoice.total, invoice.currency)}
          </span>
          {invoice.paidAmount > 0 && outstanding > 0 && (
            <span>
              {formatCurrency(outstanding, invoice.currency)} outstanding
            </span>
          )}
          {invoice.dueDate && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDate(invoice.dueDate)}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600" />
    </Link>
  );
}

export function ProjectCard({ project }: { project: ProjectResult }) {
  const progress =
    project.taskCount > 0
      ? Math.round((project.completedTaskCount / project.taskCount) * 100)
      : 0;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
        <FolderKanban className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-950 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
            {project.name}
          </p>
          <StatusBadge status={project.status} styles={projectStatusStyles} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {project.clientName}
        </p>
        {project.taskCount > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-1 rounded-full bg-violet-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400">
              {project.completedTaskCount}/{project.taskCount}
            </span>
          </div>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600" />
    </Link>
  );
}

export function BookingCard({ booking }: { booking: BookingResult }) {
  const dateStr = new Date(booking.startsAt).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    <Link
      href="/bookings"
      className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-950 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
            {booking.bookingTypeName || "Appointment"}
          </p>
          <StatusBadge status={booking.status} styles={bookingStatusStyles} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {booking.clientName || booking.guestName || "Guest"}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-400">
          <span>{dateStr}</span>
          <span>
            {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600" />
    </Link>
  );
}

export function QuoteCard({ quote }: { quote: QuoteResult }) {
  return (
    <Link
      href={`/quotes/${quote.id}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
        <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-950 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
            {quote.number}
          </p>
          <StatusBadge status={quote.status} styles={quoteStatusStyles} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {quote.clientName}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatCurrency(quote.total, quote.currency)}
          </span>
          {quote.validUntil && (
            <span>Valid until {formatDate(quote.validUntil)}</span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600" />
    </Link>
  );
}

export function BusinessSummaryCard({
  summary,
}: {
  summary: BusinessSummaryResult;
}) {
  const stats = [
    { label: "Clients", value: summary.clientCount, icon: Users },
    {
      label: "Active projects",
      value: summary.activeProjectCount,
      icon: FolderKanban,
    },
    {
      label: "Pending quotes",
      value: summary.pendingQuoteCount,
      icon: FileText,
    },
    {
      label: "Unpaid invoices",
      value: `${summary.unpaidInvoiceCount} (${formatCurrency(summary.unpaidInvoiceTotal, summary.currency)})`,
      icon: Receipt,
    },
    {
      label: "Revenue this month",
      value: formatCurrency(summary.monthRevenue, summary.currency),
      icon: TrendingUp,
    },
    {
      label: "Bookings today",
      value: summary.todayBookingCount,
      icon: Calendar,
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
        <TrendingUp className="h-4 w-4 text-violet-500" />
        Business Overview
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Icon className="h-3 w-3" />
              {label}
            </div>
            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DraftEmailCard({ email }: { email: DraftEmailResult }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = email.subject
      ? `Subject: ${email.subject}\n\n${email.body}`
      : email.body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-950 dark:text-white">
            Draft Email
          </span>
          <span className="text-xs text-zinc-400">
            to {email.recipientName}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      {email.subject && (
        <div className="border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
          <span className="text-xs text-zinc-400">Subject: </span>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {email.subject}
          </span>
        </div>
      )}
      <div className="px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {email.body}
        </p>
      </div>
    </div>
  );
}

// ===========================================
// RESULTS PANEL
// ===========================================

interface ResultsPanelProps {
  clientResults?: ClientResult[];
  invoiceResults?: InvoiceResult[];
  projectResults?: ProjectResult[];
  bookingResults?: BookingResult[];
  quoteResults?: QuoteResult[];
  businessSummary?: BusinessSummaryResult;
  draftEmail?: DraftEmailResult;
}

export function ResultsPanel({
  clientResults,
  invoiceResults,
  projectResults,
  bookingResults,
  quoteResults,
  businessSummary,
  draftEmail,
}: ResultsPanelProps) {
  const hasAny =
    (clientResults && clientResults.length > 0) ||
    (invoiceResults && invoiceResults.length > 0) ||
    (projectResults && projectResults.length > 0) ||
    (bookingResults && bookingResults.length > 0) ||
    (quoteResults && quoteResults.length > 0) ||
    businessSummary ||
    draftEmail;

  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {businessSummary && <BusinessSummaryCard summary={businessSummary} />}

      {draftEmail && <DraftEmailCard email={draftEmail} />}

      {clientResults && clientResults.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Users className="h-3 w-3" />
            {clientResults.length} client{clientResults.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {clientResults.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
        </div>
      )}

      {invoiceResults && invoiceResults.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Receipt className="h-3 w-3" />
            {invoiceResults.length} invoice
            {invoiceResults.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {invoiceResults.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} />
            ))}
          </div>
        </div>
      )}

      {projectResults && projectResults.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <FolderKanban className="h-3 w-3" />
            {projectResults.length} project
            {projectResults.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {projectResults.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {quoteResults && quoteResults.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <FileText className="h-3 w-3" />
            {quoteResults.length} quote{quoteResults.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {quoteResults.map((q) => (
              <QuoteCard key={q.id} quote={q} />
            ))}
          </div>
        </div>
      )}

      {bookingResults && bookingResults.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Calendar className="h-3 w-3" />
            {bookingResults.length} booking
            {bookingResults.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {bookingResults.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
