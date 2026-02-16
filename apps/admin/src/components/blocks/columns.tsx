import Link from "./preview-link";
import { BlockIcon } from "./block-icon";

interface ColumnItem {
  heading?: string;
  text?: string;
  image?: string;
  icon?: string;
  list?: string[];
  cta?: { label: string; href: string };
}

interface ColumnsData {
  heading?: string;
  subheading?: string;
  columns?: 2 | 3 | 4;
  layout?: "equal" | "wide-left" | "wide-right";
  gap?: "sm" | "md" | "lg";
  items: ColumnItem[];
}

export function ColumnsBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as ColumnsData;
  const columns = block.columns || 2;
  const layout = block.layout || "equal";
  const gap = block.gap || "md";

  const gapClass = {
    sm: "gap-4",
    md: "gap-8",
    lg: "gap-12",
  }[gap];

  // For equal layouts, use standard grid columns
  const equalGridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  // For wide-left / wide-right, use asymmetric grid (only 2-col)
  const asymmetricGrid =
    layout === "wide-left"
      ? "md:grid-cols-[2fr_1fr]"
      : layout === "wide-right"
        ? "md:grid-cols-[1fr_2fr]"
        : undefined;

  const gridClass = asymmetricGrid || equalGridCols;

  return (
    <section className="section-padding bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(block.heading || block.subheading) && (
          <div className="text-center mb-12">
            {block.heading && (
              <h2 className="section-heading">{block.heading}</h2>
            )}
            {block.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">
                {block.subheading}
              </p>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 ${gapClass} ${gridClass}`}>
          {block.items?.map((item, index) => (
            <div key={index} className="flex flex-col gap-4">
              {/* Image */}
              {item.image && (
                <div
                  className="overflow-hidden"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <img
                    src={item.image}
                    alt={item.heading || ""}
                    className="h-auto w-full object-cover"
                  />
                </div>
              )}

              {/* Icon */}
              {item.icon && (
                <div className="icon-container">
                  <BlockIcon name={item.icon} className="h-5 w-5" />
                </div>
              )}

              {/* Heading */}
              {item.heading && (
                <h3 className="text-xl font-semibold text-[var(--color-on-surface)]">
                  {item.heading}
                </h3>
              )}

              {/* Text */}
              {item.text && (
                <p className="text-[var(--color-on-surface-secondary)] leading-relaxed">
                  {item.text}
                </p>
              )}

              {/* List */}
              {item.list && item.list.length > 0 && (
                <ul className="space-y-2">
                  {item.list.map((li, liIdx) => (
                    <li
                      key={liIdx}
                      className="flex items-start gap-2 text-[var(--color-on-surface-secondary)]"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--color-primary-500)" }}
                      />
                      {li}
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA */}
              {item.cta && (
                <div>
                  <Link href={item.cta.href} className="btn-primary">
                    {item.cta.label}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
