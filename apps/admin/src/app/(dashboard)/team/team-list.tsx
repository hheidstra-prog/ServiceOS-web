"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MoreHorizontal,
  UserPlus,
  Shield,
  UserMinus,
  Mail,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteDialog } from "./invite-dialog";
import { RoleDialog } from "./role-dialog";
import { revokeInvitation, removeMember } from "./actions";
import type { MemberRole } from "@servible/database";

type Member = {
  id: string;
  role: MemberRole;
  joinedAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: MemberRole;
  createdAt: Date;
  invitedBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  MEMBER: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  BOOKKEEPER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  VIEWER: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  BOOKKEEPER: "Bookkeeper",
  VIEWER: "Viewer",
};

interface TeamListProps {
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  currentRole: MemberRole;
}

export function TeamList({
  members,
  invitations,
  currentUserId,
  currentRole,
}: TeamListProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const isAdmin = currentRole === "ADMIN" || currentRole === "OWNER";
  const isOwner = currentRole === "OWNER";

  const canChangeRole = (member: Member) => {
    if (member.role === "OWNER") return false;
    if (member.role === "ADMIN" && !isOwner) return false;
    return isAdmin;
  };

  const canRemove = (member: Member) => {
    if (member.user.id === currentUserId) return false;
    if (member.role === "OWNER") return false;
    if (member.role === "ADMIN" && !isOwner) return false;
    return isAdmin;
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation(invitationId);
      toast.success("Invitation revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  };

  const handleRemove = async (member: Member) => {
    const name = [member.user.firstName, member.user.lastName]
      .filter(Boolean)
      .join(" ") || member.user.email;

    if (!confirm(`Remove ${name} from the team?`)) return;

    try {
      await removeMember(member.id);
      toast.success(`${name} has been removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">
            Team
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {members.map((member, idx) => {
          const name = [member.user.firstName, member.user.lastName]
            .filter(Boolean)
            .join(" ") || "Unknown";
          const initials = [member.user.firstName?.[0], member.user.lastName?.[0]]
            .filter(Boolean)
            .join("")
            .toUpperCase() || "?";

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx > 0
                  ? "border-t border-zinc-100 dark:border-zinc-800"
                  : ""
              }`}
            >
              <Avatar>
                {member.user.imageUrl ? (
                  <AvatarImage src={member.user.imageUrl} alt={name} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                    {name}
                  </p>
                  {member.user.id === currentUserId && (
                    <span className="text-xs text-zinc-400">(you)</span>
                  )}
                </div>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {member.user.email}
                </p>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  ROLE_COLORS[member.role]
                }`}
              >
                {ROLE_LABELS[member.role]}
              </span>

              {(canChangeRole(member) || canRemove(member)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canChangeRole(member) && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMember(member);
                          setRoleDialogOpen(true);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Change Role
                      </DropdownMenuItem>
                    )}
                    {canChangeRole(member) && canRemove(member) && (
                      <DropdownMenuSeparator />
                    )}
                    {canRemove(member) && (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleRemove(member)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Pending Invitations
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {invitations.map((invitation, idx) => {
              const inviterName = invitation.invitedBy
                ? [invitation.invitedBy.firstName, invitation.invitedBy.lastName]
                    .filter(Boolean)
                    .join(" ")
                : null;

              return (
                <div
                  key={invitation.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx > 0
                      ? "border-t border-zinc-100 dark:border-zinc-800"
                      : ""
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <Mail className="h-4 w-4 text-zinc-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                      {invitation.email}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        Invited{" "}
                        {new Date(invitation.createdAt).toLocaleDateString()}
                        {inviterName && ` by ${inviterName}`}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_COLORS[invitation.role]
                    }`}
                  >
                    {ROLE_LABELS[invitation.role]}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRevoke(invitation.id)}
                    title="Revoke invitation"
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        currentRole={currentRole}
      />

      {selectedMember && (
        <RoleDialog
          open={roleDialogOpen}
          onOpenChange={(open) => {
            setRoleDialogOpen(open);
            if (!open) setSelectedMember(null);
          }}
          member={selectedMember}
          currentRole={currentRole}
        />
      )}
    </div>
  );
}
