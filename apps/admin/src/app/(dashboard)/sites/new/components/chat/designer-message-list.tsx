"use client";

import { useRef, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { DesignerMessage } from "../../types";
import { DesignerMessageBubble } from "./designer-message";

interface DesignerMessageListProps {
  messages: DesignerMessage[];
  isLoading: boolean;
}

export function DesignerMessageList({
  messages,
  isLoading,
}: DesignerMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {messages.map((message) => (
          <DesignerMessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              <span className="text-sm text-zinc-500">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
