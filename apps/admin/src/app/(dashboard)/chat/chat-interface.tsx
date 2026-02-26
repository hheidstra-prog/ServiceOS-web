"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createConversation, sendMessage } from "./actions";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: Date;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  initialMessages: Message[];
  suggestedPrompts: string[];
}

export function ChatInterface({
  conversationId,
  initialMessages,
  suggestedPrompts,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleSubmit = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: content.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let activeConversationId = conversationId;

      // Create new conversation if needed
      if (!activeConversationId) {
        const conversation = await createConversation();
        activeConversationId = conversation.id;
        router.push(`/chat?id=${activeConversationId}`);
      }

      // Send message and get response
      await sendMessage(activeConversationId, content.trim());

      // Refresh to get new messages
      router.refresh();
    } catch {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSubmit(prompt);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState
            suggestedPrompts={suggestedPrompts}
            onPromptClick={handlePromptClick}
          />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    <span className="text-sm text-zinc-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-950/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-end gap-2 rounded-xl border border-zinc-950/10 bg-zinc-50 p-2 dark:border-white/10 dark:bg-zinc-900">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your business..."
              className="min-h-[44px] max-h-[200px] flex-1 resize-none border-0 bg-transparent p-2 focus-visible:ring-0"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            AI assistant is in preview. Responses are simulated.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-zinc-200 dark:bg-zinc-700"
            : "bg-gradient-to-br from-violet-500 to-pink-500"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            : "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MessageContent content={message.content} />
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like parsing for bold text and lists
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Bold text
        const boldParsed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // List items
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span>•</span>
              <span dangerouslySetInnerHTML={{ __html: boldParsed.slice(2) }} />
            </div>
          );
        }

        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: boldParsed }} />
        );
      })}
    </div>
  );
}

function EmptyState({
  suggestedPrompts,
  onPromptClick,
}: {
  suggestedPrompts: string[];
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-zinc-950 dark:text-white">
        How can I help you today?
      </h2>
      <p className="mt-2 max-w-md text-center text-zinc-500 dark:text-zinc-400">
        I&apos;m your AI assistant for Servible. Ask me about clients, invoices,
        bookings, or anything else related to your business.
      </p>

      {suggestedPrompts.length > 0 && (
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onPromptClick(prompt)}
              className="rounded-lg border border-zinc-950/10 bg-white px-4 py-3 text-left text-sm text-zinc-950 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
