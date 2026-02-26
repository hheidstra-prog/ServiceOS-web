import crypto from "crypto";

export function generatePreviewToken(site: { id: string; createdAt: Date }): string {
  return crypto
    .createHash("sha256")
    .update(`${site.id}:${site.createdAt.toISOString()}:servible-preview`)
    .digest("hex")
    .slice(0, 32);
}

export function getPreviewUrl(siteUrl: string, token: string): string {
  const url = new URL(siteUrl);
  url.searchParams.set("preview", token);
  return url.toString();
}
