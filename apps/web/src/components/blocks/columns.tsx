import Link from "next/link";
import { BlockIcon } from "./block-icon";
import { getBlockBackgroundProps } from "./block-helpers";

interface ColumnItem {
  heading?: string;
  text?: string;
  image?: string;
  imageSize?: "sm" | "md" | "lg" | "full";
  imageShape?: "auto" | "circle" | "rounded";
  icon?: string;
  textAlign?: "left" | "center" | "right";
  list?: string[];
  cta?: { label: string; href: string };
}

interface ColumnsData {
  heading?: string;
  subheading?: string;
  columns?: 2 | 3 | 4;
  layout?: "equal" | "wide-left" | "wide-right";
  gap?: "sm" | "md" | "lg";
  verticalAlign?: "top" | "center" | "bottom";
  items: ColumnItem[];
  background?: string;
}

const IMAGE_SIZE_CLASSES = {
  sm: "max-w-[150px]",
  md: "max-w-[250px]",
  lg: "max-w-[350px]",
  full: "w-full",
};

const VALIGN_CLASSES = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

const TEXT_ALIGN_CLASSES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function ColumnsBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as ColumnsData;
  const columns = block.columns || 2;
  const layout = block.layout || "equal";
  const gap = block.gap || "md";
  const verticalAlign = block.verticalAlign || "top";
  const bgProps = getBlockBackgroundProps(block.background || "default");

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
    <section className={bgProps.className} style={bgProps.style}>
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

        <div className={`grid grid-cols-1 ${gapClass} ${gridClass} ${VALIGN_CLASSES[verticalAlign]}`}>
          {block.items?.map((item, index) => {
            const align = item.textAlign || "left";
            const imageSize = item.imageSize || "full";
            const imageShape = item.imageShape || "auto";

            const imageShapeClass =
              imageShape === "circle"
                ? "rounded-full aspect-square object-cover"
                : imageShape === "rounded"
                  ? "rounded-lg"
                  : "";

            const imageContainerStyle =
              imageShape === "circle"
                ? { borderRadius: "9999px" }
                : { borderRadius: "var(--radius-card)" };

            return (
              <div key={index} className={`flex flex-col gap-4 ${TEXT_ALIGN_CLASSES[align]}`}>
                {/* Image */}
                {item.image && (
                  <div
                    className={`overflow-hidden ${IMAGE_SIZE_CLASSES[imageSize]} ${align === "center" ? "mx-auto" : ""}`}
                    style={imageContainerStyle}
                  >
                    <img
                      src={item.image}
                      alt={item.heading || ""}
                      className={`h-auto w-full object-cover ${imageShapeClass}`}
                    />
                  </div>
                )}

                {/* Icon */}
                {item.icon && (
                  <div className={`icon-container ${align === "center" ? "mx-auto" : ""}`}>
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
                  item.text.includes("<") ? (
                    <div
                      className="text-[var(--color-on-surface-secondary)] leading-relaxed prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  ) : (
                    <p className="text-[var(--color-on-surface-secondary)] leading-relaxed">
                      {item.text}
                    </p>
                  )
                )}

                {/* List */}
                {item.list && item.list.length > 0 && (
                  <ul className={`space-y-2 ${align === "center" ? "inline-block text-left" : ""}`}>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
