"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  chatBlogAssistant,
  type BlogPostResult,
} from "./blog-chat-actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actionsTaken?: string[];
  postResults?: BlogPostResult[];
  createdPostId?: string;
}

export interface BlogChatResultPayload {
  postResults: BlogPostResult[];
}

interface BlogChatProps {
  externalMessage?: string | null;
  onExternalMessageConsumed?: () => void;
  onResults?: (results: BlogChatResultPayload) => void;
  onPostCreated?: (postId: string) => void;
  initialPostResults?: BlogPostResult[];
  locale?: string;
}

const seedMessages: Record<string, (n: number) => string> = {
  nl: (n) => `Hier zijn je ${n} meest recente blogpost${n > 1 ? "s" : ""}. Vraag me om ze te filteren, te maken of te beheren.`,
  en: (n) => `Here are your ${n} most recent blog post${n > 1 ? "s" : ""}. Ask me to filter, create, or manage them.`,
  de: (n) => `Hier sind deine ${n} neuesten Blogbeiträge. Frag mich, um sie zu filtern, zu erstellen oder zu verwalten.`,
  fr: (n) => `Voici vos ${n} articles de blog les plus récents. Demandez-moi de les filtrer, créer ou gérer.`,
};

const STORAGE_KEY = "blog-chat-messages";

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

export function BlogChat({
  externalMessage,
  onExternalMessageConsumed,
  onResults,
  onPostCreated,
  initialPostResults,
  locale = "en",
}: BlogChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasRestoredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    // Only persist after initial restore to avoid overwriting with []
    if (!hasRestoredRef.current) return;
    saveMessages(messages);
  }, [messages]);

  // On mount, restore messages from sessionStorage and replay post results.
  // If no stored messages but initialPostResults are provided, inject a synthetic message.
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const restored = loadMessages();
    if (restored.length > 0) {
      setMessages(restored);
      if (onResults) {
        for (let i = restored.length - 1; i >= 0; i--) {
          if (restored[i].postResults && restored[i].postResults!.length > 0) {
            onResults({ postResults: restored[i].postResults! });
            break;
          }
        }
      }
    } else if (initialPostResults && initialPostResults.length > 0) {
      const n = initialPostResults.length;
      const getMessage = seedMessages[locale] || seedMessages.en;
      const synthetic: ChatMessage = {
        id: `msg-seed`,
        role: "assistant",
        content: getMessage(n),
        timestamp: Date.now(),
        postResults: initialPostResults,
      };
      setMessages([synthetic]);
      onResults?.({ postResults: initialPostResults });
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

  // Bridge external messages (chip clicks) into the chat
  useEffect(() => {
    if (externalMessage) {
      handleSend(externalMessage);
      onExternalMessageConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

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

      const result = await chatBlogAssistant(conversationHistory);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: result.content,
        timestamp: Date.now(),
        actionsTaken: result.actionsTaken,
        postResults: result.postResults,
        createdPostId: result.createdPostId,
      };

      setMessages([...updatedMessages, assistantMessage]);

      // Emit results to parent for the right panel
      if (onResults && result.postResults) {
        onResults({ postResults: result.postResults });
      }

      // Notify parent of created post
      if (result.createdPostId) {
        onPostCreated?.(result.createdPostId);
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
              Ask me to find, create, or manage your blog posts.
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

                  {/* Open in Editor link for created posts */}
                  {message.createdPostId && (
                    <Button asChild size="sm" className="w-fit">
                      <Link href={`/blog/${message.createdPostId}`}>
                        Open in Editor
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}

                  {/* Actions taken badge */}
                  {message.actionsTaken && message.actionsTaken.length > 0 && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <Sparkles className="h-2.5 w-2.5" />
                      {message.actionsTaken.length} action
                      {message.actionsTaken.length > 1 ? "s" : ""} taken
                    </span>
                  )}

                  {/* Result count hint (when results go to right panel) */}
                  {onResults &&
                    message.postResults &&
                    message.postResults.length > 0 && (
                      <span className="text-[10px] text-violet-500">
                        {message.postResults.length} post
                        {message.postResults.length > 1 ? "s" : ""} shown
                        &rarr;
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
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your blog..."
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
    </div>
  );
}
