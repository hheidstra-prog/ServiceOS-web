"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireAuthWithOrg } from "@/lib/auth";
import { sendTeamInvitationEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import type { MemberRole } from "@servible/database";

// Get team members with user details
export async function getTeamMembers() {
  const { organization } = await requireAuthWithOrg();

  const members = await db.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members;
}

// Get pending invitations (ADMIN+ only)
export async function getPendingInvitations() {
  const { organization } = await requireRole("ADMIN");

  const invitations = await db.invitation.findMany({
    where: {
      organizationId: organization.id,
      status: "PENDING",
    },
    include: {
      invitedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
}

// Invite a team member (ADMIN+ only)
export async function inviteTeamMember(data: {
  email: string;
  role: MemberRole;
}) {
  const { user, organization } = await requireRole("ADMIN");

  // Cannot invite as OWNER
  if (data.role === "OWNER") {
    throw new Error("Cannot invite as OWNER");
  }

  // Check if already a member
  const existingMember = await db.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      user: { email: data.email },
    },
  });
  if (existingMember) {
    throw new Error("This person is already a member");
  }

  // Check for existing pending invitation
  const existingInvitation = await db.invitation.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: data.email,
      },
    },
  });

  if (existingInvitation?.status === "PENDING") {
    throw new Error("An invitation has already been sent to this email");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert to handle re-inviting after revoke/expire
  await db.invitation.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: data.email,
      },
    },
    create: {
      organizationId: organization.id,
      email: data.email,
      role: data.role,
      token,
      invitedById: user.id,
      status: "PENDING",
      expiresAt,
    },
    update: {
      role: data.role,
      token,
      invitedById: user.id,
      status: "PENDING",
      expiresAt,
      acceptedAt: null,
    },
  });

  // Send invitation email (async, non-blocking)
  const inviterName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ") || "A team member";

  sendTeamInvitationEmail({
    to: data.email,
    inviterName,
    organizationName: organization.name,
    role: data.role,
    acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/invite/accept?token=${token}`,
    locale: organization.locale,
  }).catch((err) => {
    console.error("Failed to send team invitation email:", err);
  });

  revalidatePath("/team");
  return { success: true };
}

// Revoke an invitation (ADMIN+ only)
export async function revokeInvitation(invitationId: string) {
  const { organization } = await requireRole("ADMIN");

  await db.invitation.update({
    where: {
      id: invitationId,
      organizationId: organization.id,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });

  revalidatePath("/team");
  return { success: true };
}

// Update a member's role (ADMIN+ only, OWNER to assign ADMIN)
export async function updateMemberRole(memberId: string, role: MemberRole) {
  const { membership, organization } = await requireRole("ADMIN");

  if (role === "OWNER") {
    throw new Error("Cannot assign OWNER role");
  }

  // Only OWNER can assign ADMIN
  if (role === "ADMIN" && membership.role !== "OWNER") {
    throw new Error("Only the owner can assign the ADMIN role");
  }

  const targetMember = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: organization.id },
  });

  if (!targetMember) {
    throw new Error("Member not found");
  }

  // Cannot change OWNER's role
  if (targetMember.role === "OWNER") {
    throw new Error("Cannot change the owner's role");
  }

  // Only OWNER can change ADMIN's role
  if (targetMember.role === "ADMIN" && membership.role !== "OWNER") {
    throw new Error("Only the owner can change an admin's role");
  }

  await db.organizationMember.update({
    where: { id: memberId },
    data: { role },
  });

  revalidatePath("/team");
  return { success: true };
}

// Remove a member (ADMIN+ only, cannot remove OWNER)
export async function removeMember(memberId: string) {
  const { membership, organization } = await requireRole("ADMIN");

  const targetMember = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: organization.id },
  });

  if (!targetMember) {
    throw new Error("Member not found");
  }

  // Cannot remove OWNER
  if (targetMember.role === "OWNER") {
    throw new Error("Cannot remove the owner");
  }

  // Only OWNER can remove ADMIN
  if (targetMember.role === "ADMIN" && membership.role !== "OWNER") {
    throw new Error("Only the owner can remove an admin");
  }

  // Cannot remove yourself
  if (targetMember.userId === membership.userId) {
    throw new Error("Cannot remove yourself");
  }

  await db.organizationMember.delete({
    where: { id: memberId },
  });

  revalidatePath("/team");
  return { success: true };
}

// Lightweight list for dropdowns (future task assignment)
export async function getTeamMembersForSelect() {
  const { organization } = await requireAuthWithOrg();

  const members = await db.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((m) => ({
    userId: m.user.id,
    name: [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || "Unknown",
    imageUrl: m.user.imageUrl,
    role: m.role,
  }));
}
