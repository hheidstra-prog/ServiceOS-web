"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAvailability, setAvailability } from "./actions";

interface AvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DayRule {
  dayOfWeek: number;
  label: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_RULES: DayRule[] = [
  { dayOfWeek: 1, label: "Monday", isActive: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 2, label: "Tuesday", isActive: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 3, label: "Wednesday", isActive: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 4, label: "Thursday", isActive: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 5, label: "Friday", isActive: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 6, label: "Saturday", isActive: false, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 0, label: "Sunday", isActive: false, startTime: "09:00", endTime: "17:00" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

export function AvailabilityDialog({ open, onOpenChange }: AvailabilityDialogProps) {
  const router = useRouter();
  const [rules, setRules] = useState<DayRule[]>(DEFAULT_RULES);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      getAvailability().then((existing) => {
        if (existing.length > 0) {
          // Merge existing rules with defaults for any missing days
          const ruleMap = new Map(existing.map((r) => [r.dayOfWeek, r]));
          setRules(
            DEFAULT_RULES.map((def) => {
              const existing = ruleMap.get(def.dayOfWeek);
              if (existing) {
                return {
                  ...def,
                  isActive: existing.isActive,
                  startTime: existing.startTime,
                  endTime: existing.endTime,
                };
              }
              return def;
            })
          );
        }
        setLoaded(true);
      });
    }
  }, [open, loaded]);

  const updateRule = (dayOfWeek: number, updates: Partial<DayRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...updates } : r))
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await setAvailability(
        rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          isActive: r.isActive,
        }))
      );
      toast.success("Availability updated");
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save availability");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Availability Hours</DialogTitle>
          <DialogDescription>
            Set your weekly availability for bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
          {rules.map((rule) => (
            <div
              key={rule.dayOfWeek}
              className={`flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-3 transition-colors ${
                rule.isActive
                  ? "border-zinc-950/10 dark:border-white/10"
                  : "border-zinc-950/5 bg-zinc-50 dark:border-white/5 dark:bg-zinc-900"
              }`}
            >
              <Switch
                checked={rule.isActive}
                onCheckedChange={(checked) => updateRule(rule.dayOfWeek, { isActive: checked })}
              />
              <span className={`w-16 sm:w-24 text-sm font-medium ${
                rule.isActive
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}>
                {rule.label}
              </span>
              {rule.isActive ? (
                <div className="flex items-center gap-2">
                  <select
                    value={rule.startTime}
                    onChange={(e) => updateRule(rule.dayOfWeek, { startTime: e.target.value })}
                    className="h-8 rounded-md border border-zinc-950/10 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-sm text-zinc-400">—</span>
                  <select
                    value={rule.endTime}
                    onChange={(e) => updateRule(rule.dayOfWeek, { endTime: e.target.value })}
                    className="h-8 rounded-md border border-zinc-950/10 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-zinc-400 dark:text-zinc-500">Closed</span>
              )}
            </div>
          ))}
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
