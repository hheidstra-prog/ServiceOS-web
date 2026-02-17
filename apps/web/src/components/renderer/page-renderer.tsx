import { HeroBlock } from "@/components/blocks/hero";
import { TextBlock } from "@/components/blocks/text";
import { ServicesBlock } from "@/components/blocks/services";
import { CTABlock } from "@/components/blocks/cta";
import { ContactBlock } from "@/components/blocks/contact";
import { TestimonialsBlock } from "@/components/blocks/testimonials";
import { FeaturesBlock } from "@/components/blocks/features";
import { ImageBlock } from "@/components/blocks/image";
import { StatsBlock } from "@/components/blocks/stats";
import { FaqBlock } from "@/components/blocks/faq";
import { ProcessBlock } from "@/components/blocks/process";
import { PricingBlock } from "@/components/blocks/pricing";
import { LogosBlock } from "@/components/blocks/logos";
import { ColumnsBlock } from "@/components/blocks/columns";

interface Block {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface PageContent {
  blocks: Block[];
}

const BLOCK_COMPONENTS: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  hero: HeroBlock,
  text: TextBlock,
  services: ServicesBlock,
  cta: CTABlock,
  contact: ContactBlock,
  testimonials: TestimonialsBlock,
  features: FeaturesBlock,
  image: ImageBlock,
  stats: StatsBlock,
  faq: FaqBlock,
  process: ProcessBlock,
  pricing: PricingBlock,
  logos: LogosBlock,
  columns: ColumnsBlock,
};

interface PageRendererProps {
  content: Record<string, unknown>;
}

export function PageRenderer({ content }: PageRendererProps) {
  const pageContent = content as unknown as PageContent;

  if (!pageContent?.blocks || !Array.isArray(pageContent.blocks)) {
    return null;
  }

  return (
    <div className="page-content bg-[var(--color-surface)]">
      {pageContent.blocks.map((block) => {
        const BlockComponent = BLOCK_COMPONENTS[block.type];

        if (!BlockComponent) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        return <BlockComponent key={block.id} data={block.data} />;
      })}
    </div>
  );
}
