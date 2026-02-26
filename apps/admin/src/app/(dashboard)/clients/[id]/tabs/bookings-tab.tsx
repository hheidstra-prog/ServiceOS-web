"use client";

import Link from "next/link";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatus } from "@servible/database";

interface Booking {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  guestName: string | null;
  notes: string | null;
  bookingType: { name: string } | null;
}

interface BookingsTabProps {
  client: {
    id: string;
    bookings: Booking[];
  };
}

const statusConfig: Record<
  BookingStatus,
  { label: string; badgeColor: string; borderColor: string }
> = {
  PENDING: {
    label: "Pending",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-500/50",
  },
  CONFIRMED: {
    label: "Confirmed",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-500/50",
  },
  COMPLETED: {
    label: "Completed",
    badgeColor: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    borderColor: "",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeColor: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    borderColor: "",
  },
  NO_SHOW: {
    label: "No Show",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderColor: "",
  },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingsTab({ client }: BookingsTabProps) {
  const now = new Date();
  const upcoming = client.bookings.filter(
    (b) =>
      new Date(b.startsAt) >= now &&
      b.status !== "CANCELLED" &&
      b.status !== "NO_SHOW"
  );
  const past = client.bookings.filter(
    (b) =>
      new Date(b.startsAt) < now ||
      b.status === "CANCELLED" ||
      b.status === "NO_SHOW"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Bookings</h3>
          <p className="text-sm text-muted-foreground">
            Appointments and bookings for this client
          </p>
        </div>
        <Button asChild>
          <Link href="/bookings">
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Link>
        </Button>
      </div>

      {client.bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <Calendar className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-muted-foreground">No bookings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-500">
                Upcoming ({upcoming.length})
              </h4>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-500">
                Past ({past.length})
              </h4>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {past.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const config = statusConfig[booking.status];
  return (
    <Card className={config.borderColor}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">
            {booking.bookingType?.name || "Appointment"}
          </CardTitle>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bookings">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${config.badgeColor}`}
          >
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(booking.startsAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
          </span>
        </div>
        {booking.notes && (
          <p className="text-xs text-zinc-400 line-clamp-2">{booking.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
