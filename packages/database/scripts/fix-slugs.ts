/**
 * Fix slugs and navigation hrefs that have leading slashes.
 *
 * Run with: npx tsx scripts/fix-slugs.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Fix page slugs: strip leading slashes
  const pages = await prisma.page.findMany({
    where: { slug: { startsWith: "/" } },
    select: { id: true, slug: true },
  });

  for (const page of pages) {
    const fixed = page.slug.replace(/^\/+/, "");
    await prisma.page.update({
      where: { id: page.id },
      data: { slug: fixed },
    });
    console.log(`Page: "${page.slug}" -> "${fixed}"`);
  }

  // Fix navigation hrefs: replace double slashes
  const navs = await prisma.navigation.findMany({
    where: { href: { startsWith: "//" } },
    select: { id: true, href: true, label: true },
  });

  for (const nav of navs) {
    const fixed = nav.href.replace(/^\/+/, "/");
    await prisma.navigation.update({
      where: { id: nav.id },
      data: { href: fixed },
    });
    console.log(`Nav "${nav.label}": "${nav.href}" -> "${fixed}"`);
  }

  // Delete homepage from navigation (href = "/")
  const deleted = await prisma.navigation.deleteMany({
    where: { href: "/" },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} homepage nav item(s)`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
