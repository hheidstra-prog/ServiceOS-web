"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { createTimeEntry, updateTimeEntry, getProjectsForSelect } from "./actions";

interface TimeEntry {
  id: string;
  description: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  billable: boolean;
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

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry: TimeEntry | null;
  preselectedDate: Date | null;
  clients: Client[];
  projects: Project[];
}

export function TimeEntryDialog({
  open,
  onOpenChange,
  editingEntry,
  preselectedDate,
  clients,
  projects: initialProjects,
}: TimeEntryDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState(initialProjects);

  // Form state
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [billable, setBillable] = useState(true);
  const [useTimeRange, setUseTimeRange] = useState(false);

  // Load projects when client changes
  useEffect(() => {
    if (clientId) {
      getProjectsForSelect(clientId).then(setProjects);
    } else {
      setProjects(initialProjects);
    }
  }, [clientId, initialProjects]);

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setClientId(editingEntry.client?.id || "");
      setProjectId(editingEntry.project?.id || "");
      setDescription(editingEntry.description || "");
      setDate(new Date(editingEntry.date).toISOString().split("T")[0]);
      setBillable(editingEntry.billable);

      if (editingEntry.startTime && editingEntry.endTime) {
        setUseTimeRange(true);
        setStartTime(
          new Date(editingEntry.startTime).toTimeString().slice(0, 5)
        );
        setEndTime(new Date(editingEntry.endTime).toTimeString().slice(0, 5));
        setHours("");
        setMinutes("");
      } else {
        setUseTimeRange(false);
        const h = Math.floor(editingEntry.duration / 60);
        const m = editingEntry.duration % 60;
        setHours(h.toString());
        setMinutes(m.toString());
        setStartTime("");
        setEndTime("");
      }
    } else {
      resetForm();
      if (preselectedDate) {
        setDate(preselectedDate.toISOString().split("T")[0]);
      }
    }
  }, [editingEntry, open, preselectedDate]);

  const resetForm = () => {
    setClientId("");
    setProjectId("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setStartTime("");
    setEndTime("");
    setHours("");
    setMinutes("");
    setBillable(true);
    setUseTimeRange(false);
  };

  const calculateDuration = () => {
    if (useTimeRange && startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return endMinutes - startMinutes;
    } else {
      const h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      return h * 60 + m;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const duration = calculateDuration();
    if (duration <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    if (!date) {
      toast.error("Date is required");
      return;
    }

    setIsLoading(true);

    try {
      const dateObj = new Date(date);
      let startTimeObj: Date | undefined;
      let endTimeObj: Date | undefined;

      if (useTimeRange && startTime && endTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        startTimeObj = new Date(dateObj);
        startTimeObj.setHours(startH, startM, 0, 0);
        endTimeObj = new Date(dateObj);
        endTimeObj.setHours(endH, endM, 0, 0);
      }

      if (editingEntry) {
        await updateTimeEntry(editingEntry.id, {
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          description: description || undefined,
          date: dateObj,
          startTime: startTimeObj,
          endTime: endTimeObj,
          duration,
          billable,
        });
        toast.success("Time entry updated");
      } else {
        await createTimeEntry({
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          description: description || undefined,
          date: dateObj,
          startTime: startTimeObj,
          endTime: endTimeObj,
          duration,
          billable,
        });
        toast.success("Time entry created");
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to save time entry");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter projects by selected client
  const filteredProjects = clientId
    ? projects.filter((p) => p.client.id === clientId)
    : projects;

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
          <DialogTitle>{editingEntry ? "Edit Time Entry" : "Log Time"}</DialogTitle>
          <DialogDescription>
            {editingEntry
              ? "Update the time entry details."
              : "Record time spent on a client or project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client & Project */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {!clientId && (
                        <span className="ml-1 text-zinc-500">
                          ({project.client.companyName || project.client.name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What did you work on?"
            />
          </div>

          {/* Date */}
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

          {/* Time Input Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Use time range</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Enter start and end times instead of duration
              </p>
            </div>
            <Switch checked={useTimeRange} onCheckedChange={setUseTimeRange} />
          </div>

          {/* Duration or Time Range */}
          {useTimeRange ? (
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {calculateDuration() > 0 && (
            <div className="rounded-md border border-zinc-950/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-800/50">
              <p className="text-sm text-zinc-950 dark:text-white">
                <span className="text-zinc-500 dark:text-zinc-400">Duration: </span>
                {Math.floor(calculateDuration() / 60)}h {calculateDuration() % 60}m
              </p>
            </div>
          )}

          {/* Billable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="billable">Billable</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Mark as billable time
              </p>
            </div>
            <Switch id="billable" checked={billable} onCheckedChange={setBillable} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingEntry ? "Update" : "Log Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
