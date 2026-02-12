import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cache } from "react";

/**
 * Sync user from Clerk to database if they don't exist
 * This handles cases where webhook didn't fire or failed
 */
async function syncUserFromClerk(clerkUserId: string) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  // Create user and organization in a transaction
  const user = await db.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        clerkUserId: clerkUserId,
        email: email,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        imageUrl: clerkUser.imageUrl ?? null,
      },
    });

    // Create default organization
    const orgSlug = generateSlug(email);
    const organization = await tx.organization.create({
      data: {
        clerkOrgId: `personal_${clerkUserId}`,
        name: clerkUser.firstName ? `${clerkUser.firstName}'s Business` : "My Business",
        slug: orgSlug,
        email: email,
      },
    });

    // Add user as owner
    await tx.organizationMember.create({
      data: {
        userId: newUser.id,
        organizationId: organization.id,
        role: "OWNER",
      },
    });

    return newUser;
  });

  return user;
}

function generateSlug(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
}

/**
 * Get the current user from the database
 * If user doesn't exist, sync from Clerk (just-in-time provisioning)
 * Cached per request to avoid multiple DB calls
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  // Just-in-time sync: if user doesn't exist in DB, create from Clerk
  if (!user) {
    await syncUserFromClerk(userId);

    // Fetch the newly created user
    user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  return user;
});

/**
 * Get the current user's active organization
 * For now, returns the first organization (personal workspace)
 * Later: support switching between organizations
 */
export const getCurrentOrganization = cache(async () => {
  const user = await getCurrentUser();

  if (!user || user.memberships.length === 0) {
    return null;
  }

  // For now, return the first organization
  // TODO: Support organization switching via cookie/header
  return user.memberships[0].organization;
});

/**
 * Get both user and organization in one call
 */
export const getCurrentUserAndOrg = cache(async () => {
  const user = await getCurrentUser();

  if (!user || user.memberships.length === 0) {
    return { user: null, organization: null };
  }

  return {
    user,
    organization: user.memberships[0].organization,
  };
});

/**
 * Require authentication - throws if not authenticated
 * Use in server actions and API routes
 */
export async function requireAuth() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Require authentication and organization
 */
export async function requireAuthWithOrg() {
  const user = await requireAuth();
  const organization = await getCurrentOrganization();

  if (!organization) {
    throw new Error("No organization found");
  }

  return { user, organization };
}
