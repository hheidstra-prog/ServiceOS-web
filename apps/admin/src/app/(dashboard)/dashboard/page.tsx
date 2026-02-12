import Link from "next/link";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { getDashboardStats, getUpcomingBookings, getOverdueInvoices } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderKanban,
  FileText,
  Receipt,
  Calendar,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const { user, organization } = await getCurrentUserAndOrg();
  const [stats, upcomingBookings, overdueInvoices] = await Promise.all([
    getDashboardStats(),
    getUpcomingBookings(),
    getOverdueInvoices(),
  ]);

  const revenueChange = stats && stats.lastMonthRevenue > 0
    ? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Here&apos;s what&apos;s happening with {organization?.name}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={Users}
          href="/clients"
          color="sky"
        />
        <StatCard
          title="Active Projects"
          value={stats?.activeProjects ?? 0}
          icon={FolderKanban}
          href="/projects"
          color="violet"
        />
        <StatCard
          title="Pending Quotes"
          value={stats?.pendingQuotes ?? 0}
          icon={FileText}
          href="/quotes"
          color="amber"
        />
        <StatCard
          title="This Week"
          value={`${(stats?.thisWeekHours ?? 0).toFixed(1)}h`}
          icon={Clock}
          href="/time"
          color="emerald"
          subtitle="time tracked"
        />
      </div>

      {/* Revenue & Invoices Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <span>Revenue This Month</span>
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-950 dark:text-white">
              €{(stats?.thisMonthRevenue ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </div>
            {stats?.lastMonthRevenue !== undefined && stats.lastMonthRevenue > 0 && (
              <div className="mt-1 flex items-center gap-1 text-sm">
                {revenueChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
                <span className={revenueChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {Math.abs(revenueChange).toFixed(1)}%
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Invoices Card */}
        <Link href="/invoices?status=unpaid" className="lg:col-span-1">
          <Card className="h-full transition-colors hover:border-zinc-950/20 dark:hover:border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <span>Outstanding</span>
                <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-950 dark:text-white">
                €{(stats?.unpaidInvoices.total ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {stats?.unpaidInvoices.count ?? 0} unpaid invoice{stats?.unpaidInvoices.count !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Overdue Alert Card */}
        {(stats?.overdueInvoices ?? 0) > 0 && (
          <Link href="/invoices?status=overdue" className="lg:col-span-1">
            <Card className="h-full border-red-200 bg-red-50 transition-colors hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-red-600 dark:text-red-400">
                  <span>Overdue</span>
                  <AlertCircle className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats?.overdueInvoices} invoice{stats?.overdueInvoices !== 1 ? "s" : ""}
                </div>
                <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Activity & Upcoming */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </div>
              <Link
                href="/bookings"
                className="text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No upcoming bookings
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="flex items-center gap-3 rounded-lg border border-zinc-950/10 p-3 transition-colors hover:border-zinc-950/20 hover:bg-zinc-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-zinc-800/50"
                  >
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: booking.bookingType?.color || "#0ea5e9" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-950 truncate dark:text-white">
                        {booking.bookingType?.name || "Booking"}
                      </p>
                      <p className="text-sm text-zinc-500 truncate dark:text-zinc-400">
                        {booking.client?.companyName || booking.client?.name || "No client"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-zinc-950 dark:text-white">
                        {new Date(booking.startsAt).toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {new Date(booking.startsAt).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your business</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    href={`/${activity.type}s/${activity.id}`}
                    className="flex items-center gap-3 rounded-lg border border-zinc-950/10 p-3 transition-colors hover:border-zinc-950/20 hover:bg-zinc-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      {activity.type === "invoice" && (
                        <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {activity.type === "quote" && (
                        <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                      {activity.type === "booking" && (
                        <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-950 truncate dark:text-white">
                          {activity.title}
                        </p>
                        <StatusBadge status={activity.status} />
                      </div>
                      <p className="text-sm text-zinc-500 truncate dark:text-zinc-400">
                        {activity.subtitle}
                      </p>
                    </div>
                    {activity.amount !== null && (
                      <p className="text-sm font-medium text-zinc-950 dark:text-white">
                        €{activity.amount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-600 dark:text-red-400">
                Overdue Invoices
              </CardTitle>
            </div>
            <CardDescription>These invoices need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 transition-colors hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:border-red-800"
                >
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-white">
                      {invoice.number}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {invoice.client.companyName || invoice.client.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600 dark:text-red-400">
                      €{Number(invoice.total).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                      Due {new Date(invoice.dueDate).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to help you get things done</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/clients" title="Add a client" description="Create a new client" />
          <QuickAction href="/time" title="Log time" description="Track your work" />
          <QuickAction href="/quotes" title="Create a quote" description="Send a proposal" />
          <QuickAction href="/invoices" title="Create invoice" description="Bill your clients" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  color: "sky" | "violet" | "amber" | "emerald";
  subtitle?: string;
}) {
  const colorClasses = {
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-zinc-950/20 dark:hover:border-white/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-zinc-950 dark:text-white">{value}</div>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    DRAFT: "secondary",
    SENT: "default",
    ACCEPTED: "default",
    PAID: "default",
    PENDING: "secondary",
    CONFIRMED: "default",
    COMPLETED: "default",
    OVERDUE: "outline",
    CANCELLED: "outline",
  };

  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    SENT: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    CONFIRMED: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    CANCELLED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <Badge
      variant={variants[status] || "secondary"}
      className={`text-xs ${colors[status] || ""}`}
    >
      {status.toLowerCase()}
    </Badge>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-zinc-950/10 p-3 transition-colors hover:border-zinc-950/20 hover:bg-zinc-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-zinc-800/50"
    >
      <div>
        <p className="font-medium text-zinc-950 dark:text-white">{title}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
    </Link>
  );
}
