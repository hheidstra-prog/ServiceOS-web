"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Loader2,
  Trash2,
  Download,
  ExternalLink,
  Sparkles,
  Clock,
  ImageIcon,
  FileText,
  FolderOpen,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getFileIcon, formatFileSize } from "@/lib/file-utils";
import { deleteFile, updateFile } from "./actions";
import { FileChat } from "./file-chat";
import type { ChatResultPayload } from "./file-chat";
import type { FileResultItem, StockImageResult, FolderResultItem } from "./file-chat-actions";
import type { MediaType } from "@serviceos/database";

interface FileRecord {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  mediaType: MediaType;
  folder: string | null;
  tags: string[];
  aiDescription: string | null;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
  storageProvider: string;
  aiStatus: string | null;
  createdAt: Date;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  uploadedBy: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface FileManagerProps {
  initialFileCount: number;
}

export function FileManager({ initialFileCount }: FileManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [importingStockId, setImportingStockId] = useState<number | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results state — populated by chat, rendered in right panel
  const [currentFileResults, setCurrentFileResults] = useState<FileResultItem[]>([]);
  const [currentStockResults, setCurrentStockResults] = useState<StockImageResult[]>([]);
  const [currentFolderResults, setCurrentFolderResults] = useState<FolderResultItem[]>([]);

  // Edit state for detail panel
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const handleResults = (results: ChatResultPayload) => {
    setCurrentFileResults(results.fileResults);
    setCurrentStockResults(results.stockResults);
    setCurrentFolderResults(results.folderResults);
  };

  const handleClearChat = () => {
    setChatKey((k) => k + 1);
    setCurrentFileResults([]);
    setCurrentStockResults([]);
    setCurrentFolderResults([]);
    setExternalMessage(null);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);

    const uploadedNames: string[] = [];

    try {
      for (const file of Array.from(fileList)) {
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

        uploadedNames.push(file.name);
      }

      toast.success(
        uploadedNames.length === 1
          ? "File uploaded"
          : `${uploadedNames.length} files uploaded`
      );

      setExternalMessage(`I uploaded: ${uploadedNames.join(", ")}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleSelectFile = (file: FileRecord) => {
    setSelectedFile(file);
    setEditName(file.name);
    setEditTags(file.tags.join(", "));
    setEditFolder(file.folder || "");
  };

  const handleChatFileSelect = (file: FileResultItem) => {
    handleSelectFile({
      id: file.id,
      name: file.name,
      fileName: file.name,
      url: file.url,
      mimeType: file.mimeType,
      size: null,
      mediaType: (file.mimeType?.startsWith("image/") ? "IMAGE" : "OTHER") as MediaType,
      folder: file.folder,
      tags: file.tags,
      aiDescription: file.aiDescription,
      cloudinaryPublicId: null,
      cloudinaryUrl: file.cloudinaryUrl,
      storageProvider: file.cloudinaryUrl ? "CLOUDINARY" : "VERCEL_BLOB",
      aiStatus: null,
      createdAt: new Date(),
      client: null,
      project: null,
      uploadedBy: null,
    });
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setIsSavingFile(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await updateFile(selectedFile.id, {
        name: editName,
        tags,
        folder: editFolder || undefined,
      });
      toast.success("File updated");
      setSelectedFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update file"
      );
    } finally {
      setIsSavingFile(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    setIsDeletingFile(true);
    try {
      await deleteFile(selectedFile.id);
      toast.success("File deleted");
      setCurrentFileResults((prev) => prev.filter((f) => f.id !== selectedFile.id));
      setShowDeleteConfirm(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleImportStock = async (resourceId: number, title?: string) => {
    if (importingStockId) return;
    setImportingStockId(resourceId);
    try {
      const res = await fetch("/api/media/freepik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, title }),
      });
      if (res.ok) {
        const data = await res.json();
        const fileName = data?.file?.name || "a stock image";
        toast.success("Stock image imported");
        setExternalMessage(`I just imported ${fileName} from stock. Show me the imported file.`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Failed to import stock image");
    } finally {
      setImportingStockId(null);
    }
  };

  const handleDownloadFile = async () => {
    if (!selectedFile) return;
    try {
      const url = selectedFile.cloudinaryUrl || selectedFile.url;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = selectedFile.fileName || selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Failed to download file");
    }
  };

  const isImage = (mimeType: string | null) =>
    mimeType?.startsWith("image/") ?? false;

  const hasResults = currentFileResults.length > 0 || currentStockResults.length > 0 || currentFolderResults.length > 0;

  const quickActions = [
    { label: "Show recent uploads", icon: Clock },
    { label: "Find all images", icon: ImageIcon },
    { label: "Browse stock photos", icon: Search },
    { label: "Show documents", icon: FileText },
  ];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="relative flex w-full min-h-0 flex-1 gap-4 overflow-hidden"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-violet-500/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-400 bg-white/90 px-8 py-6 dark:bg-zinc-900/90">
            <Upload className="h-8 w-8 text-violet-500" />
            <p className="text-sm font-medium text-violet-600">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Left panel: Chat */}
      <div className="flex w-[380px] min-h-0 shrink-0 flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-950 dark:text-white">AI Assistant</span>
          <button
            onClick={handleClearChat}
            title="New conversation"
            className="ml-auto rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <FileChat
          key={chatKey}
          onFilesChanged={() => {}}
          onFileSelect={handleChatFileSelect}
          onImportStock={handleImportStock}
          onUploadClick={() => fileInputRef.current?.click()}
          isUploading={isUploading}
          externalMessage={externalMessage}
          onExternalMessageConsumed={() => setExternalMessage(null)}
          onResults={handleResults}
        />
      </div>

      {/* Right panel: Results */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {hasResults ? (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Folder results */}
            {currentFolderResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-500">
                  {currentFolderResults.length} folder{currentFolderResults.length > 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {currentFolderResults.map((folder) => (
                    <button
                      key={folder.name}
                      onClick={() => setExternalMessage(`Show files in folder "${folder.name}"`)}
                      className="group flex flex-col items-center gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 text-center transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
                    >
                      <FolderOpen className="h-10 w-10 text-violet-400 transition-colors group-hover:text-violet-500" />
                      <div>
                        <p className="truncate text-xs font-medium text-zinc-950 dark:text-white">
                          {folder.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {folder.fileCount} file{folder.fileCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* File results */}
            {currentFileResults.length > 0 && (
              <div className={`space-y-3 ${currentFolderResults.length > 0 ? "mt-6" : ""}`}>
                <p className="text-xs font-medium text-zinc-500">
                  {currentFileResults.length} file{currentFileResults.length > 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {currentFileResults.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    return (
                      <button
                        key={file.id}
                        onClick={() => handleChatFileSelect(file)}
                        className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                          {isImage(file.mimeType) ? (
                            <img
                              src={file.cloudinaryUrl || file.url}
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
                        <div className="p-2 space-y-0.5">
                          <p className="truncate text-xs font-medium text-zinc-950 dark:text-white">
                            {file.name}
                          </p>
                          {file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                              {file.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] text-violet-600 dark:bg-violet-950 dark:text-violet-400"
                                >
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 3 && (
                                <span className="text-[9px] text-zinc-400">
                                  +{file.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock results */}
            {currentStockResults.length > 0 && (
              <div className={`space-y-3 ${currentFileResults.length > 0 ? "mt-6" : ""}`}>
                <p className="text-xs font-medium text-zinc-500">
                  {currentStockResults.length} stock image{currentStockResults.length > 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {currentStockResults.map((img) => (
                    <div
                      key={img.id}
                      className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                        <img
                          src={img.thumbnail.url}
                          alt={img.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span
                          className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-medium ${
                            img.isPremium
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          }`}
                        >
                          {img.isPremium ? "Premium" : "Free"}
                        </span>
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="truncate text-xs font-medium text-zinc-950 dark:text-white">
                          {img.title}
                        </p>
                        <p className="truncate text-[10px] text-zinc-400">
                          by {img.author.name}
                        </p>
                        <button
                          onClick={() => handleImportStock(img.id, img.title)}
                          disabled={importingStockId !== null}
                          className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-violet-600 px-2 py-1.5 text-[11px] font-medium text-white transition-all hover:bg-violet-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {importingStockId === img.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3" />
                              Import
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Landing state — shown before any results */
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-950 dark:text-white">
                AI Archive Assistant
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Find, organize, and manage your files using natural language.
                {initialFileCount > 0 && (
                  <span className="text-zinc-400"> {initialFileCount} files in library.</span>
                )}
              </p>

              {/* Quick-action chips */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {quickActions.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => setExternalMessage(label)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload files
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Detail Sheet */}
      <Sheet open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>File Details</SheetTitle>
          </SheetHeader>

          {selectedFile && (
            <div className="mt-6 space-y-6">
              {/* Preview */}
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                {isImage(selectedFile.mimeType) ? (
                  <img
                    src={selectedFile.cloudinaryUrl || selectedFile.url}
                    alt={selectedFile.name}
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center">
                    {(() => {
                      const Icon = getFileIcon(selectedFile.mimeType);
                      return <Icon className="h-12 w-12 text-zinc-400" />;
                    })()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadFile}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* AI Status */}
              {selectedFile.aiStatus === "ANALYZING" && (
                <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-3 dark:bg-violet-950/50">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400" />
                  <div>
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300">AI is analyzing this file</p>
                    <p className="text-xs text-violet-600/70 dark:text-violet-400/70">Tags and description will appear shortly</p>
                  </div>
                </div>
              )}

              {/* AI Description */}
              {selectedFile.aiDescription && (
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-500">AI Description</Label>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedFile.aiDescription}
                  </p>
                </div>
              )}

              {/* Editable fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fileName">Name</Label>
                  <Input
                    id="fileName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileTags">Tags (comma-separated)</Label>
                  <Input
                    id="fileTags"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="logo, brand, header..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileFolder">Folder</Label>
                  <Input
                    id="fileFolder"
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    placeholder="e.g., logos, documents..."
                  />
                </div>

                {/* Metadata (read-only) */}
                <div className="space-y-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Size</span>
                    <span className="text-zinc-950 dark:text-white">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Type</span>
                    <span className="text-zinc-950 dark:text-white">
                      {selectedFile.mimeType || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Storage</span>
                    <span className="text-zinc-950 dark:text-white">
                      {selectedFile.storageProvider === "CLOUDINARY" ? "Cloudinary" : "Vercel Blob"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Uploaded</span>
                    <span className="text-zinc-950 dark:text-white">
                      {new Date(selectedFile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedFile.client && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Client</span>
                      <span className="text-zinc-950 dark:text-white">
                        {selectedFile.client.name}
                      </span>
                    </div>
                  )}
                  {selectedFile.project && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Project</span>
                      <span className="text-zinc-950 dark:text-white">
                        {selectedFile.project.name}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSaveFile}
                  disabled={isSavingFile}
                  className="w-full"
                >
                  {isSavingFile ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedFile?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingFile}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFile}
              disabled={isDeletingFile}
            >
              {isDeletingFile ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
