import { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { getPortalQuotes } from "@/lib/actions/quote";

interface QuotesPageProps {
  params: Promise<{ domain: string }>;
}

export const metadata: Metadata = {
  title: "Quotes",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  FINALIZED: { label: "Pending", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  SENT: { label: "Pending", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  VIEWED: { label: "Viewed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  EXPIRED: { label: "Expired", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" },
};

export default async function QuotesPage({ params }: QuotesPageProps) {
  const { domain } = await params;
  const quotes = await getPortalQuotes(domain);

  if (!quotes) {
    return null;
  }

  const pendingQuotes = quotes.filter((q) => ["FINALIZED", "SENT", "VIEWED"].includes(q.status));
  const respondedQuotes = quotes.filter((q) => ["ACCEPTED", "REJECTED", "EXPIRED"].includes(q.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Quotes</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          View and respond to your quotes.
        </p>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <FileText className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">No quotes yet</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Quotes will appear here once they&apos;re sent.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Quotes */}
          {pendingQuotes.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Pending Response
              </h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Quote
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {pendingQuotes.map((quote) => {
                      const status = statusConfig[quote.status];
                      return (
                        <tr key={quote.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {quote.number}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {quote.title || "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {format(new Date(quote.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {quote.validUntil ? format(new Date(quote.validUntil), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {quote.currency} {Number(quote.total).toFixed(2)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <Link
                              href={`/portal/quotes/${quote.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                              View
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Responded Quotes */}
          {respondedQuotes.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Responded
              </h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Quote
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {respondedQuotes.map((quote) => {
                      const status = statusConfig[quote.status];
                      return (
                        <tr key={quote.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {quote.number}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {quote.title || "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {format(new Date(quote.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {quote.currency} {Number(quote.total).toFixed(2)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <Link
                              href={`/portal/quotes/${quote.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                              View
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
