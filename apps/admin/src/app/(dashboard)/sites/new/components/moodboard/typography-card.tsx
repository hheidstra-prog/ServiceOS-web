"use client";

import { useEffect } from "react";
import { Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypographyCardProps {
  id: string;
  heading: string;
  body: string;
  vibe: string;
  pinned?: boolean;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function useGoogleFont(fontName: string) {
  useEffect(() => {
    const id = `google-font-${fontName.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
  }, [fontName]);
}

export function TypographyCard({
  id,
  heading,
  body,
  vibe,
  pinned,
  onRemove,
  onTogglePin,
}: TypographyCardProps) {
  useGoogleFont(heading);
  useGoogleFont(body);

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

      {/* Font preview */}
      <div
        className="text-lg font-bold text-zinc-900 dark:text-white"
        style={{ fontFamily: `'${heading}', sans-serif` }}
      >
        {heading}
      </div>
      <div
        className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
        style={{ fontFamily: `'${body}', sans-serif` }}
      >
        The quick brown fox jumps over the lazy dog
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {heading} / {body}
        </span>
        <span className="text-[10px] text-zinc-400">{vibe}</span>
      </div>
    </div>
  );
}
