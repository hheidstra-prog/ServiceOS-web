import {
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  File as FileIcon,
  type LucideIcon,
} from "lucide-react";
import { MediaType } from "@serviceos/database";

export function getFileIcon(mimeType: string | null): LucideIcon {
  if (!mimeType) return FileIcon;

  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip")
  ) {
    return FileArchive;
  }
  if (
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  ) {
    return FileText;
  }

  return FileIcon;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMediaTypeLabel(mediaType: MediaType): string {
  const labels: Record<MediaType, string> = {
    IMAGE: "Image",
    DOCUMENT: "Document",
    VIDEO: "Video",
    AUDIO: "Audio",
    OTHER: "Other",
  };
  return labels[mediaType] || "Other";
}

export function getMediaTypeColor(mediaType: MediaType): string {
  const colors: Record<MediaType, string> = {
    IMAGE: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    DOCUMENT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    VIDEO: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    AUDIO: "bg-green-500/10 text-green-700 dark:text-green-400",
    OTHER: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  };
  return colors[mediaType] || colors.OTHER;
}
