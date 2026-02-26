import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@servible/database";
import { cache } from "react";

export function generatePreviewToken(site: { id: string; createdAt: Date }): string {
  return crypto
    .createHash("sha256")
    .update(`${site.id}:${site.createdAt.toISOString()}:servible-preview`)
    .digest("hex")
    .slice(0, 32);
}

export const isPreviewMode = cache(async (domain: string): Promise<boolean> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("__servible_preview")?.value;
  if (!token) return false;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
    },
    select: { id: true, createdAt: true, status: true },
  });

  if (!site) return false;
  if (site.status === "PUBLISHED") return false;

  const expected = generatePreviewToken(site);
  return token === expected;
});
