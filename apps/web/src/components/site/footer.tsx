"use client";

import Link from "next/link";
import { useSite } from "@/lib/site-context";

export function SiteFooter() {
  const site = useSite();
  const org = site.organization;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">{site.name}</h3>
            {site.tagline && (
              <p className="mt-2 text-sm text-[var(--color-on-surface-secondary)]">{site.tagline}</p>
            )}
            {site.description && (
              <p className="mt-4 text-sm text-[var(--color-on-surface-muted)] max-w-md">
                {site.description}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">Quick Links</h4>
            <ul className="mt-4 space-y-2">
              {site.navigation.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--color-on-surface-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
                    style={{ transitionDuration: "var(--transition-duration)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {site.blogEnabled && (
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-[var(--color-on-surface-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
                    style={{ transitionDuration: "var(--transition-duration)" }}
                  >
                    Blog
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">Contact</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-on-surface-secondary)]">
              {org.email && (
                <li>
                  <a href={`mailto:${org.email}`} className="hover:text-[var(--color-on-surface)]">
                    {org.email}
                  </a>
                </li>
              )}
              {org.phone && (
                <li>
                  <a href={`tel:${org.phone}`} className="hover:text-[var(--color-on-surface)]">
                    {org.phone}
                  </a>
                </li>
              )}
              {(org.addressLine1 || org.city) && (
                <li className="pt-2">
                  {org.addressLine1 && <div>{org.addressLine1}</div>}
                  {org.addressLine2 && <div>{org.addressLine2}</div>}
                  {(org.postalCode || org.city) && (
                    <div>
                      {org.postalCode} {org.city}
                    </div>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] pt-8 sm:flex-row">
          <p className="text-sm text-[var(--color-on-surface-muted)]">
            &copy; {year} {org.name}. All rights reserved.
          </p>
          <p className="text-xs text-[var(--color-on-surface-muted)]">
            Powered by{" "}
            <a
              href="https://serviceos.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-on-surface-secondary)]"
            >
              ServiceOS
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
