"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BookingStatus, LocationType } from "@servible/database";
import { cancelBooking, confirmBooking, completeBooking, markNoShow, toggleBookingPortalVisibility, getBookings } from "./actions";
import { NewBookingDialog } from "./new-booking-dialog";
import { BookingTypesDialog } from "./booking-types-dialog";
import { AvailabilityDialog } from "./availability-dialog";
import { BookingSettingsDialog } from "./booking-settings-dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface BookingType {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  color: string | null;
  isActive: boolean;
  isPublic: boolean;
  requiresConfirmation: boolean;
  bufferBefore: number;
  bufferAfter: number;
}

interface Booking {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  locationType: LocationType;
  location: string | null;
  notes: string | null;
  guestName: string | null;
  guestEmail: string | null;
  portalVisible: boolean;
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  bookingType: {
    id: string;
    name: string;
    durationMinutes: number;
    color: string | null;
  } | null;
}

interface BookingsListProps {
  initialBookings: Booking[];
  bookingTypes: BookingType[];
}

const statusConfig: Record<BookingStatus, { label: string; className: string; borderColor: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderColor: "border-l-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    borderColor: "border-l-sky-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500",
    borderColor: "border-l-zinc-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderColor: "border-l-emerald-500",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderColor: "border-l-rose-500",
  },
};

const locationTypeLabels: Record<LocationType, string> = {
  ONLINE: "Online",
  AT_PROVIDER: "At Office",
  AT_CLIENT: "At Client",
  OTHER: "Other",
};

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateLong(date: Date) {
  return new Date(date).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const days: (Date | null)[] = [];

  // Add empty slots for days before the first of the month
  for (let i = 0; i < adjustedStartDay; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function BookingsList({ initialBookings, bookingTypes }: BookingsListProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { confirm, ConfirmDialog } = useConfirm();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isTypesDialogOpen, setIsTypesDialogOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDays = getMonthDays(year, month);

  // Refetch bookings when month changes
  useEffect(() => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    startTransition(async () => {
      const data = await getBookings({ startDate: startOfMonth, endDate: endOfMonth });
      setBookings(data);
    });
  }, [year, month]);

  const filteredBookings = bookings.filter((booking) => {
    const searchLower = search.toLowerCase();
    const clientName = booking.client?.name || booking.guestName || "";
    const companyName = booking.client?.companyName || "";
    const typeName = booking.bookingType?.name || "";
    const contactName = booking.contact ? `${booking.contact.firstName} ${booking.contact.lastName || ""}`.trim() : "";

    const matchesSearch =
      clientName.toLowerCase().includes(searchLower) ||
      companyName.toLowerCase().includes(searchLower) ||
      typeName.toLowerCase().includes(searchLower) ||
      contactName.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "ALL" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group bookings by date for list view
  const bookingsByDate = filteredBookings.reduce(
    (acc, booking) => {
      const dateKey = new Date(booking.startsAt).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
      return acc;
    },
    {} as Record<string, Booking[]>
  );

  const sortedDates = Object.keys(bookingsByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const refetchBookings = async () => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    const data = await getBookings({ startDate: startOfMonth, endDate: endOfMonth });
    setBookings(data);
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmBooking(id);
      toast.success("Booking confirmed");
      refetchBookings();
    } catch {
      toast.error("Failed to confirm booking");
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirm({ title: "Cancel booking", description: "Are you sure you want to cancel this booking?", confirmLabel: "Cancel booking", destructive: true });
    if (!ok) return;
    try {
      await cancelBooking(id);
      toast.success("Booking cancelled");
      refetchBookings();
    } catch {
      toast.error("Failed to cancel booking");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeBooking(id);
      toast.success("Booking marked as completed");
      refetchBookings();
    } catch {
      toast.error("Failed to complete booking");
    }
  };

  const handleNoShow = async (id: string) => {
    try {
      await markNoShow(id);
      toast.success("Booking marked as no-show");
      refetchBookings();
    } catch {
      toast.error("Failed to mark no-show");
    }
  };

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCurrentDate(d);
    if (isMobile) setSelectedDate(d);
  };

  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCurrentDate(d);
    if (isMobile) setSelectedDate(d);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Bookings for the selected day (mobile agenda)
  // Hide cancelled/no-show unless explicitly filtered to that status
  const selectedDayBookings = filteredBookings
    .filter((b) => {
      if (statusFilter === "ALL" && ["CANCELLED", "NO_SHOW"].includes(b.status)) return false;
      return isSameDay(new Date(b.startsAt), selectedDate);
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Get bookings for a specific day (for calendar view)
  // Hide cancelled/no-show from calendar unless explicitly filtered to that status
  const getBookingsForDay = (day: Date | null) => {
    if (!day) return [];
    return filteredBookings.filter((booking) => {
      if (statusFilter === "ALL" && ["CANCELLED", "NO_SHOW"].includes(booking.status)) return false;
      const bookingDate = new Date(booking.startsAt);
      return (
        bookingDate.getDate() === day.getDate() &&
        bookingDate.getMonth() === day.getMonth() &&
        bookingDate.getFullYear() === day.getFullYear()
      );
    });
  };

  const isToday = (day: Date | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  return (
    <>{ConfirmDialog}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage appointments and schedule.
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                Booking Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAvailabilityOpen(true)}>
                Availability Hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTypesDialogOpen(true)}>
                Booking Types
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsNewDialogOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New booking
          </Button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-zinc-950/20 focus:bg-sky-50/50 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-sky-950/20"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {status === "ALL" ? "All" : statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-950/10 dark:border-white/10">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "list"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              } rounded-l-md`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "calendar"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              } rounded-r-md`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation (only in calendar view) */}
      {view === "calendar" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            {currentDate.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
          </h2>
        </div>
      )}

      {/* Content */}
      <div className={`transition-opacity duration-150 ${isPending ? "opacity-50" : ""}`}>
      {view === "calendar" ? (
        isMobile ? (
          // Mobile Calendar: Mini month + Day agenda
          <div className="space-y-4">
            {/* Mini month calendar */}
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-7 mb-1">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div
                      key={i}
                      className="py-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5">
                  {monthDays.map((day, index) => {
                    if (!day) {
                      return <div key={index} />;
                    }
                    const hasBookings = getBookingsForDay(day).length > 0;
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={`relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : isTodayDay
                              ? "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {day.getDate()}
                        {hasBookings && (
                          <span
                            className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                              isSelected ? "bg-white" : "bg-sky-500"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day agenda */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {formatDateLong(selectedDate)}
              </h3>
              {selectedDayBookings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <CalendarIcon className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                      No bookings on this day
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {selectedDayBookings.map((booking) => {
                    const config = statusConfig[booking.status];
                    return (
                      <Card
                        key={booking.id}
                        className={`border-l-4 ${config.borderColor} cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50`}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <CardContent className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-center shrink-0">
                              <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                {formatTime(booking.startsAt)}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                {formatTime(booking.endsAt)}
                              </p>
                            </div>
                            <div className="min-w-0 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                              <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                                {booking.contact
                                  ? `${booking.contact.firstName}${booking.contact.lastName ? ` ${booking.contact.lastName}` : ""}`
                                  : booking.guestName || booking.client?.name || "No client"}
                                {booking.contact && booking.client && (
                                  <span className="font-normal text-zinc-500 dark:text-zinc-400"> · {booking.client.companyName || booking.client.name}</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {booking.bookingType && (
                                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                    {booking.bookingType.name}
                                  </span>
                                )}
                                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Desktop Calendar: Full month grid
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-zinc-950/10 dark:border-white/10">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((day, index) => {
                  const dayBookings = getBookingsForDay(day);
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] border-b border-r border-zinc-950/10 p-1 dark:border-white/10 ${
                        index % 7 === 6 ? "border-r-0" : ""
                      } ${!day ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}
                    >
                      {day && (
                        <>
                          <div
                            className={`mb-1 text-xs font-medium ${
                              isToday(day)
                                ? "flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {day.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayBookings.slice(0, 3).map((booking) => (
                              <button
                                key={booking.id}
                                onClick={() => setSelectedBooking(booking)}
                                className={`block w-full truncate rounded px-1 py-0.5 text-xs text-left border-l-2 ${
                                  statusConfig[booking.status].borderColor
                                } bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700`}
                                style={{
                                  borderLeftColor: booking.bookingType?.color || undefined,
                                }}
                              >
                                <span className="font-medium">{formatTime(booking.startsAt)}</span>{" "}
                                {booking.contact
                                  ? `${booking.contact.firstName}${booking.contact.lastName ? ` ${booking.contact.lastName}` : ""}`
                                  : booking.guestName || booking.client?.name}
                              </button>
                            ))}
                            {dayBookings.length > 3 && (
                              <button
                                onClick={() => setDayDetailDate(day)}
                                className="text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
                              >
                                +{dayBookings.length - 3} more
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        // List View
        <>
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
                  <CalendarIcon className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
                  {bookings.length === 0 ? "No bookings yet" : "No bookings found"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {bookings.length === 0
                    ? "Create your first booking to get started."
                    : "Try adjusting your search or filters."}
                </p>
                {bookings.length === 0 && (
                  <Button onClick={() => setIsNewDialogOpen(true)} size="sm" className="mt-4">
                    <Plus className="mr-1.5 h-4 w-4" />
                    New booking
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  <h3 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {formatDateLong(new Date(dateKey))}
                  </h3>
                  <div className="space-y-2">
                    {bookingsByDate[dateKey]
                      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                      .map((booking) => {
                        const config = statusConfig[booking.status];
                        return (
                          <Card key={booking.id} className={`border-l-4 ${config.borderColor} transition-all hover:border-violet-300 hover:shadow-sm dark:hover:border-violet-500/40`}>
                            <CardContent className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <div className="text-center shrink-0">
                                  <p className="text-base font-semibold text-zinc-950 sm:text-lg dark:text-white">
                                    {formatTime(booking.startsAt)}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {formatTime(booking.endsAt)}
                                  </p>
                                </div>
                                <div className="min-w-0 border-l border-zinc-200 pl-2 sm:pl-4 dark:border-zinc-700">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/bookings/${booking.id}`}
                                      className="font-medium text-zinc-950 hover:underline dark:text-white"
                                    >
                                      {booking.contact
                                        ? `${booking.contact.firstName}${booking.contact.lastName ? ` ${booking.contact.lastName}` : ""}`
                                        : booking.guestName || booking.client?.name || "No client assigned"}
                                      {booking.contact && booking.client && (
                                        <span className="font-normal text-zinc-500 dark:text-zinc-400"> · {booking.client.companyName || booking.client.name}</span>
                                      )}
                                    </Link>
                                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
                                      {config.label}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                    {booking.bookingType && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {booking.bookingType.name} ({booking.bookingType.durationMinutes}min)
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {locationTypeLabels[booking.locationType]}
                                    </span>
                                    {booking.client && (
                                      <Link
                                        href={`/clients/${booking.client.id}`}
                                        className="flex items-center gap-1 hover:underline"
                                      >
                                        <User className="h-3 w-3" />
                                        View client
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-xs">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/bookings/${booking.id}`}>View details</Link>
                                  </DropdownMenuItem>
                                  {booking.status === "PENDING" && (
                                    <DropdownMenuItem onClick={() => handleConfirm(booking.id)}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Confirm
                                    </DropdownMenuItem>
                                  )}
                                  {booking.status === "CONFIRMED" && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleComplete(booking.id)}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Mark completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleNoShow(booking.id)}>
                                        No show
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {["PENDING", "CONFIRMED"].includes(booking.status) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleCancel(booking.id)}
                                        variant="destructive"
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancel
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </div>

      {/* Dialogs */}
      <NewBookingDialog
        open={isNewDialogOpen}
        onOpenChange={(open) => {
          setIsNewDialogOpen(open);
          if (!open) refetchBookings();
        }}
        bookingTypes={bookingTypes}
      />
      <BookingTypesDialog
        open={isTypesDialogOpen}
        onOpenChange={setIsTypesDialogOpen}
        bookingTypes={bookingTypes}
      />
      <BookingSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
      <AvailabilityDialog
        open={isAvailabilityOpen}
        onOpenChange={setIsAvailabilityOpen}
      />

      {/* Booking Quick View Sheet */}
      <Sheet open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto" overlayClassName="bg-zinc-950/10 dark:bg-zinc-950/30">
          <SheetHeader className="pb-0">
            <SheetTitle>Booking Details</SheetTitle>
          </SheetHeader>
          {selectedBooking && (() => {
            const b = selectedBooking;
            const config = statusConfig[b.status];
            const contactName = b.contact
              ? `${b.contact.firstName}${b.contact.lastName ? ` ${b.contact.lastName}` : ""}`
              : null;
            const displayName = contactName || b.guestName || b.client?.name || "No client";
            return (
              <div className="space-y-5 px-4 pb-4">
                {/* Status + Client */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
                      {displayName}
                    </h3>
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                  {b.client && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {b.client.companyName || b.client.name}
                    </p>
                  )}
                </div>

                {/* Schedule */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-950 dark:text-white">
                        {formatDateLong(new Date(b.startsAt))}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTime(b.startsAt)} — {formatTime(b.endsAt)}
                      </p>
                    </div>
                  </div>

                  {b.bookingType && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                      <p className="text-sm text-zinc-950 dark:text-white">
                        {b.bookingType.name} ({b.bookingType.durationMinutes} min)
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                    <p className="text-sm text-zinc-950 dark:text-white">
                      {locationTypeLabels[b.locationType]}
                    </p>
                  </div>
                </div>

                {/* Contact info */}
                {(b.client?.email || b.client?.phone || b.guestEmail) && (
                  <div className="space-y-2 border-t border-zinc-950/10 pt-3 dark:border-white/10">
                    {(b.client?.email || b.guestEmail) && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-zinc-400" />
                        <a
                          href={`mailto:${b.client?.email || b.guestEmail}`}
                          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                        >
                          {b.client?.email || b.guestEmail}
                        </a>
                      </div>
                    )}
                    {(b.client?.phone) && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-zinc-400" />
                        <a
                          href={`tel:${b.client.phone}`}
                          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                        >
                          {b.client.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <div className="border-t border-zinc-950/10 pt-3 dark:border-white/10">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-zinc-950 dark:text-white whitespace-pre-wrap">
                      {b.notes}
                    </p>
                  </div>
                )}

                {/* Portal visibility */}
                <div className="flex items-center justify-between border-t border-zinc-950/10 pt-3 dark:border-white/10">
                  <div>
                    <Label htmlFor="sheet-portalVisible" className="text-sm">Client Portal</Label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Show on client portal
                    </p>
                  </div>
                  <Switch
                    id="sheet-portalVisible"
                    checked={b.portalVisible}
                    onCheckedChange={async (checked) => {
                      setSelectedBooking({ ...b, portalVisible: checked });
                      try {
                        await toggleBookingPortalVisibility(b.id, checked);
                        toast.success(checked ? "Visible on portal" : "Hidden from portal");
                        router.refresh();
                      } catch {
                        setSelectedBooking({ ...b, portalVisible: !checked });
                        toast.error("Failed to update visibility");
                      }
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-zinc-950/10 pt-3 dark:border-white/10">
                  {b.status === "PENDING" && (
                    <Button size="sm" onClick={() => { handleConfirm(b.id); setSelectedBooking(null); }}>
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Confirm
                    </Button>
                  )}
                  {b.status === "CONFIRMED" && (
                    <Button size="sm" onClick={() => { handleComplete(b.id); setSelectedBooking(null); }}>
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Complete
                    </Button>
                  )}
                  {["PENDING", "CONFIRMED"].includes(b.status) && (
                    <Button size="sm" variant="destructive" onClick={() => { handleCancel(b.id); setSelectedBooking(null); }}>
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Cancel Booking
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/bookings/${b.id}`}>
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Full Details
                    </Link>
                  </Button>
                  {b.client && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/clients/${b.client.id}`}>
                        <User className="mr-1.5 h-4 w-4" />
                        View Client
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Day Detail Sheet (for "+x more" on calendar) */}
      <Sheet open={!!dayDetailDate} onOpenChange={(open) => !open && setDayDetailDate(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto" overlayClassName="bg-zinc-950/10 dark:bg-zinc-950/30">
          <SheetHeader className="pb-0">
            <SheetTitle>{dayDetailDate ? formatDateLong(dayDetailDate) : ""}</SheetTitle>
          </SheetHeader>
          {dayDetailDate && (() => {
            const dayBookings = getBookingsForDay(dayDetailDate)
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
            return (
              <div className="space-y-2 px-4 pb-4">
                {dayBookings.map((booking) => {
                  const config = statusConfig[booking.status];
                  return (
                    <Card
                      key={booking.id}
                      className={`border-l-4 ${config.borderColor} cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50`}
                      onClick={() => {
                        setDayDetailDate(null);
                        setSelectedBooking(booking);
                      }}
                    >
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-center shrink-0">
                            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                              {formatTime(booking.startsAt)}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                              {formatTime(booking.endsAt)}
                            </p>
                          </div>
                          <div className="min-w-0 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                            <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                              {booking.contact
                                ? `${booking.contact.firstName}${booking.contact.lastName ? ` ${booking.contact.lastName}` : ""}`
                                : booking.guestName || booking.client?.name || "No client"}
                              {booking.contact && booking.client && (
                                <span className="font-normal text-zinc-500 dark:text-zinc-400"> · {booking.client.companyName || booking.client.name}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {booking.bookingType && (
                                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  {booking.bookingType.name}
                                </span>
                              )}
                              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
                                {config.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
    </>
  );
}
