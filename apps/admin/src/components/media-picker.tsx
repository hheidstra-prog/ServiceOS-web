"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FreepikBrowser } from "./freepik-browser";
import { getFileIcon, formatFileSize } from "@/lib/file-utils";

interface SelectedFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: SelectedFile) => void;
  mediaType?: string; // "IMAGE" to filter images only
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  mediaType,
}: MediaPickerProps) {
  const [libraryFiles, setLibraryFiles] = useState<SelectedFile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async (searchQuery?: string) => {
    setIsLoadingLibrary(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (mediaType) params.set("mediaType", mediaType);

      // Use server action via fetch — reuse the files actions
      const { getFiles } = await import(
        "@/app/(dashboard)/files/actions"
      );
      const result = await getFiles({
        search: searchQuery || undefined,
        mediaType: mediaType as "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" | "OTHER" | undefined,
        limit: 50,
      });

      setLibraryFiles(
        result.files.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.cloudinaryUrl || f.url,
          mimeType: f.mimeType || "application/octet-stream",
          size: f.size || 0,
        }))
      );
      setLibraryLoaded(true);
    } catch {
      toast.error("Failed to load library");
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [mediaType]);

  const handleTabChange = (value: string) => {
    if (value === "library" && !libraryLoaded) {
      loadLibrary();
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      onSelect({
        id: data.file.id,
        name: data.file.name,
        url: data.file.cloudinaryUrl || data.file.url,
        mimeType: data.file.mimeType || "application/octet-stream",
        size: data.file.size || 0,
      });
      toast.success("File uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Media</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="library"
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="stock">Stock Images</TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent
            value="library"
            className="flex-1 overflow-y-auto min-h-0"
          >
            <div className="space-y-4 p-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadLibrary(search);
                  }}
                  placeholder="Search files..."
                  className="pl-9"
                />
              </div>

              {isLoadingLibrary ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : libraryFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-500">
                    {libraryLoaded ? "No files found." : "Loading library..."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {libraryFiles.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    return (
                      <button
                        key={file.id}
                        onClick={() => onSelect(file)}
                        className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 text-left transition-all hover:border-violet-400 hover:ring-1 hover:ring-violet-400 dark:border-zinc-800 dark:hover:border-violet-500"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                          {isImage(file.mimeType) ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Icon className="h-8 w-8 text-zinc-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="truncate text-xs font-medium text-zinc-950 dark:text-white">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1">
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-8 dark:border-zinc-700">
              <Upload className="h-10 w-10 text-zinc-400" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
                Upload a file
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Drag and drop or click to browse
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                {isUploading ? "Uploading..." : "Choose File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={mediaType === "IMAGE" ? "image/*" : undefined}
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>
          </TabsContent>

          {/* Stock Images Tab */}
          <TabsContent
            value="stock"
            className="flex-1 overflow-y-auto min-h-0"
          >
            <div className="p-1">
              <FreepikBrowser
                onSelect={(file) => {
                  onSelect(file);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
