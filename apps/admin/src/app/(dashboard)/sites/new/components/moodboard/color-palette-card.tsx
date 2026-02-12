"use client";

import { Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPaletteCardProps {
  id: string;
  colors: string[];
  name: string;
  pinned?: boolean;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function ColorPaletteCard({
  id,
  colors: rawColors,
  name,
  pinned,
  onRemove,
  onTogglePin,
}: ColorPaletteCardProps) {
  const colors = Array.isArray(rawColors) ? rawColors : typeof rawColors === "string" ? [rawColors] : [];
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm dark:bg-zinc-900",
        pinned
          ? "border-violet-300 dark:border-violet-700"
          : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      {/* Actions */}
      <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onTogglePin(id)}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button
          onClick={() => onRemove(id)}
          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Color swatches */}
      <div className="flex gap-1.5">
        {colors.map((color, i) => (
          <div key={i} className="group/swatch relative flex-1">
            <div
              className="h-10 w-full rounded-md border border-zinc-200/50 dark:border-zinc-700/50"
              style={{ backgroundColor: color }}
            />
            <span className="mt-1 block text-center font-mono text-[10px] text-zinc-400">
              {color}
            </span>
          </div>
        ))}
      </div>

      {/* Name */}
      <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {name}
      </p>
    </div>
  );
}
