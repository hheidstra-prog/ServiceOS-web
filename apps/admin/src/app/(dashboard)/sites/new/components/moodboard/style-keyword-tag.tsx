"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StyleKeywordTagProps {
  id: string;
  keyword: string;
  category: "mood" | "density" | "shape" | "feel";
  onRemove: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  mood: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  density: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  shape: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  feel: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function StyleKeywordTag({
  id,
  keyword,
  category,
  onRemove,
}: StyleKeywordTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        categoryColors[category]
      )}
    >
      {keyword}
      <button
        onClick={() => onRemove(id)}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
