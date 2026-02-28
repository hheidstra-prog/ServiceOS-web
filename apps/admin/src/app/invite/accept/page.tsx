import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { InviteAcceptClient } from "./invite-accept-client";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InviteAcceptPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <InviteAcceptClient status="invalid" />;
  }

  // Find the invitation
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    return <InviteAcceptClient status="invalid" />;
  }

  if (invitation.status !== "PENDING") {
    // If user is signed in, set active org and redirect to dashboard
    const { userId: signedInUserId } = await auth();
    if (signedInUserId) {
      redirect(`/invite/accept/complete?org=${invitation.organizationId}`);
    }
    return (
      <InviteAcceptClient
        status="already_used"
        organizationName={invitation.organization.name}
      />
    );
  }

  if (new Date() > invitation.expiresAt) {
    // Mark as expired
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return (
      <InviteAcceptClient
        status="expired"
        organizationName={invitation.organization.name}
      />
    );
  }

  // Check if user is signed in
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    // Not signed in — redirect to sign-up with redirect back
    const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(`/invite/accept?token=${token}`)}`;
    redirect(signUpUrl);
  }

  // User is signed in — find or create their DB user
  let user = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    // User exists in Clerk but not in DB yet — webhook hasn't fired yet.
    // JIT provision: create the DB user from Clerk data.
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return <InviteAcceptClient status="invalid" />;
    }

    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return <InviteAcceptClient status="invalid" />;
    }

    const orgSlug = `${email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      user = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            clerkUserId,
            email,
            firstName: clerkUser.firstName ?? null,
            lastName: clerkUser.lastName ?? null,
            imageUrl: clerkUser.imageUrl ?? null,
          },
        });

        // Create their default personal organization
        const org = await tx.organization.create({
          data: {
            clerkOrgId: `personal_${clerkUserId}`,
            name: clerkUser.firstName
              ? `${clerkUser.firstName}'s Business`
              : "My Business",
            slug: orgSlug,
            email,
          },
        });

        await tx.organizationMember.create({
          data: {
            userId: newUser.id,
            organizationId: org.id,
            role: "OWNER",
          },
        });

        return newUser;
      });
    } catch {
      // Webhook may have created the user concurrently — try fetching again
      user = await db.user.findUnique({
        where: { clerkUserId },
      });
      if (!user) {
        return <InviteAcceptClient status="invalid" />;
      }
    }
  }

  // Check if already a member
  const existingMembership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invitation.organizationId,
        userId: user.id,
      },
    },
  });

  if (existingMembership) {
    // Already a member — mark invitation as accepted and redirect
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    redirect(`/invite/accept/complete?org=${invitation.organizationId}`);
  }

  // Create membership
  await db.$transaction(async (tx) => {
    await tx.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  });

  redirect(`/invite/accept/complete?org=${invitation.organizationId}`);
}
