"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { aiChatEditBlock } from "../../../actions";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  appliedUpdate?: boolean;
}

interface Block {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface BlockChatProps {
  block: Block;
  siteId: string;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onBlockUpdate: (data: Record<string, unknown>) => void;
}

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  hero: [
    "Make the heading more compelling",
    "Add a badge above the heading",
    "Change the CTA to something more action-oriented",
  ],
  features: [
    "Add a 4th feature about security",
    "Make the descriptions more benefit-focused",
    "Change the icons to be more relevant",
  ],
  testimonials: [
    "Make the testimonials sound more authentic",
    "Add a new testimonial from a CEO",
    "Shorten the quotes to be punchier",
  ],
  cta: [
    "Make the heading create more urgency",
    "Add a secondary CTA button",
    "Switch to a gradient variant",
  ],
  services: [
    "Add pricing to each service",
    "Make the descriptions more detailed",
    "Add a new premium service tier",
  ],
  text: [
    "Make the content more engaging",
    "Add a heading to this section",
    "Shorten the text to key points",
  ],
  stats: [
    "Make the numbers more impressive",
    "Add a stat about customer satisfaction",
    "Change to a gradient variant",
  ],
  faq: [
    "Add a question about pricing",
    "Make the answers more detailed",
    "Reorder with most common questions first",
  ],
  pricing: [
    "Add a free tier",
    "Highlight the middle plan",
    "Add more features to differentiate plans",
  ],
  process: [
    "Add a step for onboarding",
    "Make the descriptions clearer",
    "Add icons to each step",
  ],
};

function getExamplePrompts(blockType: string): string[] {
  return EXAMPLE_PROMPTS[blockType] || [
    "Improve the content",
    "Make it more engaging",
    "What fields can I change?",
  ];
}

export function BlockChat({
  block,
  siteId,
  messages,
  onMessagesChange,
  onBlockUpdate,
}: BlockChatProps) {
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
    onMessagesChange(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await aiChatEditBlock(siteId, {
        blockType: block.type,
        currentData: block.data,
        messages: conversationHistory,
      });

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: result.content,
        timestamp: Date.now(),
        appliedUpdate: !!result.updatedData,
      };

      onMessagesChange([...updatedMessages, assistantMessage]);

      if (result.updatedData) {
        onBlockUpdate(result.updatedData);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to get AI response"
      );
      // Remove the user message on failure
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
    const examples = getExamplePrompts(block.type);
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 px-3 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
              AI Block Editor
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Describe changes to this {block.type} block in natural language.
            </p>
            <div className="mt-4 w-full space-y-2">
              {examples.map((prompt) => (
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
          <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your changes... e.g. rewrite the heading to be punchier, and change the background to a dark gradient"
              className="min-h-[60px] max-h-[200px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
              rows={3}
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
              {/* Avatar */}
              {message.role === "assistant" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Bubble */}
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
                {message.appliedUpdate && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    Block updated
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
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
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your changes..."
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
