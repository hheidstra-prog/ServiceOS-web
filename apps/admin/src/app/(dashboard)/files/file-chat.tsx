"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  Loader2,
  Paperclip,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getFileIcon, cloudinaryThumb } from "@/lib/file-utils";
import {
  chatFileAssistant,
  type FileResultItem,
  type StockImageResult,
  type FolderResultItem,
} from "./file-chat-actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actionsTaken?: string[];
  fileResults?: FileResultItem[];
  stockResults?: StockImageResult[];
  folderResults?: FolderResultItem[];
  stockSearchOffer?: { query: string };
}

export interface ChatResultPayload {
  fileResults: FileResultItem[];
  stockResults: StockImageResult[];
  folderResults: FolderResultItem[];
}

interface FileChatProps {
  onFilesChanged?: () => void;
  onFileSelect?: (file: FileResultItem) => void;
  onImportStock?: (resourceId: number, title?: string) => void;
  onUploadClick?: () => void;
  isUploading?: boolean;
  externalMessage?: string | null;
  onExternalMessageConsumed?: () => void;
  onResults?: (results: ChatResultPayload) => void;
  initialFileResults?: FileResultItem[];
  locale?: string;
}

const seedMessages: Record<string, (n: number) => string> = {
  nl: (n) => `Hier zijn je ${n} meest recente bestand${n > 1 ? "en" : ""}. Vraag me om ze te zoeken, te ordenen of te beheren.`,
  en: (n) => `Here are your ${n} most recent file${n > 1 ? "s" : ""}. Ask me to find, organize, or manage them.`,
  de: (n) => `Hier sind deine ${n} neuesten Dateien. Frag mich, um sie zu suchen, zu ordnen oder zu verwalten.`,
  fr: (n) => `Voici vos ${n} fichiers les plus récents. Demandez-moi de les rechercher, organiser ou gérer.`,
};

const STORAGE_KEY = "file-chat-messages";

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // storage full or unavailable — ignore
  }
}

function StockSearchWidget({
  query,
  disabled,
  onSearch,
}: {
  query: string;
  disabled: boolean;
  onSearch: (message: string) => void;
}) {
  const [includePremium, setIncludePremium] = useState(false);

  return (
    <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`premium-${query}`}
          checked={includePremium}
          onCheckedChange={(checked) => setIncludePremium(checked === true)}
          disabled={disabled}
        />
        <Label
          htmlFor={`premium-${query}`}
          className="text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer"
        >
          Include paid assets
        </Label>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          const msg = includePremium
            ? `Search free and premium stock for '${query}'`
            : `Search free stock for '${query}'`;
          onSearch(msg);
        }}
        className="ml-auto h-7 gap-1.5 text-xs"
      >
        <Search className="h-3 w-3" />
        Search stock
      </Button>
    </div>
  );
}

export function FileChat({
  onFilesChanged,
  onFileSelect,
  onImportStock,
  onUploadClick,
  isUploading,
  externalMessage,
  onExternalMessageConsumed,
  onResults,
  initialFileResults,
  locale = "en",
}: FileChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [usedOffers, setUsedOffers] = useState<Set<string>>(new Set());
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const hasRestoredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    saveMessages(messages);
  }, [messages]);

  // On mount, restore from sessionStorage or inject synthetic message from initialFileResults
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const restored = loadMessages();
    if (restored.length > 0) {
      setMessages(restored);
      if (onResults) {
        // Replay the most recent results to the right panel
        for (let i = restored.length - 1; i >= 0; i--) {
          const m = restored[i];
          if (
            (m.fileResults && m.fileResults.length > 0) ||
            (m.stockResults && m.stockResults.length > 0) ||
            (m.folderResults && m.folderResults.length > 0)
          ) {
            onResults({
              fileResults: m.fileResults || [],
              stockResults: m.stockResults || [],
              folderResults: m.folderResults || [],
            });
            break;
          }
        }
      }
    } else if (initialFileResults && initialFileResults.length > 0) {
      const n = initialFileResults.length;
      const getMessage = seedMessages[locale] || seedMessages.en;
      const synthetic: ChatMessage = {
        id: `msg-seed`,
        role: "assistant",
        content: getMessage(n),
        timestamp: Date.now(),
        fileResults: initialFileResults,
      };
      setMessages([synthetic]);
      onResults?.({
        fileResults: initialFileResults,
        stockResults: [],
        folderResults: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  // Bridge external messages (drag-drop uploads, chip clicks) into the chat
  useEffect(() => {
    if (externalMessage) {
      handleSend(externalMessage);
      onExternalMessageConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploaded: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) uploaded.push(file.name);
      else throw new Error(`Failed to upload ${file.name}`);
    }
    return uploaded;
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    const hasFiles = pendingFiles.length > 0;
    if ((!message && !hasFiles) || isLoading || isUploadingFiles) return;

    let composedMessage = message;

    if (hasFiles) {
      setIsUploadingFiles(true);
      try {
        const filesToUpload = [...pendingFiles];
        setPendingFiles([]);
        const uploadedNames = await uploadFiles(filesToUpload);
        onFilesChanged?.();
        const uploadNote = `I uploaded: ${uploadedNames.join(", ")}`;
        composedMessage = message
          ? `${uploadNote}\n\n${message}`
          : uploadNote;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload files"
        );
        setIsUploadingFiles(false);
        return;
      } finally {
        setIsUploadingFiles(false);
      }
    }

    if (!composedMessage) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: composedMessage,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chatFileAssistant(conversationHistory);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: result.content,
        timestamp: Date.now(),
        actionsTaken: result.actionsTaken,
        fileResults: result.fileResults,
        stockResults: result.stockResults,
        folderResults: result.folderResults,
        stockSearchOffer: result.stockSearchOffer,
      };

      setMessages([...updatedMessages, assistantMessage]);

      // Emit results to parent for the right panel
      if (onResults) {
        onResults({
          fileResults: result.fileResults || [],
          stockResults: result.stockResults || [],
          folderResults: result.folderResults || [],
        });
      }

      if (result.actionsTaken && result.actionsTaken.length > 0) {
        onFilesChanged?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to get AI response"
      );
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isImage = (mimeType: string | null) =>
    mimeType?.startsWith("image/") ?? false;

  // When onResults is set, results go to the right panel — don't render inline
  const renderInlineResults = !onResults;

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Ask me to find, organize, or manage your files.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}

                <div className="flex max-w-[85%] flex-col gap-1">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Inline file results (only when no onResults callback) */}
                  {renderInlineResults && message.fileResults && message.fileResults.length > 0 && (
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      {message.fileResults.map((file) => {
                        const Icon = getFileIcon(file.mimeType);
                        return (
                          <button
                            key={file.id}
                            onClick={() => onFileSelect?.(file)}
                            className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                              {isImage(file.mimeType) ? (
                                <img
                                  src={cloudinaryThumb(file.cloudinaryUrl || file.url, 200, 200)}
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
                            <div className="p-1.5 space-y-0.5">
                              <p className="truncate text-[11px] font-medium text-zinc-950 dark:text-white">
                                {file.name}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline stock results (only when no onResults callback) */}
                  {renderInlineResults && message.stockResults && message.stockResults.length > 0 && (
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      {message.stockResults.map((img) => (
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
                          </div>
                          <div className="p-1.5">
                            <p className="truncate text-[11px] font-medium text-zinc-950 dark:text-white">
                              {img.title}
                            </p>
                            <button
                              onClick={() => onImportStock?.(img.id, img.title)}
                              className="mt-1 flex w-full items-center justify-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-violet-700"
                            >
                              <Download className="h-2.5 w-2.5" />
                              Import
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stock search offer widget (always in chat — it's conversational) */}
                  {message.stockSearchOffer && (
                    <StockSearchWidget
                      query={message.stockSearchOffer.query}
                      disabled={usedOffers.has(message.id) || isLoading}
                      onSearch={(msg) => {
                        setUsedOffers((prev) => new Set(prev).add(message.id));
                        handleSend(msg);
                      }}
                    />
                  )}

                  {message.actionsTaken && message.actionsTaken.length > 0 && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <Sparkles className="h-2.5 w-2.5" />
                      {message.actionsTaken.length} action{message.actionsTaken.length > 1 ? "s" : ""} taken
                    </span>
                  )}

                  {/* Result count hint (when results go to right panel) */}
                  {onResults && message.fileResults && message.fileResults.length > 0 && (
                    <span className="text-[10px] text-violet-500">
                      {message.fileResults.length} file{message.fileResults.length > 1 ? "s" : ""} shown →
                    </span>
                  )}
                  {onResults && message.stockResults && message.stockResults.length > 0 && (
                    <span className="text-[10px] text-violet-500">
                      {message.stockResults.length} stock image{message.stockResults.length > 1 ? "s" : ""} shown →
                    </span>
                  )}
                  {onResults && message.folderResults && message.folderResults.length > 0 && (
                    <span className="text-[10px] text-violet-500">
                      {message.folderResults.length} folder{message.folderResults.length > 1 ? "s" : ""} shown →
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                  <span className="text-xs text-zinc-500">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-zinc-200 px-3 pb-3 pt-3 dark:border-zinc-800">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {pendingFiles.map((file, i) => (
                <span
                  key={`${file.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                >
                  {file.name}
                  <button
                    onClick={() => removePendingFile(i)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your files..."
              disabled={isLoading || isUploadingFiles}
              className="min-h-[36px] max-h-[150px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
              rows={1}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploadingFiles}
              className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              onClick={() => handleSend()}
              disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || isUploadingFiles}
              className="shrink-0"
            >
              {isUploadingFiles ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
