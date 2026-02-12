"use client";

import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";

interface BlockOverlayProps {
  blockId: string;
  blockLabel: string;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAddAfter: () => void;
  children: React.ReactNode;
}

export function BlockOverlay({
  blockLabel,
  isSelected,
  isFirst,
  isLast,
  onClick,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddAfter,
  children,
}: BlockOverlayProps) {
  return (
    <div className="group/block relative">
      {/* Clickable overlay */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`relative cursor-pointer transition-shadow duration-150 ${
          isSelected
            ? "ring-2 ring-blue-500 ring-offset-0"
            : "ring-0 hover:ring-2 hover:ring-blue-300 hover:ring-offset-0"
        }`}
      >
        {/* Label badge */}
        <div
          className={`absolute top-2 left-2 z-20 rounded bg-blue-500 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm transition-opacity duration-150 ${
            isSelected
              ? "opacity-100"
              : "opacity-0 group-hover/block:opacity-100"
          }`}
        >
          {blockLabel}
        </div>

        {/* Action buttons */}
        <div
          className={`absolute top-2 right-2 z-20 flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white shadow-sm transition-opacity duration-150 dark:border-zinc-700 dark:bg-zinc-800 ${
            isSelected
              ? "opacity-100"
              : "opacity-0 group-hover/block:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-white"
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-white"
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400"
            title="Delete block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Block content — pointer-events disabled to prevent interaction */}
        <div className="pointer-events-none">
          {children}
        </div>
      </div>

      {/* "+" insertion button between blocks */}
      <div className="relative z-10 flex h-0 items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddAfter();
          }}
          className="absolute -bottom-3 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-400 opacity-0 shadow-sm transition-opacity hover:border-blue-400 hover:text-blue-500 group-hover/block:opacity-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-blue-400 dark:hover:text-blue-400"
          title="Add block here"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
