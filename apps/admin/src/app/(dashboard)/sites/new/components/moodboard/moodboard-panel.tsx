"use client";

import { Palette } from "lucide-react";
import type { Moodboard, DesignerAction } from "../../types";
import { ColorPaletteCard } from "./color-palette-card";
import { TypographyCard } from "./typography-card";
import { StyleKeywordTag } from "./style-keyword-tag";
import { UploadedImageCard } from "./uploaded-image-card";
import { DesignDirectionSummary } from "./design-direction-summary";

interface MoodboardPanelProps {
  moodboard: Moodboard;
  isGenerating: boolean;
  dispatch: React.Dispatch<DesignerAction>;
  onGenerate: () => void;
}

export function MoodboardPanel({
  moodboard,
  isGenerating,
  dispatch,
  onGenerate,
}: MoodboardPanelProps) {
  const { items, designDirection } = moodboard;

  const palettes = items.filter((i) => i.type === "color_palette");
  const typography = items.filter((i) => i.type === "typography");
  const keywords = items.filter((i) => i.type === "style_keyword");
  const images = items.filter((i) => i.type === "uploaded_image");
  const layouts = items.filter((i) => i.type === "layout_preference");
  const tokens = items.filter((i) => i.type === "design_token");

  const isEmpty = items.length === 0 && !designDirection;

  const handleRemove = (id: string) => {
    dispatch({ type: "REMOVE_MOODBOARD_ITEM", id });
  };

  const handleTogglePin = (id: string) => {
    dispatch({ type: "TOGGLE_PIN_ITEM", id });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Palette className="h-4 w-4 text-violet-500" />
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Moodboard
        </h2>
        {items.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
              <Palette className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Your moodboard is empty
            </p>
            <p className="mt-1 max-w-[200px] text-xs text-zinc-400 dark:text-zinc-500">
              Chat with the AI designer and it will build your moodboard as you go
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Design Direction (top priority) */}
            {designDirection && (
              <DesignDirectionSummary
                direction={designDirection}
                isGenerating={isGenerating}
                onGenerate={onGenerate}
              />
            )}

            {/* Color Palettes */}
            {palettes.length > 0 && (
              <Section title="Colors">
                <div className="space-y-2">
                  {palettes.map((item) =>
                    item.type === "color_palette" ? (
                      <ColorPaletteCard
                        key={item.id}
                        id={item.id}
                        colors={item.colors}
                        name={item.name}
                        pinned={item.pinned}
                        onRemove={handleRemove}
                        onTogglePin={handleTogglePin}
                      />
                    ) : null
                  )}
                </div>
              </Section>
            )}

            {/* Typography */}
            {typography.length > 0 && (
              <Section title="Typography">
                <div className="space-y-2">
                  {typography.map((item) =>
                    item.type === "typography" ? (
                      <TypographyCard
                        key={item.id}
                        id={item.id}
                        heading={item.heading}
                        body={item.body}
                        vibe={item.vibe}
                        pinned={item.pinned}
                        onRemove={handleRemove}
                        onTogglePin={handleTogglePin}
                      />
                    ) : null
                  )}
                </div>
              </Section>
            )}

            {/* Style Keywords */}
            {keywords.length > 0 && (
              <Section title="Style">
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((item) =>
                    item.type === "style_keyword" ? (
                      <StyleKeywordTag
                        key={item.id}
                        id={item.id}
                        keyword={item.keyword}
                        category={item.category}
                        onRemove={handleRemove}
                      />
                    ) : null
                  )}
                </div>
              </Section>
            )}

            {/* Uploaded Images */}
            {images.length > 0 && (
              <Section title="Reference Images">
                <div className="grid grid-cols-2 gap-2">
                  {images.map((item) =>
                    item.type === "uploaded_image" ? (
                      <UploadedImageCard
                        key={item.id}
                        id={item.id}
                        url={item.url}
                        filename={item.filename}
                        analysis={item.analysis}
                        pinned={item.pinned}
                        onRemove={handleRemove}
                        onTogglePin={handleTogglePin}
                      />
                    ) : null
                  )}
                </div>
              </Section>
            )}

            {/* Layout Preferences */}
            {layouts.length > 0 && (
              <Section title="Layout">
                <div className="space-y-1">
                  {layouts.map((item) =>
                    item.type === "layout_preference" ? (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-md bg-zinc-50 px-2.5 py-1.5 text-xs dark:bg-zinc-800/50"
                      >
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {item.key}
                        </span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {item.value}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              </Section>
            )}

            {/* Design Tokens */}
            {tokens.length > 0 && (
              <Section title="Design Tokens">
                <div className="space-y-1">
                  {tokens.map((item) =>
                    item.type === "design_token" ? (
                      <div
                        key={item.id}
                        className="rounded-md bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/50"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <code className="text-violet-600 dark:text-violet-400">
                            {item.token}
                          </code>
                          <code className="font-mono text-[10px] text-zinc-500">
                            {item.value}
                          </code>
                        </div>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {item.description}
                        </p>
                      </div>
                    ) : null
                  )}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {title}
      </h3>
      {children}
    </div>
  );
}
