import Image from "next/image";
import { getBlockBackgroundProps } from "./block-helpers";

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
}

interface TestimonialsData {
  heading?: string;
  subheading?: string;
  testimonials: Testimonial[];
  background?: string;
}

export function TestimonialsBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const block = data as unknown as TestimonialsData;
  const bg = getBlockBackgroundProps(block.background || "default");

  return (
    <section className={bg.className} style={bg.style}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(block.heading || block.subheading) && (
          <div className="text-center mb-12">
            {block.heading && <h2 className="section-heading">{block.heading}</h2>}
            {block.subheading && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{block.subheading}</p>
            )}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {block.testimonials?.map((testimonial, index) => (
            <div key={index} className="card-base">
              <blockquote className="text-[var(--color-on-surface-secondary)] italic">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-4">
                {testimonial.avatar ? (
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
                    style={{
                      background: "var(--icon-container-bg)",
                      color: "var(--icon-container-color)",
                    }}
                  >
                    {testimonial.author.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[var(--color-on-surface)]">
                    {testimonial.author}
                  </p>
                  {(testimonial.role || testimonial.company) && (
                    <p className="text-sm text-[var(--color-on-surface-secondary)]">
                      {testimonial.role}
                      {testimonial.role && testimonial.company && ", "}
                      {testimonial.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
