"use client";

import { Sparkles, Sun, Moon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DesignDirection } from "../../types";

interface DesignDirectionSummaryProps {
  direction: DesignDirection;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function DesignDirectionSummary({
  direction,
  isGenerating,
  onGenerate,
}: DesignDirectionSummaryProps) {
  return (
    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 dark:border-violet-800 dark:from-violet-950/30 dark:to-zinc-900">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Design Direction
        </h3>
      </div>

      {/* Summary text */}
      <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {direction.summary}
      </p>

      {/* Visual preview */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {/* Color mode */}
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          {direction.colorMode === "dark" ? (
            <Moon className="h-3 w-3" />
          ) : (
            <Sun className="h-3 w-3" />
          )}
          <span className="capitalize">{direction.colorMode} mode</span>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          <div
            className="h-4 w-4 rounded-full border border-zinc-200 dark:border-zinc-700"
            style={{ backgroundColor: direction.primaryColor }}
          />
          <div
            className="h-4 w-4 rounded-full border border-zinc-200 dark:border-zinc-700"
            style={{ backgroundColor: direction.secondaryColor }}
          />
          <span className="font-mono text-[10px] text-zinc-400">
            {direction.primaryColor}
          </span>
        </div>

        {/* Fonts */}
        <div className="text-zinc-500 dark:text-zinc-400">
          {direction.fontHeading}
        </div>
        <div className="text-zinc-500 dark:text-zinc-400">
          {direction.fontBody}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>Confidence</span>
          <span>{Math.round(direction.confidence * 100)}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${direction.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="mt-4 w-full"
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Generating your site...
          </>
        ) : (
          <>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate my site
          </>
        )}
      </Button>
    </div>
  );
}
