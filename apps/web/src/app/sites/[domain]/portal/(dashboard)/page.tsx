import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@servible/database";
import {
  FolderKanban,
  FileText,
  ScrollText,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface PortalDashboardPageProps {
  params: Promise<{ domain: string }>;
}

async function getClientData(domain: string, token: string | undefined) {
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

  const clientId = session.clientId;

  // Fetch dashboard data
  const [
    activeProjects,
    pendingInvoices,
    pendingQuotes,
    upcomingBookings,
    recentProjects,
    recentInvoices,
    recentQuotes,
  ] = await Promise.all([
    db.project.count({
      where: {
        clientId,
        portalVisible: true,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      },
    }),
    db.invoice.count({
      where: {
        clientId,
        portalVisible: true,
        status: { in: ["SENT", "OVERDUE"] },
      },
    }),
    db.quote.count({
      where: {
        clientId,
        portalVisible: true,
        status: { in: ["FINALIZED", "SENT", "VIEWED"] },
      },
    }),
    db.booking.count({
      where: {
        clientId,
        portalVisible: true,
        startsAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    db.project.findMany({
      where: { clientId, portalVisible: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    }),
    db.invoice.findMany({
      where: { clientId, portalVisible: true },
      orderBy: { issueDate: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        currency: true,
        dueDate: true,
      },
    }),
    db.quote.findMany({
      where: {
        clientId,
        portalVisible: true,
        status: { not: "DRAFT" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        total: true,
        currency: true,
        validUntil: true,
      },
    }),
  ]);

  return {
    stats: {
      activeProjects,
      pendingInvoices,
      pendingQuotes,
      upcomingBookings,
    },
    recentProjects,
    recentInvoices,
    recentQuotes,
  };
}

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function PortalDashboardPage({
  params,
}: PortalDashboardPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const data = await getClientData(domain, token);

  if (!data) {
    return null;
  }

  const { stats, recentProjects, recentInvoices, recentQuotes } = data;

  const statCards = [
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: FolderKanban,
      href: "/portal/projects",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      label: "Pending Invoices",
      value: stats.pendingInvoices,
      icon: FileText,
      href: "/portal/invoices",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      label: "Pending Quotes",
      value: stats.pendingQuotes,
      icon: ScrollText,
      href: "/portal/quotes",
      color: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    },
    {
      label: "Upcoming Bookings",
      value: stats.upcomingBookings,
      icon: Calendar,
      href: "/portal/bookings",
      color: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    },
  ];

  const projectStatusIcon: Record<string, React.ReactNode> = {
    NOT_STARTED: <Clock className="h-4 w-4 text-zinc-400" />,
    IN_PROGRESS: <AlertCircle className="h-4 w-4 text-blue-500" />,
    ON_HOLD: <AlertCircle className="h-4 w-4 text-amber-500" />,
    COMPLETED: <CheckCircle className="h-4 w-4 text-green-500" />,
    CANCELLED: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  const invoiceStatusColors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  };

  const quoteStatusColors: Record<string, string> = {
    FINALIZED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    VIEWED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Welcome back! Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stat.value}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Projects</h2>
            <Link
              href="/portal/projects"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentProjects.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No projects yet
              </p>
            ) : (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/portal/projects/${project.id}`}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  {projectStatusIcon[project.status]}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {project.name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Updated{" "}
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Invoices</h2>
            <Link
              href="/portal/invoices"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentInvoices.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No invoices yet
              </p>
            ) : (
              recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/portal/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{invoice.number}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {invoice.currency} {Number(invoice.total).toFixed(2)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        invoiceStatusColors[invoice.status]
                      }`}
                    >
                      {invoice.status.toLowerCase()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Quotes */}
      {recentQuotes.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Quotes</h2>
            <Link
              href="/portal/quotes"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentQuotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/portal/quotes/${quote.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {quote.number}
                    {quote.title && (
                      <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
                        {quote.title}
                      </span>
                    )}
                  </p>
                  {quote.validUntil && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Valid until {new Date(quote.validUntil).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {quote.currency} {Number(quote.total).toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      quoteStatusColors[quote.status]
                    }`}
                  >
                    {quote.status.toLowerCase()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
