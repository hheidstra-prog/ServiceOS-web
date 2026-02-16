"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles, Type, TextCursorInput, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { aiChatEditBlogContent, aiInlineEditSelection, aiFindAndInsertImage, importStockAndInsert, generateImageCaption } from "../actions";
import type { ImageCandidate } from "../actions";
import type { EditorSelection } from "@/components/novel-editor";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  appliedUpdate?: boolean;
  imagePreview?: string;
  imageCandidates?: ImageCandidate[];
  pendingCursorPos?: number;
  pendingContext?: { before: string; after: string };
}

interface BlogContentChatProps {
  currentHtml: string;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onContentUpdate: (html: string, selectionRange?: { from: number; to: number }) => void;
  editorSelection?: EditorSelection | null;
}

const IMAGE_KEYWORDS = [
  "image", "photo", "picture", "foto", "afbeelding", "plaatje",
  "img", "illustration", "graphic", "visual", "stock photo",
  // Dutch
  "beelden", "beeld", "archief",
  // German
  "bild", "bilder", "foto", "grafik",
  // French
  "photo", "image", "illustration", "visuel",
];

function isImageRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

const EXAMPLE_PROMPTS = [
  "Rewrite the introduction to be more engaging",
  "Add a section about best practices",
  "Make it more concise and punchy",
];

export function BlogContentChat({
  currentHtml,
  messages,
  onMessagesChange,
  onContentUpdate,
  editorSelection,
}: BlogContentChatProps) {
  const hasSelection = editorSelection && !editorSelection.empty && editorSelection.text.trim().length > 0;
  const hasCursor = editorSelection && editorSelection.empty;
  const selectionPreview = hasSelection
    ? editorSelection!.text.length > 60
      ? editorSelection!.text.slice(0, 60) + "..."
      : editorSelection!.text
    : null;
  const cursorPreview = hasCursor && !hasSelection
    ? editorSelection!.contextBefore.slice(-40)
    : null;
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (candidate: ImageCandidate, cursorPos?: number, context?: { before: string; after: string }) => {
    const insertRange = cursorPos != null
      ? { from: cursorPos, to: cursorPos }
      : undefined; // undefined = append at end
    const altText = (candidate.description || candidate.name).replace(/"/g, "&quot;");

    // Generate a localized caption based on blog context
    let caption = "";
    try {
      const result = await generateImageCaption({
        imageDescription: candidate.description || candidate.name,
        blogContextBefore: context?.before || "",
        blogContextAfter: context?.after || "",
      });
      caption = result.caption;
    } catch {
      // Proceed without caption if generation fails
    }
    const titleAttr = caption ? ` title="${caption.replace(/"/g, "&quot;")}"` : "";

    if (candidate.source === "archive") {
      const imgTag = `<img src="${candidate.url}" alt="${altText}"${titleAttr} />`;
      onContentUpdate(imgTag, insertRange);
    } else {
      setImportingId(candidate.stockResourceId ?? null);
      try {
        const result = await importStockAndInsert({
          stockResourceId: candidate.stockResourceId!,
          title: candidate.name,
        });
        const imgTag = `<img src="${result.imageUrl}" alt="${altText}"${titleAttr} />`;
        onContentUpdate(imgTag, insertRange);
      } catch {
        toast.error("Failed to import stock image");
      } finally {
        setImportingId(null);
      }
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }

    setIsUploading(true);

    // Show a user message for the upload
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: `Uploading image: ${file.name}`,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);

    try {
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
      const imageUrl = data.file.cloudinaryUrl || data.file.url;
      const altText = (data.file.name as string).replace(/"/g, "&quot;");

      // Insert into editor at cursor or end
      const cursorAtUpload = editorSelection?.empty ? editorSelection : null;
      const insertRange = cursorAtUpload
        ? { from: cursorAtUpload.from, to: cursorAtUpload.from }
        : undefined;
      const imgTag = `<img src="${imageUrl}" alt="${altText}" />`;
      onContentUpdate(imgTag, insertRange);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: "Image uploaded and inserted.",
        timestamp: Date.now(),
        appliedUpdate: true,
        imagePreview: imageUrl,
      };
      onMessagesChange([...updatedMessages, assistantMessage]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
      onMessagesChange(messages);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || isLoading) return;

    const displayMessage = hasSelection
      ? `[Selection: "${editorSelection!.text.length > 40 ? editorSelection!.text.slice(0, 40) + "..." : editorSelection!.text}"]\n${message}`
      : hasCursor
        ? `[Insert at cursor]\n${message}`
        : message;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: displayMessage,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Capture selection/cursor at send time (it may change while AI processes)
    const selectionAtSend = hasSelection ? { ...editorSelection! } : null;
    const cursorAtSend = !hasSelection && hasCursor ? { ...editorSelection! } : null;

    try {
      if (isImageRequest(message)) {
        // Image search mode: works with or without cursor
        const result = await aiFindAndInsertImage({
          instruction: message,
          contextBefore: cursorAtSend?.contextBefore || "",
          contextAfter: cursorAtSend?.contextAfter || "",
          fullDocumentHtml: currentHtml,
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: result.message,
          timestamp: Date.now(),
          imageCandidates: result.candidates.length > 0 ? result.candidates : undefined,
          pendingCursorPos: cursorAtSend?.from,
          pendingContext: cursorAtSend
            ? { before: cursorAtSend.contextBefore, after: cursorAtSend.contextAfter }
            : undefined,
        };

        onMessagesChange([...updatedMessages, assistantMessage]);
      } else if (selectionAtSend) {
        // Selection mode: edit just the selected text
        const result = await aiInlineEditSelection({
          selectedHtml: selectionAtSend.text,
          fullDocumentHtml: currentHtml,
          instruction: message,
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `Updated the selected text.`,
          timestamp: Date.now(),
          appliedUpdate: true,
        };

        onMessagesChange([...updatedMessages, assistantMessage]);
        onContentUpdate(result.updatedHtml, {
          from: selectionAtSend.from,
          to: selectionAtSend.to,
        });
      } else if (cursorAtSend) {
        // Cursor mode: generate content to insert at cursor position
        const contextHint = [
          cursorAtSend.contextBefore ? `Text before cursor: "...${cursorAtSend.contextBefore.slice(-80)}"` : "",
          cursorAtSend.contextAfter ? `Text after cursor: "${cursorAtSend.contextAfter.slice(0, 80)}..."` : "",
        ].filter(Boolean).join("\n");

        const enhancedInstruction = `${message}\n\nCursor position context:\n${contextHint}`;

        const result = await aiInlineEditSelection({
          selectedHtml: "",
          fullDocumentHtml: currentHtml,
          instruction: enhancedInstruction,
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `Inserted content at cursor position.`,
          timestamp: Date.now(),
          appliedUpdate: true,
        };

        onMessagesChange([...updatedMessages, assistantMessage]);
        onContentUpdate(result.updatedHtml, {
          from: cursorAtSend.from,
          to: cursorAtSend.from,
        });
      } else {
        // Full document mode: chat-based editing
        const conversationHistory = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await aiChatEditBlogContent({
          currentHtml,
          messages: conversationHistory,
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: result.content,
          timestamp: Date.now(),
          appliedUpdate: !!result.updatedHtml,
        };

        onMessagesChange([...updatedMessages, assistantMessage]);

        if (result.updatedHtml) {
          onContentUpdate(result.updatedHtml);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to get AI response"
      );
      onMessagesChange(messages);
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

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 px-3 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
              AI Content Editor
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Describe changes to your blog post content in natural language.
            </p>
            <div className="mt-4 w-full space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-zinc-200 px-3 pb-3 pt-3 dark:border-zinc-800">
          {selectionPreview && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 dark:bg-violet-950/50">
              <Type className="h-3 w-3 shrink-0 text-violet-500" />
              <span className="truncate text-[11px] text-violet-700 dark:text-violet-300">
                &ldquo;{selectionPreview}&rdquo;
              </span>
            </div>
          )}
          {!selectionPreview && cursorPreview && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 dark:bg-blue-950/50">
              <TextCursorInput className="h-3 w-3 shrink-0 text-blue-500" />
              <span className="truncate text-[11px] text-blue-700 dark:text-blue-300">
                Insert at cursor &mdash; ...{cursorPreview}|
              </span>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasSelection ? "What should I do with this selection?" : hasCursor ? "What should I add here?" : "Describe your changes..."}
              className="min-h-[60px] max-h-[200px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
              rows={3}
            />
            <div className="flex flex-col gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="shrink-0"
                title="Upload image"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon-sm"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
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
                {message.imagePreview && (
                  <div className="mt-1 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.imagePreview}
                      alt="Inserted image"
                      className="max-h-40 w-full object-cover"
                    />
                  </div>
                )}
                {message.imageCandidates && message.imageCandidates.length > 0 && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {message.imageCandidates.map((candidate) => (
                      <button
                        key={candidate.fileId || candidate.stockResourceId}
                        onClick={() => handleImageSelect(candidate, message.pendingCursorPos, message.pendingContext)}
                        disabled={importingId !== null}
                        className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.url}
                            alt={candidate.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {candidate.source === "stock" && importingId === candidate.stockResourceId && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 p-1.5">
                          <p className="flex-1 truncate text-[11px] font-medium text-zinc-950 dark:text-white">
                            {candidate.name}
                          </p>
                          {candidate.source === "stock" && (
                            <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${
                              candidate.stockLicense === "free"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                            }`}>
                              {candidate.stockLicense === "free" ? "Free" : "Premium"}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {message.appliedUpdate && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    {message.imagePreview ? <ImageIcon className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                    {message.imagePreview ? "Image inserted" : "Content updated"}
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
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-200 px-3 pb-3 pt-3 dark:border-zinc-800">
        {selectionPreview && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 dark:bg-violet-950/50">
            <Type className="h-3 w-3 shrink-0 text-violet-500" />
            <span className="truncate text-[11px] text-violet-700 dark:text-violet-300">
              &ldquo;{selectionPreview}&rdquo;
            </span>
          </div>
        )}
        {!selectionPreview && cursorPreview && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 dark:bg-blue-950/50">
            <TextCursorInput className="h-3 w-3 shrink-0 text-blue-500" />
            <span className="truncate text-[11px] text-blue-700 dark:text-blue-300">
              Insert at cursor &mdash; ...{cursorPreview}|
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasSelection ? "What should I do with this selection?" : hasCursor ? "What should I add here?" : "Describe your changes..."}
            disabled={isLoading}
            className="min-h-[36px] max-h-[150px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className="shrink-0"
            title="Upload image"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon-sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>
    </div>
  );
}
