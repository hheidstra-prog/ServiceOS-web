/**
 * Migration script: Move blog ownership from Site to Organization
 *
 * This script:
 * 1. Sets organizationId on all BlogPosts from their site's organizationId
 * 2. Sets organizationId on all BlogCategories from their site's organizationId
 * 3. Sets organizationId on all BlogTags from their site's organizationId
 * 4. Creates BlogPostPublication entries for all PUBLISHED posts
 *
 * Run with: npx tsx scripts/migrate-blog-to-org.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting blog migration: Site → Organization...\n");

  // Step 1: Migrate BlogPosts
  const posts = await prisma.$queryRaw<
    Array<{ id: string; slug: string; siteId: string; status: string; organizationId: string }>
  >`
    SELECT bp.id, bp.slug, bp."siteId", bp.status, s."organizationId"
    FROM "BlogPost" bp
    JOIN "Site" s ON s.id = bp."siteId"
  `;

  console.log(`Found ${posts.length} blog posts to migrate`);

  for (const post of posts) {
    await prisma.$executeRaw`
      UPDATE "BlogPost"
      SET "organizationId" = ${post.organizationId}
      WHERE id = ${post.id}
    `;
  }
  console.log(`  ✓ Updated organizationId on ${posts.length} posts`);

  // Step 2: Migrate BlogCategories
  const categories = await prisma.$queryRaw<
    Array<{ id: string; siteId: string; organizationId: string }>
  >`
    SELECT bc.id, bc."siteId", s."organizationId"
    FROM "BlogCategory" bc
    JOIN "Site" s ON s.id = bc."siteId"
  `;

  console.log(`Found ${categories.length} blog categories to migrate`);

  for (const cat of categories) {
    await prisma.$executeRaw`
      UPDATE "BlogCategory"
      SET "organizationId" = ${cat.organizationId}
      WHERE id = ${cat.id}
    `;
  }
  console.log(`  ✓ Updated organizationId on ${categories.length} categories`);

  // Step 3: Migrate BlogTags
  const tags = await prisma.$queryRaw<
    Array<{ id: string; siteId: string; organizationId: string }>
  >`
    SELECT bt.id, bt."siteId", s."organizationId"
    FROM "BlogTag" bt
    JOIN "Site" s ON s.id = bt."siteId"
  `;

  console.log(`Found ${tags.length} blog tags to migrate`);

  for (const tag of tags) {
    await prisma.$executeRaw`
      UPDATE "BlogTag"
      SET "organizationId" = ${tag.organizationId}
      WHERE id = ${tag.id}
    `;
  }
  console.log(`  ✓ Updated organizationId on ${tags.length} tags`);

  // Step 4: Create BlogPostPublication entries for published posts
  const publishedPosts = posts.filter((p) => p.status === "PUBLISHED");
  console.log(`\nCreating ${publishedPosts.length} publication entries for published posts`);

  for (const post of publishedPosts) {
    await prisma.$executeRaw`
      INSERT INTO "BlogPostPublication" ("postId", "siteId", "slug", "createdAt")
      VALUES (${post.id}, ${post.siteId}, ${post.slug}, NOW())
      ON CONFLICT ("postId", "siteId") DO NOTHING
    `;
  }
  console.log(`  ✓ Created publication entries`);

  console.log("\n✅ Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
