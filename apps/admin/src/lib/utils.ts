import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Build the public URL for a site, using localhost in development.
 */
export function getSiteUrl(site: { subdomain: string; customDomain?: string | null }): string {
  if (site.customDomain) {
    return `https://${site.customDomain}`;
  }
  if (process.env.NODE_ENV === "development") {
    return `http://${site.subdomain}.localhost:3002`;
  }
  return `https://${site.subdomain}.servible.app`;
}
