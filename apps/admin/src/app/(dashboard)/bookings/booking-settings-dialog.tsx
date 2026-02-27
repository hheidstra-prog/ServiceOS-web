"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBookingSettings, updateBookingSettings } from "./actions";

interface BookingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 60];

export function BookingSettingsDialog({ open, onOpenChange }: BookingSettingsDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [publicTitle, setPublicTitle] = useState("Intro Call");
  const [publicDurations, setPublicDurations] = useState<number[]>([15, 30]);
  const [publicBuffer, setPublicBuffer] = useState(0);
  const [publicConfirm, setPublicConfirm] = useState(true);
  const [portalDurations, setPortalDurations] = useState<number[]>([30, 60]);
  const [portalBuffer, setPortalBuffer] = useState(0);
  const [portalConfirm, setPortalConfirm] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      getBookingSettings().then((settings) => {
        if (settings) {
          setPublicTitle(settings.publicBookingTitle);
          setPublicDurations(settings.publicBookingDurations);
          setPublicBuffer(settings.publicBookingBuffer);
          setPublicConfirm(settings.publicBookingConfirm);
          setPortalDurations(settings.portalBookingDurations);
          setPortalBuffer(settings.portalBookingBuffer);
          setPortalConfirm(settings.portalBookingConfirm);
        }
        setLoaded(true);
      });
    }
  }, [open, loaded]);

  const toggleDuration = (list: number[], setList: (v: number[]) => void, value: number) => {
    if (list.includes(value)) {
      if (list.length > 1) setList(list.filter((d) => d !== value));
    } else {
      setList([...list, value].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateBookingSettings({
        publicBookingTitle: publicTitle.trim() || "Intro Call",
        publicBookingDurations: publicDurations,
        publicBookingBuffer: publicBuffer,
        publicBookingConfirm: publicConfirm,
        portalBookingDurations: portalDurations,
        portalBookingBuffer: portalBuffer,
        portalBookingConfirm: portalConfirm,
      });
      toast.success("Booking settings updated");
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Booking Settings</DialogTitle>
          <DialogDescription>
            Configure how clients can book appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Public Booking Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Public Booking Page
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-3">
              Settings for the /book page on your public site.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="publicTitle" className="text-sm">Booking Title</Label>
              <input
                id="publicTitle"
                type="text"
                value={publicTitle}
                onChange={(e) => setPublicTitle(e.target.value)}
                placeholder="Intro Call"
                className="h-9 w-full rounded-md border border-zinc-950/10 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950/20 focus:outline-none dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Duration Options</Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDuration(publicDurations, setPublicDurations, d)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      publicDurations.includes(d)
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "border border-zinc-950/10 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Buffer Between Bookings</Label>
              <select
                value={publicBuffer}
                onChange={(e) => setPublicBuffer(Number(e.target.value))}
                className="h-9 rounded-md border border-zinc-950/10 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-white"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === 0 ? "No buffer" : `${b} minutes`}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="publicConfirm" className="text-sm">Require Confirmation</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Bookings arrive as pending until you confirm them.
                </p>
              </div>
              <Switch
                id="publicConfirm"
                checked={publicConfirm}
                onCheckedChange={setPublicConfirm}
              />
            </div>
          </div>

          <div className="border-t border-zinc-950/10 dark:border-white/10" />

          {/* Portal Booking Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Client Portal
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-3">
              Settings for bookings made through the client portal.
            </p>

            <div className="space-y-1.5">
              <Label className="text-sm">Duration Options</Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDuration(portalDurations, setPortalDurations, d)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      portalDurations.includes(d)
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "border border-zinc-950/10 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Buffer Between Bookings</Label>
              <select
                value={portalBuffer}
                onChange={(e) => setPortalBuffer(Number(e.target.value))}
                className="h-9 rounded-md border border-zinc-950/10 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-white"
              >
                {BUFFER_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === 0 ? "No buffer" : `${b} minutes`}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="portalConfirm" className="text-sm">Require Confirmation</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Bookings arrive as pending until you confirm them.
                </p>
              </div>
              <Switch
                id="portalConfirm"
                checked={portalConfirm}
                onCheckedChange={setPortalConfirm}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
