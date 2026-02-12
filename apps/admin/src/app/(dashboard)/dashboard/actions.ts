"use server";

import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";

// Get dashboard stats
export async function getDashboardStats() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get week start (Monday)
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  const [
    totalClients,
    activeProjects,
    pendingQuotes,
    unpaidInvoices,
    overdueInvoices,
    upcomingBookings,
    thisMonthRevenue,
    lastMonthRevenue,
    thisWeekTime,
    recentActivity,
  ] = await Promise.all([
    // Total active clients
    db.client.count({
      where: { organizationId: organization.id, archivedAt: null },
    }),

    // Active projects
    db.project.count({
      where: {
        organizationId: organization.id,
        status: { in: ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD"] },
      },
    }),

    // Pending quotes
    db.quote.count({
      where: {
        organizationId: organization.id,
        status: { in: ["DRAFT", "SENT"] },
      },
    }),

    // Unpaid invoices (total amount)
    db.invoice.aggregate({
      where: {
        organizationId: organization.id,
        status: { in: ["DRAFT", "SENT", "OVERDUE"] },
      },
      _sum: { total: true },
      _count: true,
    }),

    // Overdue invoices
    db.invoice.count({
      where: {
        organizationId: organization.id,
        status: "OVERDUE",
      },
    }),

    // Upcoming bookings (next 7 days)
    db.booking.count({
      where: {
        organizationId: organization.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // This month's paid revenue
    db.invoice.aggregate({
      where: {
        organizationId: organization.id,
        status: "PAID",
        paidAt: { gte: startOfMonth },
      },
      _sum: { total: true },
    }),

    // Last month's paid revenue
    db.invoice.aggregate({
      where: {
        organizationId: organization.id,
        status: "PAID",
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { total: true },
    }),

    // This week's time tracked
    db.timeEntry.aggregate({
      where: {
        organizationId: organization.id,
        date: { gte: weekStart },
      },
      _sum: { duration: true },
    }),

    // Recent activity (latest invoices, quotes, bookings)
    getRecentActivity(organization.id),
  ]);

  return {
    totalClients,
    activeProjects,
    pendingQuotes,
    unpaidInvoices: {
      count: unpaidInvoices._count,
      total: Number(unpaidInvoices._sum.total || 0),
    },
    overdueInvoices,
    upcomingBookings,
    thisMonthRevenue: Number(thisMonthRevenue._sum.total || 0),
    lastMonthRevenue: Number(lastMonthRevenue._sum.total || 0),
    thisWeekHours: (thisWeekTime._sum.duration || 0) / 60,
    recentActivity,
  };
}

// Get recent activity for the feed
async function getRecentActivity(organizationId: string) {
  const [recentInvoices, recentQuotes, recentBookings] = await Promise.all([
    db.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        createdAt: true,
        client: { select: { name: true, companyName: true } },
      },
    }),
    db.quote.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        createdAt: true,
        client: { select: { name: true, companyName: true } },
      },
    }),
    db.booking.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        status: true,
        startsAt: true,
        createdAt: true,
        client: { select: { name: true, companyName: true } },
        bookingType: { select: { name: true } },
      },
    }),
  ]);

  // Combine and sort by date
  const activities = [
    ...recentInvoices.map((inv) => ({
      type: "invoice" as const,
      id: inv.id,
      title: `Invoice ${inv.number}`,
      subtitle: inv.client.companyName || inv.client.name,
      status: inv.status,
      amount: Number(inv.total),
      date: inv.createdAt,
    })),
    ...recentQuotes.map((quote) => ({
      type: "quote" as const,
      id: quote.id,
      title: `Quote ${quote.number}`,
      subtitle: quote.client.companyName || quote.client.name,
      status: quote.status,
      amount: Number(quote.total),
      date: quote.createdAt,
    })),
    ...recentBookings.map((booking) => ({
      type: "booking" as const,
      id: booking.id,
      title: booking.bookingType?.name || "Booking",
      subtitle: booking.client
        ? booking.client.companyName || booking.client.name
        : "No client",
      status: booking.status,
      amount: null,
      date: booking.createdAt,
    })),
  ];

  return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
}

// Get upcoming bookings
export async function getUpcomingBookings() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const now = new Date();

  return db.booking.findMany({
    where: {
      organizationId: organization.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      client: { select: { name: true, companyName: true } },
      bookingType: { select: { name: true, color: true } },
    },
  });
}

// Get overdue invoices
export async function getOverdueInvoices() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.invoice.findMany({
    where: {
      organizationId: organization.id,
      status: "OVERDUE",
    },
    orderBy: { dueDate: "asc" },
    take: 5,
    select: {
      id: true,
      number: true,
      total: true,
      dueDate: true,
      client: { select: { name: true, companyName: true } },
    },
  });
}
