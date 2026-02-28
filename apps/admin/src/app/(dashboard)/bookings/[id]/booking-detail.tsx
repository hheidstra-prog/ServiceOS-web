"use client";

import { useState, useEffect } from "react";
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
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BookingStatus, LocationType } from "@servible/database";
import {
  cancelBooking,
  confirmBooking,
  completeBooking,
  markNoShow,
  deleteBooking,
  updateBooking,
  toggleBookingPortalVisibility,
  getContactsForClient,
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

interface BookingTypeOption {
  id: string;
  name: string;
  durationMinutes: number;
  color: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email?: string | null;
  isPrimary?: boolean;
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
  portalVisible: boolean;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
  } | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  bookingType: BookingType | null;
}

interface BookingDetailProps {
  booking: Booking;
  bookingTypes: BookingTypeOption[];
  clients: ClientOption[];
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

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingDetail({ booking, bookingTypes, clients }: BookingDetailProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [editDate, setEditDate] = useState(
    new Date(booking.startsAt).toISOString().split("T")[0]
  );
  const [editTime, setEditTime] = useState(formatTime(booking.startsAt));
  const [editEndTime, setEditEndTime] = useState(formatTime(booking.endsAt));
  const [editBookingTypeId, setEditBookingTypeId] = useState(booking.bookingType?.id || "none");
  const [editLocationType, setEditLocationType] = useState<LocationType>(booking.locationType);
  const [editLocation, setEditLocation] = useState(booking.location || "");
  const [editClientId, setEditClientId] = useState(booking.client?.id || "");
  const [editContactId, setEditContactId] = useState(booking.contact?.id || "none");
  const [editNotes, setEditNotes] = useState(booking.notes || "");
  const [editInternalNotes, setEditInternalNotes] = useState(booking.internalNotes || "");

  // Contacts for client selector
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  const config = statusConfig[booking.status];
  const isPast = new Date(booking.endsAt) < new Date();
  const canModify = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status);
  const isGuestBooking = !booking.client && (booking.guestName || booking.guestEmail);

  // Fetch contacts when client changes
  useEffect(() => {
    if (editClientId) {
      getContactsForClient(editClientId).then((c) => {
        setContacts(c);
      });
    } else {
      setContacts([]);
      setEditContactId("none");
    }
  }, [editClientId]);

  // Check if form has unsaved changes
  const hasChanges =
    editDate !== new Date(booking.startsAt).toISOString().split("T")[0] ||
    editTime !== formatTime(booking.startsAt) ||
    editEndTime !== formatTime(booking.endsAt) ||
    editBookingTypeId !== (booking.bookingType?.id || "none") ||
    editLocationType !== booking.locationType ||
    editLocation !== (booking.location || "") ||
    editClientId !== (booking.client?.id || "") ||
    editContactId !== (booking.contact?.id || "none") ||
    editNotes !== (booking.notes || "") ||
    editInternalNotes !== (booking.internalNotes || "");

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const startsAt = new Date(`${editDate}T${editTime}`);
      const endsAt = new Date(`${editDate}T${editEndTime}`);

      await updateBooking(booking.id, {
        startsAt,
        endsAt,
        bookingTypeId: editBookingTypeId === "none" ? null : editBookingTypeId,
        locationType: editLocationType,
        location: editLocation || undefined,
        clientId: editClientId || null,
        contactId: editContactId === "none" ? null : editContactId,
        notes: editNotes || undefined,
        internalNotes: editInternalNotes || undefined,
      });
      toast.success("Booking updated");
      router.refresh();
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>{ConfirmDialog}
    <form onSubmit={handleSave}>
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
              <div className="flex flex-wrap items-center gap-2">
                {booking.client && (
                  <div className="flex items-center gap-2 border-r border-zinc-950/10 pr-3 mr-1 dark:border-white/10">
                    <Label htmlFor="portalVisible" className="text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer">Portal</Label>
                    <Switch
                      id="portalVisible"
                      checked={booking.portalVisible}
                      onCheckedChange={async (checked) => {
                        try {
                          await toggleBookingPortalVisibility(booking.id, checked);
                          toast.success(checked ? "Visible on portal" : "Hidden from portal");
                          router.refresh();
                        } catch {
                          toast.error("Failed to update visibility");
                        }
                      }}
                    />
                  </div>
                )}
                {booking.status === "PENDING" && (
                  <Button type="button" onClick={handleConfirm} size="sm">
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Confirm
                  </Button>
                )}
                {booking.status === "CONFIRMED" && isPast && (
                  <>
                    <Button type="button" onClick={handleComplete} size="sm">
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Complete
                    </Button>
                    <Button type="button" onClick={handleNoShow} size="sm" variant="outline">
                      No Show
                    </Button>
                  </>
                )}
                {canModify && (
                  <Button type="button" onClick={handleCancel} size="sm" variant="destructive">
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Cancel Booking
                  </Button>
                )}
                <Button type="button" onClick={handleDelete} size="sm" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-zinc-400" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date & Time */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="editDate">Date</Label>
                  <Input
                    id="editDate"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    disabled={!canModify}
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
                    disabled={!canModify}
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
                    disabled={!canModify}
                    required
                  />
                </div>
              </div>

              {/* Booking Type */}
              <div className="space-y-2">
                <Label>Booking Type</Label>
                <Select
                  value={editBookingTypeId}
                  onValueChange={setEditBookingTypeId}
                  disabled={!canModify}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No type</SelectItem>
                    {bookingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.durationMinutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    <MapPin className="mr-1 inline h-3.5 w-3.5 text-zinc-400" />
                    Location Type
                  </Label>
                  <Select
                    value={editLocationType}
                    onValueChange={(v) => setEditLocationType(v as LocationType)}
                    disabled={!canModify}
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
                  <Label htmlFor="editLocation">
                    {editLocationType === "ONLINE" ? "Meeting Link" : "Address"}
                  </Label>
                  <Input
                    id="editLocation"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    disabled={!canModify}
                    placeholder={editLocationType === "ONLINE" ? "https://..." : "Address..."}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editNotes">Client Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={!canModify}
                  rows={3}
                  placeholder="Notes visible to client..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editInternalNotes">Internal Notes</Label>
                <Textarea
                  id="editInternalNotes"
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  disabled={!canModify}
                  rows={3}
                  placeholder="Only visible to your team..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          {canModify && hasChanges && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="mr-1.5 h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client/Contact */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-zinc-400" />
                {isGuestBooking ? "Guest" : "Client"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isGuestBooking ? (
                /* Guest booking: read-only display */
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
              ) : (
                /* Client booking: editable selectors */
                <>
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select
                      value={editClientId}
                      onValueChange={(v) => {
                        setEditClientId(v);
                        setEditContactId("none");
                      }}
                      disabled={!canModify}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.companyName || client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {contacts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Contact Person</Label>
                      <Select
                        value={editContactId}
                        onValueChange={setEditContactId}
                        disabled={!canModify}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific contact</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.firstName}{contact.lastName ? ` ${contact.lastName}` : ""}
                              {contact.isPrimary ? " (Primary)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Quick link to client */}
                  {editClientId && (
                    <Link
                      href={`/clients/${editClientId}`}
                      className="inline-block text-sm text-sky-600 hover:underline dark:text-sky-400"
                    >
                      View client profile →
                    </Link>
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
      </div>
    </form>
    </>
  );
}
