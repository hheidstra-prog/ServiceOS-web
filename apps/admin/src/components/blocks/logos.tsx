import Image from "next/image";
import { getBlockBackgroundProps } from "./block-helpers";

interface Logo {
  name: string;
  src?: string;
}

interface LogosData {
  heading?: string;
  logos: Logo[];
  background?: string;
}

export function LogosBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as LogosData;
  const bg = getBlockBackgroundProps(block.background || "default");

  return (
    <section className={bg.className} style={bg.style}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {block.heading && (
          <p className="text-center text-sm font-medium uppercase tracking-wider text-[var(--color-on-surface-muted)] mb-8">
            {block.heading}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {block.logos?.map((logo, index) => (
            <div
              key={index}
              className="opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              style={{ transitionDuration: "var(--transition-duration)" }}
            >
              {logo.src ? (
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={120}
                  height={40}
                  className="h-8 w-auto object-contain sm:h-10"
                />
              ) : (
                <span className="text-lg font-semibold text-[var(--color-on-surface-muted)]">
                  {logo.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
