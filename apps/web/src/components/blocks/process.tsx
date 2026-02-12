import { BlockIcon } from "./block-icon";

interface Step {
  title: string;
  description: string;
  icon?: string;
}

interface ProcessData {
  heading?: string;
  subheading?: string;
  steps: Step[];
}

export function ProcessBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as ProcessData;

  return (
    <section className="section-padding bg-[var(--color-surface)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {(block.heading || block.subheading) && (
          <div className="text-center mb-12">
            {block.heading && <h2 className="section-heading">{block.heading}</h2>}
            {block.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
            )}
          </div>
        )}

        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-6 top-6 bottom-6 hidden w-px sm:block"
            style={{ background: "var(--color-border)" }}
          />

          <div className="space-y-8 sm:space-y-12">
            {block.steps?.map((step, index) => (
              <div key={index} className="flex gap-6 sm:gap-8">
                {/* Step number circle */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {step.icon ? (
                    <BlockIcon name={step.icon} className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Content */}
                <div className="pt-2">
                  <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[var(--color-on-surface-secondary)]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
