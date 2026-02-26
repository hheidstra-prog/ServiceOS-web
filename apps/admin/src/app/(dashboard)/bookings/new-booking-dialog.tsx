"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBooking, getClientsForSelect } from "./actions";
import { LocationType } from "@servible/database";

interface BookingType {
  id: string;
  name: string;
  durationMinutes: number;
  color: string | null;
}

interface Client {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
}

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingTypes: BookingType[];
  preselectedClientId?: string;
}

export function NewBookingDialog({
  open,
  onOpenChange,
  bookingTypes,
  preselectedClientId,
}: NewBookingDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientType, setClientType] = useState<"existing" | "guest">("existing");

  // Form state
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [bookingTypeId, setBookingTypeId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [locationType, setLocationType] = useState<LocationType>("ONLINE");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      getClientsForSelect().then(setClients);
      if (preselectedClientId) {
        setClientId(preselectedClientId);
        setClientType("existing");
      }
      // Set default date to today
      const today = new Date();
      setDate(today.toISOString().split("T")[0]);
      // Set default time to next hour
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      setTime(nextHour.toTimeString().slice(0, 5));
    }
  }, [open, preselectedClientId]);

  // Update duration when booking type changes
  useEffect(() => {
    if (bookingTypeId) {
      const type = bookingTypes.find((t) => t.id === bookingTypeId);
      if (type) {
        setDuration(type.durationMinutes.toString());
      }
    }
  }, [bookingTypeId, bookingTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !time) {
      toast.error("Please select a date and time");
      return;
    }

    if (clientType === "existing" && !clientId) {
      toast.error("Please select a client");
      return;
    }

    if (clientType === "guest" && !guestName) {
      toast.error("Please enter guest name");
      return;
    }

    setIsLoading(true);

    const startsAt = new Date(`${date}T${time}`);
    const endsAt = new Date(startsAt.getTime() + parseInt(duration) * 60 * 1000);

    try {
      await createBooking({
        clientId: clientType === "existing" ? clientId : undefined,
        bookingTypeId: bookingTypeId && bookingTypeId !== "none" ? bookingTypeId : undefined,
        guestName: clientType === "guest" ? guestName : undefined,
        guestEmail: clientType === "guest" ? guestEmail : undefined,
        guestPhone: clientType === "guest" ? guestPhone : undefined,
        startsAt,
        endsAt,
        locationType,
        location: location || undefined,
        notes: notes || undefined,
      });
      toast.success("Booking created");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to create booking");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setClientId("");
    setBookingTypeId("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setDate("");
    setTime("");
    setDuration("60");
    setLocationType("ONLINE");
    setLocation("");
    setNotes("");
    setClientType("existing");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>Schedule a new appointment or meeting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <Tabs value={clientType} onValueChange={(v) => setClientType(v as "existing" | "guest")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing Client</TabsTrigger>
              <TabsTrigger value="guest">Guest</TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
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
            </TabsContent>
            <TabsContent value="guest" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="guestName">Name *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest name"
                />
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">Phone</Label>
                  <Input
                    id="guestPhone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+31 6 12345678"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Booking Type */}
          {bookingTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Select value={bookingTypeId} onValueChange={setBookingTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type (optional)" />
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
          )}

          {/* Date & Time */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)}>
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
              <Label htmlFor="location">
                {locationType === "ONLINE" ? "Meeting Link" : "Address"}
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={locationType === "ONLINE" ? "https://..." : "Address..."}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
