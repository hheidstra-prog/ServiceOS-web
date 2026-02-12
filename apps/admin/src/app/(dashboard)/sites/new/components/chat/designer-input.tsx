"use client";

import { useRef, useEffect } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DesignerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachImage: () => void;
  attachedImages: string[];
  onRemoveImage: (url: string) => void;
  disabled: boolean;
}

export function DesignerInput({
  value,
  onChange,
  onSend,
  onAttachImage,
  attachedImages,
  onRemoveImage,
  disabled,
}: DesignerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() || attachedImages.length > 0) {
        onSend();
      }
    }
  };

  return (
    <div className="border-t border-zinc-200 bg-white px-4 pb-10 pt-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        {/* Attached image previews */}
        {attachedImages.length > 0 && (
          <div className="mb-2 flex gap-2">
            {attachedImages.map((url) => (
              <div key={url} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Attached"
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  onClick={() => onRemoveImage(url)}
                  className="absolute -right-1 -top-1 rounded-full bg-zinc-900 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white dark:text-zinc-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="relative flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onAttachImage}
            disabled={disabled}
            className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your style preferences..."
            className="min-h-[44px] max-h-[150px] flex-1 resize-none border-0 bg-transparent p-2 focus-visible:ring-0"
            rows={1}
            disabled={disabled}
          />

          <Button
            size="icon"
            onClick={onSend}
            disabled={disabled || (!value.trim() && attachedImages.length === 0)}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
