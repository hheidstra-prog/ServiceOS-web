import { getTeamMembers, getPendingInvitations } from "./actions";
import { getCurrentMembership } from "@/lib/auth";
import { TeamList } from "./team-list";

export default async function TeamPage() {
  const [members, membership] = await Promise.all([
    getTeamMembers(),
    getCurrentMembership(),
  ]);

  const currentRole = membership?.role || "VIEWER";
  const isAdmin = currentRole === "ADMIN" || currentRole === "OWNER";

  // Only fetch invitations if admin
  const invitations = isAdmin ? await getPendingInvitations() : [];

  return (
    <TeamList
      members={members}
      invitations={invitations}
      currentUserId={membership?.userId || ""}
      currentRole={currentRole}
    />
  );
}
