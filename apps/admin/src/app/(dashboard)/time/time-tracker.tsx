"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Trash2,
  MoreHorizontal,
  Receipt,
} from "lucide-react";
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
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteTimeEntry } from "./actions";
import { TimeEntryDialog } from "./time-entry-dialog";

interface TimeEntry {
  id: string;
  description: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  billable: boolean;
  billed: boolean;
  hourlyRate: number | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  service: {
    id: string;
    name: string;
  } | null;
}

interface TimeStats {
  totalHours: number;
  billableHours: number;
  billedHours: number;
  unbilledHours: number;
}

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface Project {
  id: string;
  name: string;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  };
}

interface TimeTrackerProps {
  initialEntries: TimeEntry[];
  initialStats: TimeStats | null;
  clients: Client[];
  projects: Project[];
  weekStart: Date;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(date: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWeekDays(weekStart: Date) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

function isSameDay(date1: Date, date2: Date) {
  return (
    new Date(date1).toDateString() === new Date(date2).toDateString()
  );
}

export function TimeTracker({
  initialEntries,
  initialStats,
  clients,
  projects,
  weekStart: initialWeekStart,
}: TimeTrackerProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [entries] = useState(initialEntries);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekDays = getWeekDays(weekStart);
  const stats = initialStats;

  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
    router.refresh();
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
    router.refresh();
  };

  const handleThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const newStart = new Date(now);
    newStart.setDate(now.getDate() + diff);
    newStart.setHours(0, 0, 0, 0);
    setWeekStart(newStart);
    router.refresh();
  };

  const handleAdd = (date?: Date) => {
    setEditingEntry(null);
    setSelectedDate(date || null);
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setSelectedDate(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete time entry",
      description: "Are you sure you want to delete this time entry? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTimeEntry(id);
      toast.success("Time entry deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete time entry");
    }
  };

  // Group entries by date
  const entriesByDate = entries.reduce(
    (acc, entry) => {
      const dateKey = new Date(entry.date).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(entry);
      return acc;
    },
    {} as Record<string, TimeEntry[]>
  );

  // Calculate daily totals
  const dailyTotals = weekDays.reduce(
    (acc, day) => {
      const dateKey = day.toDateString();
      const dayEntries = entriesByDate[dateKey] || [];
      acc[dateKey] = dayEntries.reduce((sum, e) => sum + e.duration, 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <>{ConfirmDialog}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Time Tracking
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Log hours against clients and projects.
          </p>
        </div>
        <div className="flex gap-2">
          {stats && stats.unbilledHours > 0 && (
            <Link href="/time/invoice">
              <Button variant="outline" size="sm">
                <Receipt className="mr-1.5 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
          )}
          <Button onClick={() => handleAdd()} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Log time
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Hours</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                {stats.totalHours.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Billable</p>
              <p className="mt-1 text-2xl font-semibold text-sky-600 dark:text-sky-400">
                {stats.billableHours.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Unbilled</p>
              <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {stats.unbilledHours.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Billed</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.billedHours.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleThisWeek}>
            This week
          </Button>
        </div>
        <h2 className="text-sm font-medium text-zinc-950 dark:text-white">
          {weekStart.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} -{" "}
          {weekDays[6].toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </h2>
      </div>

      {/* Week Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dateKey = day.toDateString();
          const dayEntries = entriesByDate[dateKey] || [];
          const dayTotal = dailyTotals[dateKey] || 0;

          return (
            <Card
              key={dateKey}
              className={isToday(day) ? "border-sky-300 dark:border-sky-500/50" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      {day.toLocaleDateString("nl-NL", { weekday: "short" })}
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        isToday(day)
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-zinc-950 dark:text-white"
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleAdd(day)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {dayTotal > 0 && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDuration(dayTotal)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {dayEntries.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No entries
                  </p>
                ) : (
                  dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-md border p-2 text-xs ${
                        entry.billable
                          ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
                          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-950 truncate dark:text-white">
                            {entry.client?.companyName || entry.client?.name || "No client"}
                          </p>
                          {entry.project && (
                            <p className="text-zinc-500 dark:text-zinc-400 truncate">
                              {entry.project.name}
                            </p>
                          )}
                          {entry.description && (
                            <p className="text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {entry.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs" className="shrink-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(entry)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(entry.id)}
                              variant="destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(entry.duration)}</span>
                        {entry.startTime && entry.endTime && (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            ({formatTime(entry.startTime)} - {formatTime(entry.endTime)})
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time Entry Dialog */}
      <TimeEntryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingEntry={editingEntry}
        preselectedDate={selectedDate}
        clients={clients}
        projects={projects}
      />
    </div>
    </>
  );
}
