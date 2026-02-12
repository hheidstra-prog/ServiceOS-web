"use client";

import { useState, useCallback } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropZoneProps {
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
  children: React.ReactNode;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageDropZone({
  isUploading,
  onUpload,
  children,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(
        (f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
      );

      if (imageFile) {
        await onUpload(imageFile);
      }
    },
    [onUpload]
  );

  return (
    <div
      className="relative min-h-0 flex-1 flex flex-col overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-violet-500/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-400 bg-white/90 px-8 py-6 dark:bg-zinc-900/90">
            <ImagePlus className="h-8 w-8 text-violet-500" />
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
              Drop image here
            </p>
            <p className="text-xs text-zinc-400">
              JPG, PNG, WebP, GIF up to 10MB
            </p>
          </div>
        </div>
      )}

      {/* Uploading overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-zinc-950/50">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg dark:bg-zinc-800">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              Uploading...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
