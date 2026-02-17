import { getBlockBackgroundProps } from "./block-helpers";

interface TextData {
  heading?: string;
  content: string;
  align?: "left" | "center" | "right";
  background?: string;
}

export function TextBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const text = data as unknown as TextData;
  const align = text.align || "left";

  const alignClass = {
    left: "text-left",
    center: "text-center mx-auto",
    right: "text-right",
  }[align];

  const bg = getBlockBackgroundProps(text.background || "default");

  return (
    <section className={bg.className} style={bg.style}>
      <div className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 ${alignClass}`}>
        {text.heading && <h2 className="section-heading">{text.heading}</h2>}
        <div
          className={`prose max-w-none ${text.heading ? "mt-6" : ""}`}
          style={{
            lineHeight: "var(--body-line-height)",
            "--tw-prose-body": "var(--color-on-surface-secondary)",
            "--tw-prose-headings": "var(--color-on-surface)",
            "--tw-prose-links": "var(--color-link)",
            "--tw-prose-bold": "var(--color-on-surface)",
            "--tw-prose-hr": "var(--color-border)",
            "--tw-prose-quotes": "var(--color-on-surface)",
            "--tw-prose-quote-borders": "var(--color-border)",
            "--tw-prose-code": "var(--color-on-surface)",
            "--tw-prose-pre-bg": "var(--color-surface-alt)",
          } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: text.content }}
        />
      </div>
    </section>
  );
}
