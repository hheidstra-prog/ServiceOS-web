import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@servible/database";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";

interface BookingsPageProps {
  params: Promise<{ domain: string }>;
}

async function getBookings(domain: string, token: string | undefined) {
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

  const bookings = await db.booking.findMany({
    where: { clientId: session.clientId, portalVisible: true },
    orderBy: { startsAt: "desc" },
    include: {
      bookingType: {
        select: { name: true, color: true },
      },
    },
  });

  return bookings;
}

export const metadata: Metadata = {
  title: "Bookings",
};

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const bookings = await getBookings(domain, token);

  if (!bookings) {
    return null;
  }

  const statusConfig: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    PENDING: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Pending",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    CONFIRMED: {
      icon: <CheckCircle className="h-4 w-4" />,
      label: "Confirmed",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    CANCELLED: {
      icon: <XCircle className="h-4 w-4" />,
      label: "Cancelled",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    COMPLETED: {
      icon: <CheckCircle className="h-4 w-4" />,
      label: "Completed",
      color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    },
    NO_SHOW: {
      icon: <XCircle className="h-4 w-4" />,
      label: "No Show",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const locationIcon: Record<string, React.ReactNode> = {
    ONLINE: <Video className="h-4 w-4" />,
    AT_PROVIDER: <MapPin className="h-4 w-4" />,
    AT_CLIENT: <MapPin className="h-4 w-4" />,
    OTHER: <MapPin className="h-4 w-4" />,
  };

  const locationLabel: Record<string, string> = {
    ONLINE: "Online Meeting",
    AT_PROVIDER: "At Provider",
    AT_CLIENT: "At Your Location",
    OTHER: "Other Location",
  };

  // Separate upcoming and past bookings
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.startsAt) >= now && b.status !== "CANCELLED"
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.startsAt) < now || b.status === "CANCELLED"
  );

  const formatBookingDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bookings</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            View your upcoming and past appointments.
          </p>
        </div>
        <Link
          href="/portal/bookings/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Book Appointment
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <Calendar className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">No bookings yet</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your appointments will appear here.
          </p>
          <Link
            href="/portal/bookings/new"
            className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Book your first appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Upcoming
              </h2>
              <div className="space-y-4">
                {upcomingBookings.map((booking) => {
                  const status = statusConfig[booking.status];
                  const startDate = new Date(booking.startsAt);
                  const endDate = new Date(booking.endsAt);

                  return (
                    <div
                      key={booking.id}
                      className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
                            style={
                              booking.bookingType?.color
                                ? { backgroundColor: `${booking.bookingType.color}20` }
                                : undefined
                            }
                          >
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {format(startDate, "MMM")}
                            </span>
                            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                              {format(startDate, "d")}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {booking.bookingType?.name || "Appointment"}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {formatBookingDate(startDate)}
                            </p>
                            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {format(startDate, "h:mm a")} -{" "}
                                {format(endDate, "h:mm a")}
                              </span>
                              <span className="flex items-center gap-1">
                                {locationIcon[booking.locationType]}
                                {locationLabel[booking.locationType]}
                              </span>
                            </div>
                            {booking.location && (
                              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                {booking.locationType === "ONLINE" ? (
                                  <a
                                    href={booking.location}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    Join meeting
                                  </a>
                                ) : (
                                  booking.location
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      {booking.notes && (
                        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">Notes:</span>{" "}
                            {booking.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Past</h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pastBookings.map((booking) => {
                    const status = statusConfig[booking.status];
                    const startDate = new Date(booking.startsAt);

                    return (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between px-6 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {format(startDate, "MMM")}
                            </span>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                              {format(startDate, "d")}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {booking.bookingType?.name || "Appointment"}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {format(startDate, "h:mm a")}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
