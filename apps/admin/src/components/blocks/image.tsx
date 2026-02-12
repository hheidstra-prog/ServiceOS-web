import Image from "next/image";

interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
  fullWidth?: boolean;
}

export function ImageBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as ImageData;

  if (block.fullWidth) {
    return (
      <section className="relative">
        <div className="relative aspect-[21/9] w-full">
          <Image
            src={block.src}
            alt={block.alt || ""}
            fill
            className="object-cover"
          />
        </div>
        {block.caption && (
          <p className="mt-2 text-center text-sm text-[var(--color-on-surface-muted)]">{block.caption}</p>
        )}
      </section>
    );
  }

  return (
    <section className="section-padding bg-[var(--color-surface)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative aspect-video w-full overflow-hidden"
          style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}
        >
          <Image
            src={block.src}
            alt={block.alt || ""}
            fill
            className="object-cover"
          />
        </div>
        {block.caption && (
          <p className="mt-4 text-center text-sm text-[var(--color-on-surface-muted)]">{block.caption}</p>
        )}
      </div>
    </section>
  );
}
