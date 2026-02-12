/**
 * Quick fix: Publish all unpublished pages for published sites.
 *
 * Run with: npx tsx scripts/publish-pages.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.page.updateMany({
    where: {
      isPublished: false,
      site: { status: "PUBLISHED" },
    },
    data: { isPublished: true },
  });

  console.log(`Published ${result.count} pages.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
