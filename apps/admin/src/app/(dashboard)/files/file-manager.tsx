"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  Search,
  Grid3X3,
  List,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Trash2,
  FolderOpen,
  Download,
  ExternalLink,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MediaType } from "@serviceos/database";
import { getFileIcon, formatFileSize, getMediaTypeLabel, getMediaTypeColor } from "@/lib/file-utils";
import { getFiles, deleteFile, updateFile, getAnalyzingFileIds, smartSearch } from "./actions";
import { FreepikBrowser } from "@/components/freepik-browser";
import { FileChat } from "./file-chat";
import type { FileResultItem } from "./file-chat-actions";

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
  initialFiles: FileRecord[];
  initialTotal: number;
  initialFolders: string[];
  initialTags: string[];
}

export function FileManager({
  initialFiles,
  initialTotal,
  initialFolders,
  initialTags,
}: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [total, setTotal] = useState(initialTotal);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showStockBrowser, setShowStockBrowser] = useState(false);
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [smartSearchQuery, setSmartSearchQuery] = useState("");
  const [smartSearchResults, setSmartSearchResults] = useState<FileRecord[]>([]);
  const [smartSearchKeywords, setSmartSearchKeywords] = useState<string[]>([]);
  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [scanContent, setScanContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Edit state for detail panel
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const refreshFiles = useCallback(async () => {
    try {
      const result = await getFiles({
        search: search || undefined,
        mediaType: mediaTypeFilter !== "all" ? (mediaTypeFilter as MediaType) : undefined,
        folder: folderFilter !== "all" ? folderFilter : undefined,
      });
      setFiles(result.files as FileRecord[]);
      setTotal(result.total);
    } catch {
      toast.error("Failed to refresh files");
    }
  }, [search, mediaTypeFilter, folderFilter]);

  const handleSearch = useCallback(async () => {
    await refreshFiles();
  }, [refreshFiles]);

  // Poll for files that are still being analyzed
  useEffect(() => {
    const hasAnalyzing = files.some((f) => f.aiStatus === "ANALYZING");

    if (hasAnalyzing && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const analyzingIds = await getAnalyzingFileIds();
        if (analyzingIds.length === 0) {
          // All done — refresh and stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          refreshFiles();
        }
      }, 3000);
    } else if (!hasAnalyzing && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [files, refreshFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        if (scanContent) {
          formData.append("scanContent", "true");
        }

        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }
      }

      toast.success(
        fileList.length === 1
          ? "File uploaded"
          : `${fileList.length} files uploaded`
      );
      await refreshFiles();
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
    // Bridge FileResultItem to FileRecord for the detail sheet
    handleSelectFile({
      id: file.id,
      name: file.name,
      fileName: file.name,
      url: file.url,
      mimeType: file.mimeType,
      size: null,
      mediaType: file.mimeType?.startsWith("image/") ? "IMAGE" : "OTHER" as MediaType,
      folder: null,
      tags: file.tags,
      aiDescription: file.aiDescription,
      cloudinaryPublicId: null,
      cloudinaryUrl: file.cloudinaryUrl,
      storageProvider: "UNKNOWN",
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
      await refreshFiles();
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
    if (!confirm(`Delete "${selectedFile.name}"?`)) return;
    setIsDeletingFile(true);
    try {
      await deleteFile(selectedFile.id);
      toast.success("File deleted");
      setSelectedFile(null);
      await refreshFiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    } finally {
      setIsDeletingFile(false);
    }
  };

  const isImage = (mimeType: string | null) =>
    mimeType?.startsWith("image/") ?? false;

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />

          <div className="flex items-center gap-1.5">
            <Checkbox
              id="scanContent"
              checked={scanContent}
              onCheckedChange={(checked) => setScanContent(checked === true)}
            />
            <Label htmlFor="scanContent" className="text-xs text-zinc-500 cursor-pointer">
              Scan docs with AI
            </Label>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowStockBrowser(true)}
          >
            <ImageIcon className="mr-1.5 h-4 w-4" />
            Stock Images
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSmartSearch(true)}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Smart Search
          </Button>

          <Button
            variant={showChat ? "secondary" : "outline"}
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            AI Assistant
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="h-9 w-48 pl-9 text-sm"
              />
            </div>

            <Select value={mediaTypeFilter} onValueChange={(v) => { setMediaTypeFilter(v); }}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="IMAGE">Images</SelectItem>
                <SelectItem value="DOCUMENT">Documents</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="AUDIO">Audio</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            {initialFolders.length > 0 && (
              <Select value={folderFilter} onValueChange={(v) => { setFolderFilter(v); }}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  {initialFolders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refreshFiles}
              className="h-9 w-9"
            >
              <Search className="h-4 w-4" />
            </Button>

            <div className="flex rounded-md border border-zinc-200 dark:border-zinc-800">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("grid")}
                className="h-9 w-9 rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("list")}
                className="h-9 w-9 rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Drop zone + File Grid/List */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`min-h-[400px] rounded-lg border-2 transition-colors ${
            isDragging
              ? "border-dashed border-violet-400 bg-violet-50/50 dark:bg-violet-950/10"
              : "border-transparent"
          }`}
        >
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-900">
                <FolderOpen className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-zinc-950 dark:text-white">
                No files yet
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Upload files or drag and drop them here.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Upload Files
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <button
                    key={file.id}
                    onClick={() => handleSelectFile(file)}
                    className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  >
                    {/* Thumbnail */}
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
                          <Icon className="h-10 w-10 text-zinc-400" />
                        </div>
                      )}
                      {file.aiStatus === "ANALYZING" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 dark:bg-zinc-900/90">
                            <Loader2 className="h-3 w-3 animate-spin text-violet-600" />
                            <span className="text-[10px] font-medium text-violet-600">Analyzing</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2">
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
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Size
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Tags
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {files.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    return (
                      <tr
                        key={file.id}
                        onClick={() => handleSelectFile(file)}
                        className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                            <span className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                              {file.name}
                            </span>
                            {file.aiStatus === "ANALYZING" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 dark:bg-violet-950">
                                <Loader2 className="h-3 w-3 animate-spin text-violet-600 dark:text-violet-400" />
                                <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Analyzing</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${getMediaTypeColor(
                              file.mediaType as MediaType
                            )}`}
                          >
                            {getMediaTypeLabel(file.mediaType as MediaType)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-zinc-500">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {file.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                              >
                                {tag}
                              </span>
                            ))}
                            {file.tags.length > 3 && (
                              <span className="text-[10px] text-zinc-400">
                                +{file.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-zinc-500">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > files.length && (
          <p className="text-center text-sm text-zinc-500">
            Showing {files.length} of {total} files
          </p>
        )}
      </div>

      {/* AI Assistant Side Panel */}
      {showChat && (
        <div className="sticky top-0 w-96 shrink-0 self-start">
          <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium text-zinc-950 dark:text-white">AI Assistant</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowChat(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FileChat
              onFilesChanged={refreshFiles}
              onFileSelect={handleChatFileSelect}
            />
          </div>
        </div>
      )}

      {/* Smart Search Dialog */}
      <Dialog open={showSmartSearch} onOpenChange={(open) => {
        setShowSmartSearch(open);
        if (!open) {
          setSmartSearchQuery("");
          setSmartSearchResults([]);
          setSmartSearchKeywords([]);
        }
      }}>
        <DialogContent className="sm:max-w-4xl w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Smart Search
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Textarea
              placeholder={"Search by description, tags, or filename...\ne.g. \"business woman with tablet\""}
              value={smartSearchQuery}
              onChange={(e) => setSmartSearchQuery(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey && smartSearchQuery.trim()) {
                  e.preventDefault();
                  setIsSmartSearching(true);
                  setSmartSearchKeywords([]);
                  try {
                    const result = await smartSearch(smartSearchQuery.trim());
                    setSmartSearchResults(result.files as FileRecord[]);
                    setSmartSearchKeywords(result.keywords || []);
                  } catch {
                    toast.error("Search failed");
                  } finally {
                    setIsSmartSearching(false);
                  }
                }
              }}
              className="min-h-[60px] resize-none pl-10"
              rows={2}
              autoFocus
            />
          </div>
          {smartSearchKeywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Searched for:</span>
              {smartSearchKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-600 dark:bg-violet-950 dark:text-violet-400"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isSmartSearching ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  <p className="text-xs text-zinc-500">AI is expanding your search...</p>
                </div>
              </div>
            ) : smartSearchResults.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 py-2">
                {smartSearchResults.map((file) => {
                  const Icon = getFileIcon(file.mimeType);
                  return (
                    <button
                      key={file.id}
                      onClick={() => {
                        handleSelectFile(file);
                        setShowSmartSearch(false);
                        setSmartSearchQuery("");
                        setSmartSearchResults([]);
                        setSmartSearchKeywords([]);
                      }}
                      className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
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
                            <Icon className="h-10 w-10 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="truncate text-xs font-medium text-zinc-950 dark:text-white">
                          {file.name}
                        </p>
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600 dark:bg-violet-950 dark:text-violet-400"
                              >
                                {tag}
                              </span>
                            ))}
                            {file.tags.length > 3 && (
                              <span className="text-[10px] text-zinc-400">
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
            ) : smartSearchQuery ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-500">
                  No files found. Try different keywords.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="h-8 w-8 text-violet-300 dark:text-violet-600" />
                <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Search your files using natural language
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Searches file names, AI descriptions, and tags
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Images Dialog */}
      <Dialog open={showStockBrowser} onOpenChange={setShowStockBrowser}>
        <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Images</DialogTitle>
          </DialogHeader>
          <FreepikBrowser
            onSelect={() => {
              setShowStockBrowser(false);
              refreshFiles();
            }}
          />
        </DialogContent>
      </Dialog>

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
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={selectedFile.url} download={selectedFile.fileName}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteFile}
                  disabled={isDeletingFile}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  {isDeletingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
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
    </div>
  );
}
