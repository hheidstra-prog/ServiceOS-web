"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingStatus, LocationType } from "@serviceos/database";
import {
  cancelBooking,
  confirmBooking,
  completeBooking,
  markNoShow,
  deleteBooking,
  updateBooking,
} from "../actions";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface BookingType {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  color: string | null;
}

interface Booking {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  locationType: LocationType;
  location: string | null;
  notes: string | null;
  internalNotes: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
  } | null;
  bookingType: BookingType | null;
}

interface BookingDetailProps {
  booking: Booking;
}

const statusConfig: Record<BookingStatus, { label: string; className: string; borderColor: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-500/50",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    borderColor: "border-sky-300 dark:border-sky-500/50",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500",
    borderColor: "",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-500/50",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-300 dark:border-rose-500/50",
  },
};

const locationTypeLabels: Record<LocationType, string> = {
  ONLINE: "Online Meeting",
  AT_PROVIDER: "At Office",
  AT_CLIENT: "At Client Location",
  OTHER: "Other Location",
};

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingDetail({ booking }: BookingDetailProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit form state
  const [editDate, setEditDate] = useState(
    new Date(booking.startsAt).toISOString().split("T")[0]
  );
  const [editTime, setEditTime] = useState(formatTime(booking.startsAt));
  const [editEndTime, setEditEndTime] = useState(formatTime(booking.endsAt));
  const [editLocationType, setEditLocationType] = useState<LocationType>(booking.locationType);
  const [editLocation, setEditLocation] = useState(booking.location || "");
  const [editNotes, setEditNotes] = useState(booking.notes || "");
  const [editInternalNotes, setEditInternalNotes] = useState(booking.internalNotes || "");

  const config = statusConfig[booking.status];
  const isPast = new Date(booking.endsAt) < new Date();
  const canModify = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status);

  const handleConfirm = async () => {
    try {
      await confirmBooking(booking.id);
      toast.success("Booking confirmed");
      router.refresh();
    } catch {
      toast.error("Failed to confirm booking");
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({ title: "Cancel booking", description: "Are you sure you want to cancel this booking?", confirmLabel: "Cancel booking", destructive: true });
    if (!ok) return;
    try {
      await cancelBooking(booking.id);
      toast.success("Booking cancelled");
      router.refresh();
    } catch {
      toast.error("Failed to cancel booking");
    }
  };

  const handleComplete = async () => {
    try {
      await completeBooking(booking.id);
      toast.success("Booking marked as completed");
      router.refresh();
    } catch {
      toast.error("Failed to complete booking");
    }
  };

  const handleNoShow = async () => {
    try {
      await markNoShow(booking.id);
      toast.success("Booking marked as no-show");
      router.refresh();
    } catch {
      toast.error("Failed to mark no-show");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: "Delete booking", description: "Are you sure you want to permanently delete this booking? This action cannot be undone.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await deleteBooking(booking.id);
      toast.success("Booking deleted");
      router.push("/bookings");
    } catch {
      toast.error("Failed to delete booking");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const startsAt = new Date(`${editDate}T${editTime}`);
      const endsAt = new Date(`${editDate}T${editEndTime}`);

      await updateBooking(booking.id, {
        startsAt,
        endsAt,
        locationType: editLocationType,
        location: editLocation || undefined,
        notes: editNotes || undefined,
        internalNotes: editInternalNotes || undefined,
      });
      toast.success("Booking updated");
      setIsEditDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>{ConfirmDialog}
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="space-y-6 lg:col-span-2">
        {/* Status & Actions */}
        <Card className={config.borderColor}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ${config.className}`}>
                {config.label}
              </span>
              {booking.cancelledAt && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Cancelled on {new Date(booking.cancelledAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {booking.status === "PENDING" && (
                <Button onClick={handleConfirm} size="sm">
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Confirm
                </Button>
              )}
              {booking.status === "CONFIRMED" && isPast && (
                <>
                  <Button onClick={handleComplete} size="sm">
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Complete
                  </Button>
                  <Button onClick={handleNoShow} size="sm" variant="outline">
                    No Show
                  </Button>
                </>
              )}
              {canModify && (
                <>
                  <Button onClick={() => setIsEditDialogOpen(true)} size="sm" variant="outline">
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                  <Button onClick={handleCancel} size="sm" variant="outline">
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
              <Button onClick={handleDelete} size="sm" variant="ghost">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Booking Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-zinc-400" />
              <div>
                <p className="font-medium text-zinc-950 dark:text-white">
                  {formatDateTime(booking.startsAt)}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                </p>
              </div>
            </div>

            {booking.bookingType && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-950 dark:text-white">
                    {booking.bookingType.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {booking.bookingType.durationMinutes} minutes
                    {booking.bookingType.price
                      ? ` · €${booking.bookingType.price}`
                      : ""}
                  </p>
                  {booking.bookingType.description && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {booking.bookingType.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-zinc-400" />
              <div>
                <p className="font-medium text-zinc-950 dark:text-white">
                  {locationTypeLabels[booking.locationType]}
                </p>
                {booking.location && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {booking.locationType === "ONLINE" ? (
                      <a
                        href={booking.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:underline dark:text-sky-400"
                      >
                        {booking.location}
                      </a>
                    ) : (
                      booking.location
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {(booking.notes || booking.internalNotes) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.notes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Client Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-950 dark:text-white">
                    {booking.notes}
                  </p>
                </div>
              )}
              {booking.internalNotes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Internal Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-950 dark:text-white">
                    {booking.internalNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Client/Guest Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {booking.client ? "Client" : "Guest"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.client ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-400" />
                  <Link
                    href={`/clients/${booking.client.id}`}
                    className="font-medium text-zinc-950 hover:underline dark:text-white"
                  >
                    {booking.client.companyName || booking.client.name}
                  </Link>
                </div>
                {booking.client.companyName && (
                  <p className="ml-6 text-sm text-zinc-500 dark:text-zinc-400">
                    {booking.client.name}
                  </p>
                )}
                {booking.client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <a
                      href={`mailto:${booking.client.email}`}
                      className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      {booking.client.email}
                    </a>
                  </div>
                )}
                {booking.client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <a
                      href={`tel:${booking.client.phone}`}
                      className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      {booking.client.phone}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <>
                {booking.guestName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="font-medium text-zinc-950 dark:text-white">
                      {booking.guestName}
                    </span>
                  </div>
                )}
                {booking.guestEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <a
                      href={`mailto:${booking.guestEmail}`}
                      className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      {booking.guestEmail}
                    </a>
                  </div>
                )}
                {booking.guestPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <a
                      href={`tel:${booking.guestPhone}`}
                      className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      {booking.guestPhone}
                    </a>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Booking Metadata */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Created</span>
              <span className="text-zinc-950 dark:text-white">
                {new Date(booking.createdAt).toLocaleDateString("nl-NL")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Timezone</span>
              <span className="text-zinc-950 dark:text-white">Europe/Amsterdam</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>Update the booking details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="editDate">Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTime">Start</Label>
                <Input
                  id="editTime"
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndTime">End</Label>
                <Input
                  id="editEndTime"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Location Type</Label>
                <Select
                  value={editLocationType}
                  onValueChange={(v) => setEditLocationType(v as LocationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="AT_PROVIDER">At Office</SelectItem>
                    <SelectItem value="AT_CLIENT">At Client</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLocation">Location/Link</Label>
                <Input
                  id="editLocation"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Client Notes</Label>
              <Textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editInternalNotes">Internal Notes</Label>
              <Textarea
                id="editInternalNotes"
                value={editInternalNotes}
                onChange={(e) => setEditInternalNotes(e.target.value)}
                rows={2}
                placeholder="Only visible to your team..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
