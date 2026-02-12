import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.page.findMany({
    where: { site: { subdomain: "virtalize" } },
    select: { title: true, slug: true, isHomepage: true, isPublished: true },
  });
  console.log(JSON.stringify(pages, null, 2));

  const nav = await prisma.navigation.findMany({
    where: { site: { subdomain: "virtalize" } },
    select: { label: true, href: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  console.log("\nNavigation:");
  console.log(JSON.stringify(nav, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
