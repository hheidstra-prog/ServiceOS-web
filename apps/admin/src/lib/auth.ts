import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cache } from "react";
import type { MemberRole } from "@servible/database";

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

  // Sync stale profile: if DB is missing name/avatar, refresh from Clerk
  if (user && !user.firstName) {
    const clerkUser = await currentUser();
    if (clerkUser?.firstName) {
      await db.user.update({
        where: { id: user.id },
        data: {
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
          imageUrl: clerkUser.imageUrl ?? null,
        },
      });
      user = { ...user, firstName: clerkUser.firstName ?? null, lastName: clerkUser.lastName ?? null, imageUrl: clerkUser.imageUrl ?? null };
    }
  }

  return user;
});

/**
 * Get the current user's active organization
 * Checks for `active_org` cookie first, falls back to first membership
 */
export const getCurrentOrganization = cache(async () => {
  const user = await getCurrentUser();

  if (!user || user.memberships.length === 0) {
    return null;
  }

  // Check for active_org cookie
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org")?.value;

  if (activeOrgId) {
    const membership = user.memberships.find(
      (m) => m.organizationId === activeOrgId
    );
    if (membership) {
      return membership.organization;
    }
  }

  // Fall back to first organization
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

  const organization = await getCurrentOrganization();

  return {
    user,
    organization,
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

// ===========================================
// ROLE ENFORCEMENT
// ===========================================

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  VIEWER: 0,
  BOOKKEEPER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

/**
 * Get the current user's membership for the active organization
 */
export const getCurrentMembership = cache(async () => {
  const user = await getCurrentUser();
  const organization = await getCurrentOrganization();

  if (!user || !organization) {
    return null;
  }

  const membership = user.memberships.find(
    (m) => m.organizationId === organization.id
  );

  return membership || null;
});

/**
 * Require a minimum role for the current user
 * Role hierarchy: VIEWER < BOOKKEEPER < MEMBER < ADMIN < OWNER
 */
export async function requireRole(minimumRole: MemberRole) {
  const user = await requireAuth();
  const organization = await getCurrentOrganization();

  if (!organization) {
    throw new Error("No organization found");
  }

  const membership = user.memberships.find(
    (m) => m.organizationId === organization.id
  );

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minimumRole]) {
    throw new Error("Insufficient permissions");
  }

  return { user, organization, membership };
}
