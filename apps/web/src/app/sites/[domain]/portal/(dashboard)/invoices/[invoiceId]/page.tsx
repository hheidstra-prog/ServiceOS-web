import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@servible/database";
import { ArrowLeft, Download, Building2, User } from "lucide-react";
import { format } from "date-fns";

interface InvoiceDetailPageProps {
  params: Promise<{ domain: string; invoiceId: string }>;
}

async function getInvoice(
  domain: string,
  invoiceId: string,
  token: string | undefined
) {
  if (!token) return null;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          name: true,
          email: true,
          phone: true,
          website: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          country: true,
          logo: true,
          vatNumber: true,
          registrationNumber: true,
        },
      },
    },
  });

  if (!site) return null;

  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: { organizationId: site.organizationId },
    },
    select: {
      clientId: true,
      client: {
        select: {
          name: true,
          email: true,
          companyName: true,
          vatNumber: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          country: true,
        },
      },
    },
  });

  if (!session) return null;

  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      clientId: session.clientId,
      portalVisible: true,
      status: { not: "DRAFT" },
    },
    include: {
      contact: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!invoice) return null;

  return {
    invoice,
    client: session.client,
    organization: site.organization,
  };
}

export async function generateMetadata({
  params,
}: InvoiceDetailPageProps): Promise<Metadata> {
  const { domain, invoiceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const data = await getInvoice(domain, invoiceId, token);

  if (!data) {
    return { title: "Invoice Not Found" };
  }

  return { title: `Invoice ${data.invoice.number}` };
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { domain, invoiceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const data = await getInvoice(domain, invoiceId, token);

  if (!data) {
    notFound();
  }

  const { invoice, client, organization } = data;

  const statusConfig: Record<string, { label: string; color: string }> = {
    FINALIZED: { label: "Awaiting Payment", color: "bg-blue-100 text-blue-700" },
    SENT: { label: "Awaiting Payment", color: "bg-blue-100 text-blue-700" },
    PAID: { label: "Paid", color: "bg-green-100 text-green-700" },
    OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Cancelled", color: "bg-zinc-100 text-zinc-700" },
    PARTIALLY_PAID: {
      label: "Partially Paid",
      color: "bg-amber-100 text-amber-700",
    },
  };

  const status = statusConfig[invoice.status];
  const amountDue = Number(invoice.total) - Number(invoice.paidAmount);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/portal/invoices"
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Link>

      {/* Invoice Card */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        {/* Header */}
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              {organization.logo ? (
                <img
                  src={organization.logo}
                  alt={organization.name}
                  className="h-10 w-auto"
                />
              ) : (
                <h2 className="text-xl font-bold text-zinc-900">
                  {organization.name}
                </h2>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-zinc-900">INVOICE</h1>
              <p className="mt-1 text-lg text-zinc-600">{invoice.number}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${status.color}`}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Addresses & Dates */}
        <div className="grid gap-8 border-b border-zinc-200 px-8 py-6 md:grid-cols-3">
          {/* From */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <Building2 className="h-4 w-4" />
              From
            </div>
            <div className="mt-2 text-sm text-zinc-900">
              <p className="font-medium">{organization.name}</p>
              {organization.addressLine1 && <p>{organization.addressLine1}</p>}
              {organization.addressLine2 && <p>{organization.addressLine2}</p>}
              {(organization.postalCode || organization.city) && (
                <p>
                  {organization.postalCode} {organization.city}
                </p>
              )}
              {organization.country && <p>{organization.country}</p>}
              {organization.vatNumber && (
                <p className="mt-2 text-zinc-500">
                  VAT: {organization.vatNumber}
                </p>
              )}
            </div>
          </div>

          {/* To */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <User className="h-4 w-4" />
              To
            </div>
            <div className="mt-2 text-sm text-zinc-900">
              <p className="font-medium">
                {client.companyName || client.name}
              </p>
              {invoice.contact && (
                <p>{invoice.contact.firstName} {invoice.contact.lastName}</p>
              )}
              {!invoice.contact && client.companyName && <p>{client.name}</p>}
              {client.addressLine1 && <p>{client.addressLine1}</p>}
              {client.addressLine2 && <p>{client.addressLine2}</p>}
              {(client.postalCode || client.city) && (
                <p>
                  {client.postalCode} {client.city}
                </p>
              )}
              {client.country && <p>{client.country}</p>}
              {client.vatNumber && (
                <p className="mt-2 text-zinc-500">VAT: {client.vatNumber}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-zinc-500">Issue Date:</span>
              <span className="ml-2 font-medium text-zinc-900">
                {format(new Date(invoice.issueDate), "MMMM d, yyyy")}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Due Date:</span>
              <span className="ml-2 font-medium text-zinc-900">
                {format(new Date(invoice.dueDate), "MMMM d, yyyy")}
              </span>
            </div>
            {invoice.paidAt && (
              <div>
                <span className="text-zinc-500">Paid Date:</span>
                <span className="ml-2 font-medium text-zinc-900">
                  {format(new Date(invoice.paidAt), "MMMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="px-8 py-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-sm font-medium text-zinc-500">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Qty</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-right">Tax</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="py-4 text-zinc-900">{item.description}</td>
                  <td className="py-4 text-right text-zinc-600">
                    {Number(item.quantity)}
                  </td>
                  <td className="py-4 text-right text-zinc-600">
                    {invoice.currency} {Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-4 text-right text-zinc-600">
                    {Number(item.taxRate)}%
                  </td>
                  <td className="py-4 text-right font-medium text-zinc-900">
                    {invoice.currency} {Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        {(() => {
          const TAX_LABELS: Record<string, string> = {
            STANDARD: "21% Standard",
            REDUCED: "9% Low",
            EXEMPT: "0% Exempt",
            REVERSE_CHARGE: "0% Reverse Charge",
            ZERO: "0%",
          };
          const vatGroups = invoice.items.reduce<Record<string, { label: string; amount: number }>>((acc, item) => {
            const type = item.taxType || "STANDARD";
            if (!acc[type]) {
              acc[type] = { label: TAX_LABELS[type] || `${Number(item.taxRate)}%`, amount: 0 };
            }
            acc[type].amount += Number(item.taxAmount);
            return acc;
          }, {});
          const vatLines = Object.entries(vatGroups);
          const hasReverseCharge = invoice.items.some((item) => item.taxType === "REVERSE_CHARGE");

          return (
            <div className="border-t border-zinc-200 bg-zinc-50 px-8 py-6">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="text-zinc-900">
                    {invoice.currency} {Number(invoice.subtotal).toFixed(2)}
                  </span>
                </div>
                {vatLines.map(([type, group]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-zinc-600">VAT {group.label}</span>
                    <span className="text-zinc-900">
                      {invoice.currency} {group.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-lg font-bold">
                  <span className="text-zinc-900">Total</span>
                  <span className="text-zinc-900">
                    {invoice.currency} {Number(invoice.total).toFixed(2)}
                  </span>
                </div>
                {Number(invoice.paidAmount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid</span>
                      <span>
                        -{invoice.currency} {Number(invoice.paidAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-zinc-900">Amount Due</span>
                      <span className="text-zinc-900">
                        {invoice.currency} {amountDue.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {hasReverseCharge && (
                <div className="mt-4 rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-500">
                  <p className="font-medium">VAT reverse charged / BTW verlegd</p>
                  {organization.vatNumber && <p>Supplier VAT: {organization.vatNumber}</p>}
                  {client.vatNumber && <p>Client VAT: {client.vatNumber}</p>}
                </div>
              )}
            </div>
          );
        })()}

        {/* Notes & Actions */}
        <div className="border-t border-zinc-200 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-900">Notes</h3>
                  <p className="mt-1 text-sm text-zinc-600">{invoice.notes}</p>
                </div>
              )}
              {invoice.paymentTerms && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-zinc-900">
                    Payment Terms
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {invoice.paymentTerms}
                  </p>
                </div>
              )}
            </div>
            <a
              href={`/api/portal/invoices/${invoice.id}/pdf`}
              download
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
