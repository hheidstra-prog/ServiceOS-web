"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Loader2, Send, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { chatCreateBlogPost } from "./actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  postId?: string;
}

const EXAMPLE_PROMPTS = [
  "Help me brainstorm blog topics",
  "Write a post about our latest services",
  "I want to write about industry trends",
];

export function BlogCreationChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
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

      const result = await chatCreateBlogPost(conversationHistory);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: result.content,
        timestamp: Date.now(),
        postId: result.postId,
      };

      setMessages([...updatedMessages, assistantMessage]);

      if (result.postId) {
        setCreatedPostId(result.postId);
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

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-zinc-950 dark:text-white">
              Create a Blog Post
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Tell me what you&apos;d like to write about. I&apos;ll help you brainstorm, outline, and
              draft your post.
            </p>
            <div className="mt-6 space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl border-t border-zinc-200 px-4 pb-6 pt-4 dark:border-zinc-800">
          <div className="flex items-end gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to write about?"
              className="min-h-[48px] max-h-[200px] flex-1 resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0"
              rows={2}
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}

              <div className="flex max-w-[80%] flex-col gap-2">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.postId && (
                  <Button asChild size="sm" className="w-fit">
                    <Link href={`/blog/${message.postId}`}>
                      Open in Editor
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                <span className="text-sm text-zinc-500">Writing...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Created Post Banner */}
      {createdPostId && (
        <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Blog post created successfully!
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/blog/${createdPostId}`}>
                Open in Editor
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="mx-auto w-full max-w-2xl border-t border-zinc-200 px-4 pb-6 pt-4 dark:border-zinc-800">
        <div className="flex items-end gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={createdPostId ? "Continue the conversation..." : "Describe your blog post idea..."}
            disabled={isLoading}
            className="min-h-[40px] max-h-[200px] flex-1 resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
