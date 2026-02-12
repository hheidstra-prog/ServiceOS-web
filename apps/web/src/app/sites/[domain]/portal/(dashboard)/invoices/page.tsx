import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@serviceos/database";
import { FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface InvoicesPageProps {
  params: Promise<{ domain: string }>;
}

async function getInvoices(domain: string, token: string | undefined) {
  if (!token) return null;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: { organizationId: true },
  });

  if (!site) return null;

  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: { organizationId: site.organizationId },
    },
    select: { clientId: true },
  });

  if (!session) return null;

  const invoices = await db.invoice.findMany({
    where: {
      clientId: session.clientId,
      status: { not: "DRAFT" }, // Don't show draft invoices to clients
    },
    orderBy: { issueDate: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      total: true,
      paidAmount: true,
      currency: true,
    },
  });

  return invoices;
}

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage({ params }: InvoicesPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const invoices = await getInvoices(domain, token);

  if (!invoices) {
    return null;
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    SENT: { label: "Awaiting Payment", color: "bg-blue-100 text-blue-700" },
    PAID: { label: "Paid", color: "bg-green-100 text-green-700" },
    OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Cancelled", color: "bg-zinc-100 text-zinc-700" },
    PARTIALLY_PAID: {
      label: "Partially Paid",
      color: "bg-amber-100 text-amber-700",
    },
  };

  // Group invoices by status
  const pendingInvoices = invoices.filter((inv) =>
    ["SENT", "OVERDUE", "PARTIALLY_PAID"].includes(inv.status)
  );
  const paidInvoices = invoices.filter((inv) => inv.status === "PAID");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
        <p className="mt-1 text-zinc-600">
          View and download your invoices.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200">
          <FileText className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 font-semibold text-zinc-900">No invoices yet</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Invoices will appear here once they&apos;re sent.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Invoices */}
          {pendingInvoices.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Pending Payment
              </h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Issue Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {pendingInvoices.map((invoice) => {
                      const status = statusConfig[invoice.status];
                      return (
                        <tr key={invoice.id} className="hover:bg-zinc-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-medium text-zinc-900">
                              {invoice.number}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600">
                            {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600">
                            {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="font-medium text-zinc-900">
                              {invoice.currency}{" "}
                              {Number(invoice.total).toFixed(2)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <Link
                              href={`/portal/invoices/${invoice.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
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

          {/* Paid Invoices */}
          {paidInvoices.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Paid Invoices
              </h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Issue Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {paidInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-zinc-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-medium text-zinc-900">
                            {invoice.number}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600">
                          {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-medium text-zinc-900">
                            {invoice.currency}{" "}
                            {Number(invoice.total).toFixed(2)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Link
                            href={`/portal/invoices/${invoice.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                          >
                            View
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
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
