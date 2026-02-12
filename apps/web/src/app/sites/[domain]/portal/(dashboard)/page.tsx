import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@serviceos/database";
import {
  FolderKanban,
  FileText,
  Files,
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
    totalFiles,
    upcomingBookings,
    recentProjects,
    recentInvoices,
  ] = await Promise.all([
    db.project.count({
      where: {
        clientId,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      },
    }),
    db.invoice.count({
      where: {
        clientId,
        status: { in: ["SENT", "OVERDUE"] },
      },
    }),
    db.file.count({
      where: { clientId },
    }),
    db.booking.count({
      where: {
        clientId,
        startsAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    db.project.findMany({
      where: { clientId },
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
      where: { clientId },
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
  ]);

  return {
    stats: {
      activeProjects,
      pendingInvoices,
      totalFiles,
      upcomingBookings,
    },
    recentProjects,
    recentInvoices,
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

  const { stats, recentProjects, recentInvoices } = data;

  const statCards = [
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: FolderKanban,
      href: "/portal/projects",
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pending Invoices",
      value: stats.pendingInvoices,
      icon: FileText,
      href: "/portal/invoices",
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Files",
      value: stats.totalFiles,
      icon: Files,
      href: "/portal/files",
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Upcoming Bookings",
      value: stats.upcomingBookings,
      icon: Calendar,
      href: "/portal/bookings",
      color: "bg-green-50 text-green-600",
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
    DRAFT: "bg-zinc-100 text-zinc-700",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-zinc-100 text-zinc-700",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-zinc-600">
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
              className="group rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-2xl font-bold text-zinc-900">
                {stat.value}
              </p>
              <p className="text-sm text-zinc-600">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <h2 className="font-semibold text-zinc-900">Recent Projects</h2>
            <Link
              href="/portal/projects"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentProjects.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">
                No projects yet
              </p>
            ) : (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/portal/projects/${project.id}`}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-zinc-50"
                >
                  {projectStatusIcon[project.status]}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {project.name}
                    </p>
                    <p className="text-sm text-zinc-500">
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
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <h2 className="font-semibold text-zinc-900">Recent Invoices</h2>
            <Link
              href="/portal/invoices"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentInvoices.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">
                No invoices yet
              </p>
            ) : (
              recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/portal/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{invoice.number}</p>
                    <p className="text-sm text-zinc-500">
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900">
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
    </div>
  );
}
