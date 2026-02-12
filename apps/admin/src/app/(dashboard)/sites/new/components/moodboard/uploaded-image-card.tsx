"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageAnalysis } from "../../types";

interface UploadedImageCardProps {
  id: string;
  url: string;
  filename: string;
  analysis?: ImageAnalysis;
  pinned?: boolean;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function UploadedImageCard({
  id,
  url,
  filename,
  analysis,
  pinned,
  onRemove,
  onTogglePin,
}: UploadedImageCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-sm dark:bg-zinc-900",
        pinned
          ? "border-violet-300 dark:border-violet-700"
          : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      {/* Actions */}
      <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onTogglePin(id)}
          className="rounded bg-black/40 p-1 text-white/80 backdrop-blur-sm hover:text-white"
        >
          {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button
          onClick={() => onRemove(id)}
          className="rounded bg-black/40 p-1 text-white/80 backdrop-blur-sm hover:text-red-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Image thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={filename}
        className="h-32 w-full object-cover"
      />

      {/* Analysis info */}
      {analysis && (
        <div className="p-2.5">
          {/* Extracted colors */}
          {analysis.dominantColors.length > 0 && (
            <div className="flex gap-1">
              {analysis.dominantColors.map((color, i) => (
                <div
                  key={i}
                  className="h-4 w-4 rounded-full border border-zinc-200/50 dark:border-zinc-700/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {/* Mood keywords */}
          {analysis.mood.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {analysis.mood.map((m, i) => (
                <span
                  key={i}
                  className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* Expandable summary */}
          {analysis.summary && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-2.5 w-2.5" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-2.5 w-2.5" /> More
                </>
              )}
            </button>
          )}

          {expanded && analysis.summary && (
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {analysis.summary}
            </p>
          )}
        </div>
      )}

      {/* No analysis yet */}
      {!analysis && (
        <div className="p-2">
          <p className="text-[10px] text-zinc-400">{filename}</p>
        </div>
      )}
    </div>
  );
}
