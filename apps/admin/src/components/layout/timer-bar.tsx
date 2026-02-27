"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { stopTimer, discardTimer } from "@/app/(dashboard)/time/actions";

interface RunningTimer {
  startedAt: Date;
  projectId: string | null;
  taskId: string | null;
  serviceId: string | null;
  billable: boolean | null;
  note: string | null;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
  service: { id: string; name: string } | null;
}

function formatElapsed(startedAt: Date) {
  const now = Date.now();
  const ms = now - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function TimerBar({ timer }: { timer: RunningTimer }) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [elapsed, setElapsed] = useState(formatElapsed(timer.startedAt));
  const [isStopping, setIsStopping] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(timer.note || "");

  // Tick the elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(timer.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.startedAt]);

  const handleStop = async () => {
    if (!showNoteInput && !timer.note) {
      setShowNoteInput(true);
      return;
    }

    setIsStopping(true);
    try {
      await stopTimer({ note: note || undefined });
      toast.success("Time entry saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop timer");
    } finally {
      setIsStopping(false);
      setShowNoteInput(false);
    }
  };

  const handleDiscard = async () => {
    const ok = await confirm({
      title: "Discard timer",
      description: "Are you sure? The tracked time will not be saved.",
      confirmLabel: "Discard",
      destructive: true,
    });
    if (!ok) return;

    try {
      await discardTimer();
      toast.success("Timer discarded");
      router.refresh();
    } catch {
      toast.error("Failed to discard timer");
    }
  };

  const label = [
    timer.project?.name,
    timer.task?.title,
    timer.service?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {ConfirmDialog}
      <div className="flex items-center gap-3 border-b border-zinc-950/10 bg-sky-50 px-4 py-2 dark:border-white/10 dark:bg-sky-950/30">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
          <Play className="h-4 w-4 fill-current" />
          <span className="font-mono text-sm font-semibold">{elapsed}</span>
        </div>

        {label && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
            {label}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {showNoteInput && (
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you work on?"
              className="h-7 w-32 sm:w-48 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStop();
                if (e.key === "Escape") setShowNoteInput(false);
              }}
              autoFocus
            />
          )}
          <Button
            size="sm"
            variant="default"
            className="h-7 gap-1.5 bg-sky-600 text-xs hover:bg-sky-700"
            onClick={handleStop}
            disabled={isStopping}
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-zinc-500 hover:text-red-600"
            onClick={handleDiscard}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </>
  );
}
