"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getFileIcon } from "@/lib/file-utils";
import { chatFileAssistant, type FileResultItem } from "./file-chat-actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actionsTaken?: string[];
  fileResults?: FileResultItem[];
}

interface FileChatProps {
  onFilesChanged?: () => void;
  onFileSelect?: (file: FileResultItem) => void;
}

const EXAMPLE_PROMPTS: string[] = [];

export function FileChat({ onFilesChanged, onFileSelect }: FileChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
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
      };

      setMessages([...updatedMessages, assistantMessage]);

      // If actions were taken, refresh the file list
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

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 px-3 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
              AI Archive Assistant
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Find and organize your files using natural language.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-3 pb-3 pt-3 dark:border-zinc-800">
          <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your files..."
              className="min-h-[36px] max-h-[150px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
              rows={1}
            />
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
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
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

                {/* File results grid */}
                {message.fileResults && message.fileResults.length > 0 && (
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
                          <div className="p-1.5 space-y-0.5">
                            <p className="truncate text-[11px] font-medium text-zinc-950 dark:text-white">
                              {file.name}
                            </p>
                            {file.tags.length > 0 && (
                              <div className="flex flex-wrap gap-0.5">
                                {file.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] text-violet-600 dark:bg-violet-950 dark:text-violet-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {file.tags.length > 2 && (
                                  <span className="text-[9px] text-zinc-400">
                                    +{file.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {message.actionsTaken && message.actionsTaken.length > 0 && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    {message.actionsTaken.length} action{message.actionsTaken.length > 1 ? "s" : ""} taken
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

      <div className="border-t border-zinc-200 px-3 pb-3 pt-3 dark:border-zinc-800">
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your files..."
            disabled={isLoading}
            className="min-h-[36px] max-h-[150px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon-sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
