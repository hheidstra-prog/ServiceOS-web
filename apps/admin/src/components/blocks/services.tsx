import Link from "./preview-link";
import { BlockIcon } from "./block-icon";

interface Service {
  name?: string;
  title?: string;
  description: string;
  price?: string;
  icon?: string;
  href?: string;
  link?: string;
}

interface ServicesData {
  heading?: string;
  subheading?: string;
  services: Service[];
  columns?: 2 | 3 | 4;
  showPrices?: boolean;
  variant?: "cards" | "numbered";
}

export function ServicesBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const services = data as unknown as ServicesData;
  const columns = services.columns || 3;
  const variant = services.variant || "cards";

  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  if (variant === "numbered") {
    return (
      <section className="section-padding bg-[var(--color-surface-alt)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {(services.heading || services.subheading) && (
            <div className="text-center mb-12">
              {services.heading && <h2 className="section-heading">{services.heading}</h2>}
              {services.subheading && (
                <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{services.subheading}</p>
              )}
            </div>
          )}
          <div className={`grid gap-8 ${gridCols}`}>
            {services.services?.map((service, index) => (
              <div key={index} className="card-base card-interactive relative">
                <span className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-sm font-bold text-white shadow-sm">
                  {index + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-[var(--color-on-surface)]">
                  {service.name || service.title}
                </h3>
                <p className="mt-2 text-[var(--color-on-surface-secondary)]">{service.description}</p>
                {(services.showPrices !== false) && service.price && (
                  <p className="mt-4 text-lg font-semibold text-[var(--color-on-surface)]">{service.price}</p>
                )}
                {(service.href || service.link) && (
                  <Link
                    href={service.href || service.link!}
                    className="mt-4 inline-block text-sm font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)]"
                  >
                    Learn more &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Cards variant (default)
  return (
    <section className="section-padding bg-[var(--color-surface-alt)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(services.heading || services.subheading) && (
          <div className="text-center mb-12">
            {services.heading && <h2 className="section-heading">{services.heading}</h2>}
            {services.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{services.subheading}</p>
            )}
          </div>
        )}
        <div className={`grid gap-8 ${gridCols}`}>
          {services.services?.map((service, index) => (
            <div key={index} className="card-base card-interactive">
              {service.icon && (
                <div className="icon-container mb-4">
                  <BlockIcon name={service.icon} className="h-5 w-5" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">
                {service.name || service.title}
              </h3>
              <p className="mt-2 text-[var(--color-on-surface-secondary)]">{service.description}</p>
              {(services.showPrices !== false) && service.price && (
                <p className="mt-4 text-lg font-semibold text-[var(--color-on-surface)]">{service.price}</p>
              )}
              {(service.href || service.link) && (
                <Link
                  href={service.href || service.link!}
                  className="mt-4 inline-block text-sm font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)]"
                >
                  Learn more &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
