import Link from "next/link";

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  description?: string;
  price: string;
  period?: string;
  features: (string | PricingFeature)[];
  ctaText?: string;
  ctaLink?: string;
  highlighted?: boolean;
}

interface PricingData {
  heading?: string;
  subheading?: string;
  plans: PricingPlan[];
}

export function PricingBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as PricingData;
  const planCount = block.plans?.length || 3;
  const gridCols = planCount <= 2 ? "md:grid-cols-2 max-w-3xl" : "lg:grid-cols-3 max-w-6xl";

  return (
    <section className="section-padding bg-[var(--color-surface-alt)]">
      <div className={`mx-auto ${gridCols} px-4 sm:px-6 lg:px-8`}>
        {(block.heading || block.subheading) && (
          <div className="text-center mb-12" style={{ gridColumn: "1 / -1" }}>
            {block.heading && <h2 className="section-heading">{block.heading}</h2>}
            {block.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
            )}
          </div>
        )}

        <div className={`grid gap-8 ${gridCols}`}>
          {block.plans?.map((plan, index) => (
            <div
              key={index}
              className={`card-base relative flex flex-col ${
                plan.highlighted
                  ? "ring-2 ring-[var(--color-primary-500)]"
                  : ""
              }`}
              style={plan.highlighted ? { boxShadow: "var(--glow-card-hover, var(--shadow-card-hover))" } : undefined}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold text-white"
                  style={{ background: "var(--gradient-primary)", borderRadius: "var(--radius-badge)" }}
                >
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-sm text-[var(--color-on-surface-secondary)]">{plan.description}</p>
                )}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-[var(--color-on-surface)]">{plan.price}</span>
                {plan.period && (
                  <span className="text-[var(--color-on-surface-muted)]"> / {plan.period}</span>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features?.map((feature, i) => {
                  const text = typeof feature === "string" ? feature : feature.text;
                  const included = typeof feature === "string" ? true : feature.included;
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-0.5 text-sm ${included ? "text-[var(--color-primary-500)]" : "text-[var(--color-on-surface-muted)]"}`}>
                        {included ? "✓" : "—"}
                      </span>
                      <span className={`text-sm ${included ? "text-[var(--color-on-surface-secondary)]" : "text-[var(--color-on-surface-muted)]"}`}>
                        {text}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Link
                href={plan.ctaLink || "/contact"}
                className={plan.highlighted ? "btn-primary w-full text-center" : "btn-secondary w-full text-center"}
              >
                {plan.ctaText || "Get Started"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
