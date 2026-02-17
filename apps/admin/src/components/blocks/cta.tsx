import Link from "./preview-link";

interface CTAData {
  heading: string;
  subheading?: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  ctaText?: string;
  ctaLink?: string;
  style?: string;
  variant?: "default" | "dark" | "gradient";
}

export function CTABlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const cta = data as unknown as CTAData;
  const variant = cta.variant || (cta.style as CTAData["variant"]) || "default";

  const primaryLabel = cta.primaryCta?.label || cta.ctaText;
  const primaryHref = cta.primaryCta?.href || cta.ctaLink || "/contact";
  const description = cta.description || cta.subheading;

  if (variant === "gradient") {
    return (
      <section className="section-padding" style={{ background: "var(--gradient-accent)", "--btn-primary-bg": "white", "--btn-primary-color": "var(--color-primary-700)" } as React.CSSProperties}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-heading !text-white">{cta.heading}</h2>
          {description && <p className="mt-4 text-lg text-white/80">{description}</p>}
          {primaryLabel && (
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href={primaryHref} className="btn-primary">
                {primaryLabel}
              </Link>
              {cta.secondaryCta && (
                <Link href={cta.secondaryCta.href} className="btn-secondary !border-white/30 !text-white hover:!bg-white/10">
                  {cta.secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (variant === "dark") {
    return (
      <section className="section-padding bg-[var(--color-primary-900)]" style={{ "--btn-primary-bg": "white", "--btn-primary-color": "var(--color-primary-700)" } as React.CSSProperties}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-heading !text-white">{cta.heading}</h2>
          {description && <p className="mt-4 text-lg text-white/80">{description}</p>}
          {primaryLabel && (
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href={primaryHref} className="btn-primary">
                {primaryLabel}
              </Link>
              {cta.secondaryCta && (
                <Link href={cta.secondaryCta.href} className="btn-secondary !border-white/30 !text-white hover:!bg-white/10">
                  {cta.secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Default variant
  return (
    <section className="section-padding bg-[var(--color-surface-alt)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="section-heading">{cta.heading}</h2>
        {description && (
          <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{description}</p>
        )}
        {primaryLabel && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href={primaryHref} className="btn-primary">
              {primaryLabel}
            </Link>
            {cta.secondaryCta && (
              <Link href={cta.secondaryCta.href} className="btn-secondary">
                {cta.secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
