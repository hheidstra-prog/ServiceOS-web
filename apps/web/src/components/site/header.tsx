"use client";

import Link from "next/link";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useSite } from "@/lib/site-context";

export function SiteHeader() {
  const site = useSite();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logo = site.logo || site.organization.logo;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logo}
              alt={site.name}
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-xl font-bold text-[var(--color-on-surface)]">{site.name}</span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {site.navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="text-sm font-medium text-[var(--color-on-surface-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
              style={{ transitionDuration: "var(--transition-duration)" }}
            >
              {item.label}
            </Link>
          ))}

          {site.blogEnabled && (
            <Link
              href="/blog"
              className="text-sm font-medium text-[var(--color-on-surface-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
              style={{ transitionDuration: "var(--transition-duration)" }}
            >
              Blog
            </Link>
          )}

          {site.portalEnabled && (
            <Link
              href="/portal"
              className="text-sm font-medium text-[var(--color-on-surface-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
              style={{ transitionDuration: "var(--transition-duration)" }}
            >
              Client Portal
            </Link>
          )}
          {site.bookingEnabled && (
            <Link href="/book" className="btn-primary text-sm">
              Book Now
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-[var(--color-on-surface-secondary)]" />
          ) : (
            <Menu className="h-6 w-6 text-[var(--color-on-surface-secondary)]" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden">
          <div className="space-y-1 px-4 py-4">
            {site.navigation.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-[var(--color-on-surface-secondary)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-on-surface)]"
                style={{ borderRadius: "var(--radius-button)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {site.blogEnabled && (
              <Link
                href="/blog"
                className="block px-3 py-2 text-base font-medium text-[var(--color-on-surface-secondary)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-on-surface)]"
                style={{ borderRadius: "var(--radius-button)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
            )}
            {site.portalEnabled && (
              <Link
                href="/portal"
                className="block px-3 py-2 text-base font-medium text-[var(--color-on-surface-secondary)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-on-surface)]"
                style={{ borderRadius: "var(--radius-button)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Client Portal
              </Link>
            )}
            {site.bookingEnabled && (
              <Link
                href="/book"
                className="btn-primary mt-4 block w-full text-center text-base"
                onClick={() => setMobileMenuOpen(false)}
              >
                Book Now
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
