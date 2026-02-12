"use client";

import React from "react";

/**
 * Navigation-safe link wrapper for block preview.
 * Renders a real <a> for visual fidelity but prevents navigation.
 */
export default function Link({
  href,
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => e.preventDefault()}
      {...props}
    >
      {children}
    </a>
  );
}
