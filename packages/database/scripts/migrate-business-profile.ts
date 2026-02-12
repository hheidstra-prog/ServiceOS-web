/**
 * Data migration: Copy existing Organization AI fields to BusinessProfile
 *
 * Run with: npx tsx scripts/migrate-business-profile.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting BusinessProfile migration...");

  // Find all organizations that have any AI-related fields set
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { industry: { not: null } },
        { toneOfVoice: { not: null } },
        { description: { not: null } },
        { tagline: { not: null } },
        { targetAudience: { not: null } },
        { uniqueValue: { not: null } },
      ],
    },
    select: {
      id: true,
      industry: true,
      toneOfVoice: true,
      description: true,
      tagline: true,
      targetAudience: true,
      uniqueValue: true,
      businessProfile: { select: { id: true } },
    },
  });

  console.log(`Found ${orgs.length} organizations with AI fields to migrate.`);

  let created = 0;
  let skipped = 0;

  for (const org of orgs) {
    // Skip if BusinessProfile already exists
    if (org.businessProfile) {
      console.log(`  Skipping org ${org.id} - BusinessProfile already exists`);
      skipped++;
      continue;
    }

    await prisma.businessProfile.create({
      data: {
        organizationId: org.id,
        industry: org.industry,
        toneOfVoice: org.toneOfVoice,
        description: org.description,
        tagline: org.tagline,
        targetAudience: org.targetAudience,
        uniqueValue: org.uniqueValue,
      },
    });

    console.log(`  Created BusinessProfile for org ${org.id}`);
    created++;
  }

  console.log(`\nMigration complete: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
