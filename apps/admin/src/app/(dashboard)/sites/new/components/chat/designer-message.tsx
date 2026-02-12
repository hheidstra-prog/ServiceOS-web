"use client";

import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignerMessage } from "../../types";
import { SitePreviewCard } from "./site-preview-card";

interface DesignerMessageBubbleProps {
  message: DesignerMessage;
}

export function DesignerMessageBubble({ message }: DesignerMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-zinc-200 dark:bg-zinc-700"
            : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>

      <div className={cn("max-w-[80%] space-y-2", isUser && "items-end")}>
        {/* Image thumbnails */}
        {message.images && message.images.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", isUser && "justify-end")}>
            {message.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt="Uploaded reference"
                className="h-24 w-24 rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {/* Text bubble */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3",
              isUser
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
            )}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              <MessageContent content={message.content} />
            </div>
          </div>
        )}

        {/* Site reference cards */}
        {message.references && message.references.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {message.references.map((ref, i) => (
              <SitePreviewCard key={i} reference={ref} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple bold parsing
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
