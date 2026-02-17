"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getBlockBackgroundProps } from "./block-helpers";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqData {
  heading?: string;
  subheading?: string;
  items: FaqItem[];
  background?: string;
}

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className="border-b border-[var(--color-border)]"
      style={{ transition: `all var(--transition-duration) var(--transition-timing)` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-[var(--color-on-surface)]">
          {item.question}
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-[var(--color-on-surface-muted)]"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform var(--transition-duration) var(--transition-timing)`,
          }}
        />
      </button>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: isOpen ? "500px" : "0",
          opacity: isOpen ? 1 : 0,
          transition: `max-height var(--transition-duration) var(--transition-timing), opacity var(--transition-duration) var(--transition-timing)`,
        }}
      >
        <p className="pb-5 text-[var(--color-on-surface-secondary)]">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export function FaqBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as FaqData;
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set([0]));

  const toggleIndex = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const bg = getBlockBackgroundProps(block.background || "default");

  return (
    <section className={bg.className} style={bg.style}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {(block.heading || block.subheading) && (
          <div className="text-center mb-10">
            {block.heading && <h2 className="section-heading">{block.heading}</h2>}
            {block.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
            )}
          </div>
        )}
        <div className="border-t border-[var(--color-border)]">
          {block.items?.map((item, index) => (
            <FaqAccordion
              key={index}
              item={item}
              isOpen={openIndexes.has(index)}
              onToggle={() => toggleIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
