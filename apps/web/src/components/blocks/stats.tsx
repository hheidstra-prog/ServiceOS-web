interface Stat {
  value: string;
  label: string;
}

interface StatsData {
  heading?: string;
  stats: Stat[];
  variant?: "default" | "gradient" | "cards";
}

export function StatsBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as StatsData;
  const variant = block.variant || "default";

  if (variant === "gradient") {
    return (
      <section className="section-padding" style={{ background: "var(--gradient-accent)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {block.heading && (
            <h2 className="section-heading !text-white text-center mb-10">{block.heading}</h2>
          )}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {block.stats?.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-bold text-white sm:text-5xl">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "cards") {
    return (
      <section className="section-padding bg-[var(--color-surface-alt)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {block.heading && (
            <h2 className="section-heading text-center mb-10">{block.heading}</h2>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {block.stats?.map((stat, i) => (
              <div key={i} className="card-base text-center">
                <p className="text-3xl font-bold text-[var(--color-on-surface)] sm:text-4xl">{stat.value}</p>
                <p className="mt-2 text-sm text-[var(--color-on-surface-secondary)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default: full-width band
  return (
    <section className="section-padding bg-[var(--color-surface-alt)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {block.heading && (
          <h2 className="section-heading text-center mb-10">{block.heading}</h2>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {block.stats?.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-bold text-[var(--color-on-surface)] sm:text-5xl">{stat.value}</p>
              <p className="mt-2 text-sm text-[var(--color-on-surface-secondary)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
