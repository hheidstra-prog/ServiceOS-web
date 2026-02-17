import { Check } from "lucide-react";
import { BlockIcon } from "./block-icon";
import { getBlockBackgroundProps } from "./block-helpers";

interface Feature {
  title: string;
  description: string;
  icon?: string;
}

interface FeaturesData {
  heading?: string;
  subheading?: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
  variant?: "cards" | "list" | "icons";
  background?: string;
}

export function FeaturesBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as FeaturesData;
  const columns = block.columns || 3;
  const variant = block.variant || "cards";
  const defaultBg = variant === "list" ? "default" : "muted";
  const bg = getBlockBackgroundProps(block.background || defaultBg);

  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  if (variant === "list") {
    return (
      <section className={bg.className} style={bg.style}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {(block.heading || block.subheading) && (
            <div className="text-center mb-12">
              {block.heading && <h2 className="section-heading">{block.heading}</h2>}
              {block.subheading && (
                <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
              )}
            </div>
          )}
          <ul className="space-y-4">
            {block.features?.map((feature, index) => (
              <li key={index} className="flex items-start gap-4">
                <div className="icon-container mt-0.5" style={{ width: "1.5rem", height: "1.5rem" }}>
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-on-surface)]">{feature.title}</p>
                  {feature.description && (
                    <p className="text-[var(--color-on-surface-secondary)]">{feature.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (variant === "icons") {
    return (
      <section className={bg.className} style={bg.style}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {(block.heading || block.subheading) && (
            <div className="text-center mb-12">
              {block.heading && <h2 className="section-heading">{block.heading}</h2>}
              {block.subheading && (
                <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
              )}
            </div>
          )}
          <div className={`grid gap-8 ${gridCols}`}>
            {block.features?.map((feature, index) => (
              <div key={index} className="text-center">
                {feature.icon && (
                  <div className="icon-container mx-auto mb-4">
                    <BlockIcon name={feature.icon} className="h-5 w-5" />
                  </div>
                )}
                <h3 className="font-semibold text-[var(--color-on-surface)]">{feature.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-on-surface-secondary)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Cards variant (default)
  return (
    <section className={bg.className} style={bg.style}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(block.heading || block.subheading) && (
          <div className="text-center mb-12">
            {block.heading && <h2 className="section-heading">{block.heading}</h2>}
            {block.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
            )}
          </div>
        )}
        <div className={`grid gap-8 ${gridCols}`}>
          {block.features?.map((feature, index) => (
            <div key={index} className="card-base card-interactive">
              {feature.icon && (
                <div className="icon-container mb-4">
                  <BlockIcon name={feature.icon} className="h-5 w-5" />
                </div>
              )}
              <h3 className="font-semibold text-[var(--color-on-surface)]">{feature.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-on-surface-secondary)]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
