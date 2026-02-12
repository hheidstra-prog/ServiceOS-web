"use client";

import { Layers, Plus } from "lucide-react";
import { HeroBlock } from "@/components/blocks/hero";
import { TextBlock } from "@/components/blocks/text";
import { FeaturesBlock } from "@/components/blocks/features";
import { ServicesBlock } from "@/components/blocks/services";
import { TestimonialsBlock } from "@/components/blocks/testimonials";
import { CTABlock } from "@/components/blocks/cta";
import { ContactBlock } from "@/components/blocks/contact";
import { ImageBlock } from "@/components/blocks/image";
import { StatsBlock } from "@/components/blocks/stats";
import { FaqBlock } from "@/components/blocks/faq";
import { ProcessBlock } from "@/components/blocks/process";
import { PricingBlock } from "@/components/blocks/pricing";
import { LogosBlock } from "@/components/blocks/logos";
import { BlockOverlay } from "./block-overlay";
import { buildThemeVars, getGoogleFontsUrl, type SiteTheme } from "./preview-theme";
import "./block-preview.css";

interface Block {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface BlockPreviewRendererProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onDeselectBlock: () => void;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onDeleteBlock: (blockId: string) => void;
  onAddBlockAfter: (index: number) => void;
  siteTheme?: SiteTheme;
}

const BLOCK_COMPONENTS: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  hero: HeroBlock,
  text: TextBlock,
  features: FeaturesBlock,
  services: ServicesBlock,
  testimonials: TestimonialsBlock,
  cta: CTABlock,
  contact: ContactBlock,
  image: ImageBlock,
  stats: StatsBlock,
  faq: FaqBlock,
  process: ProcessBlock,
  pricing: PricingBlock,
  logos: LogosBlock,
};

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero",
  text: "Text",
  features: "Features",
  services: "Services",
  testimonials: "Testimonials",
  cta: "Call to Action",
  contact: "Contact",
  image: "Image",
  stats: "Stats",
  faq: "FAQ",
  process: "Process",
  pricing: "Pricing",
  logos: "Logos",
};

export function BlockPreviewRenderer({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeselectBlock,
  onMoveBlock,
  onDeleteBlock,
  onAddBlockAfter,
  siteTheme,
}: BlockPreviewRendererProps) {
  const colorMode = siteTheme?.theme?.colorMode || "light";
  const themeVars = siteTheme ? buildThemeVars(siteTheme) : {};
  const googleFontsUrl = siteTheme ? getGoogleFontsUrl(siteTheme) : null;

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
        <Layers className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
        <h3 className="mt-4 font-semibold text-zinc-950 dark:text-white">
          No blocks yet
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Add your first block to start building the page.
        </p>
        <button
          type="button"
          onClick={() => onAddBlockAfter(-1)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          Add Block
        </button>
      </div>
    );
  }

  return (
    <>
      {googleFontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={googleFontsUrl} />
      )}
      <div
        className="block-preview-scope overflow-hidden rounded-lg border border-zinc-200 bg-[var(--color-surface)] dark:border-zinc-800"
        data-color-mode={colorMode}
        style={themeVars}
        onClick={(e) => {
          // Click on background (outside any block) → deselect
          if (e.target === e.currentTarget) {
            onDeselectBlock();
          }
        }}
      >
        {blocks.map((block, index) => {
          const Component = BLOCK_COMPONENTS[block.type];
          if (!Component) return null;

          return (
            <BlockOverlay
              key={block.id}
              blockId={block.id}
              blockLabel={BLOCK_LABELS[block.type] || block.type}
              isSelected={selectedBlockId === block.id}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              onClick={() => onSelectBlock(block.id)}
              onMoveUp={() => onMoveBlock(block.id, "up")}
              onMoveDown={() => onMoveBlock(block.id, "down")}
              onDelete={() => onDeleteBlock(block.id)}
              onAddAfter={() => onAddBlockAfter(index)}
            >
              <Component data={block.data} />
            </BlockOverlay>
          );
        })}
      </div>
    </>
  );
}
