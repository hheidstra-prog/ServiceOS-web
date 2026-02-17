import Link from "next/link";
import Image from "next/image";

interface HeroStat {
  value: string;
  label: string;
}

interface HeroData {
  variant?: "centered" | "split" | "minimal" | "left" | "background";
  heading: string;
  subheading?: string;
  description?: string;
  badge?: string;
  highlightWord?: string;
  stats?: HeroStat[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  image?: string;
}

function renderHeading(heading: string, highlightWord?: string, extraClass?: string) {
  if (!highlightWord) {
    return <span>{heading}</span>;
  }
  const index = heading.toLowerCase().indexOf(highlightWord.toLowerCase());
  if (index === -1) return <span>{heading}</span>;

  const before = heading.slice(0, index);
  const match = heading.slice(index, index + highlightWord.length);
  const after = heading.slice(index + highlightWord.length);

  return (
    <span>
      {before}
      <span className={`gradient-text ${extraClass || ""}`}>{match}</span>
      {after}
    </span>
  );
}

function StatsRow({ stats }: { stats: HeroStat[] }) {
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-8 border-t border-[var(--color-border)] pt-8 sm:gap-12">
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <p className="text-2xl font-bold text-[var(--color-on-surface)] sm:text-3xl">{stat.value}</p>
          <p className="mt-1 text-sm text-[var(--color-on-surface-muted)]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function HeroBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const hero = data as unknown as HeroData;
  const variant = hero.variant || "centered";

  const primaryCta = hero.primaryCta || (hero.ctaText ? { label: hero.ctaText, href: hero.ctaLink || "/contact" } : undefined);
  const secondaryCta = hero.secondaryCta;

  if (variant === "split") {
    return (
      <section className="relative overflow-hidden bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="section-padding grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              {hero.badge && (
                <span className="mb-4 inline-block rounded-[var(--radius-badge)] bg-[var(--color-primary-100)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--color-primary-700)]">
                  {hero.badge}
                </span>
              )}
              <h1 className="hero-heading">
                {renderHeading(hero.heading, hero.highlightWord)}
              </h1>
              {hero.subheading && (
                <p className="mt-4 text-[length:var(--subheading-size)] font-medium text-[color:var(--color-primary-600)]">
                  {hero.subheading}
                </p>
              )}
              {hero.description && (
                <p className="mt-6 text-lg leading-relaxed text-[var(--color-on-surface-secondary)]">{hero.description}</p>
              )}
              {(primaryCta || secondaryCta) && (
                <div className="mt-8 flex flex-wrap gap-4">
                  {primaryCta && (
                    <Link href={primaryCta.href} className="btn-primary">
                      {primaryCta.label}
                    </Link>
                  )}
                  {secondaryCta && (
                    <Link href={secondaryCta.href} className="btn-secondary">
                      {secondaryCta.label}
                    </Link>
                  )}
                </div>
              )}
              {hero.stats && hero.stats.length > 0 && <StatsRow stats={hero.stats} />}
            </div>
            {hero.image && (
              <div className="relative aspect-square lg:aspect-[4/3]">
                <Image
                  src={hero.image}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ borderRadius: "var(--radius-card)" }}
                  priority
                />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "background" || hero.backgroundImage) {
    return (
      <section
        className="relative overflow-hidden bg-[var(--color-primary-900)]"
        style={{
          ...(hero.backgroundImage
            ? { backgroundImage: `url(${hero.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
            : {}),
          "--btn-primary-bg": "white",
          "--btn-primary-color": "var(--color-primary-700)",
        } as React.CSSProperties}
      >
        <div className="absolute inset-0 bg-[var(--color-primary-950)]/70" />
        <div className="section-padding relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          {hero.badge && (
            <span className="mb-6 inline-block rounded-[var(--radius-badge)] border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white/80">
              {hero.badge}
            </span>
          )}
          <h1 className="hero-heading !text-white">
            {renderHeading(hero.heading, hero.highlightWord)}
          </h1>
          {hero.subheading && (
            <p className="mt-4 text-[length:var(--subheading-size)] font-medium text-[color:var(--color-primary-200)]">
              {hero.subheading}
            </p>
          )}
          {hero.description && (
            <p className="mt-6 mx-auto max-w-2xl text-lg text-white/80">{hero.description}</p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {primaryCta && (
                <Link href={primaryCta.href} className="btn-primary">
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link href={secondaryCta.href} className="btn-secondary !border-white/30 !text-white hover:!bg-white/10">
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
          {hero.stats && hero.stats.length > 0 && (
            <div className="mt-12 flex flex-wrap justify-center gap-8 border-t border-white/10 pt-8 sm:gap-12">
              {hero.stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Centered variant (default)
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="section-padding relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {hero.badge && (
          <span className="mb-6 inline-block rounded-[var(--radius-badge)] bg-[var(--color-primary-100)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--color-primary-700)]">
            {hero.badge}
          </span>
        )}
        <h1 className="hero-heading">
          {renderHeading(hero.heading, hero.highlightWord)}
        </h1>
        {hero.subheading && (
          <p className="mt-4 text-[length:var(--subheading-size)] font-medium text-[color:var(--color-primary-600)]">
            {hero.subheading}
          </p>
        )}
        {hero.description && (
          <p className="mt-6 mx-auto max-w-2xl text-lg text-[var(--color-on-surface-secondary)]">{hero.description}</p>
        )}
        {(primaryCta || secondaryCta) && (
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {primaryCta && (
              <Link href={primaryCta.href} className="btn-primary">
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href} className="btn-secondary">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
        {hero.stats && hero.stats.length > 0 && <StatsRow stats={hero.stats} />}
      </div>
    </section>
  );
}
