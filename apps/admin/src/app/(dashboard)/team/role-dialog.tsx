"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMemberRole } from "./actions";
import type { MemberRole } from "@servible/database";

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    role: MemberRole;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  };
  currentRole: MemberRole;
}

const ASSIGNABLE_ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: "ADMIN", label: "Admin", description: "Full access, can manage team" },
  { value: "MEMBER", label: "Member", description: "Standard access to all features" },
  { value: "BOOKKEEPER", label: "Bookkeeper", description: "View financials only" },
  { value: "VIEWER", label: "Viewer", description: "Read-only access" },
];

export function RoleDialog({ open, onOpenChange, member, currentRole }: RoleDialogProps) {
  const [role, setRole] = useState<MemberRole>(member.role);
  const [loading, setLoading] = useState(false);

  const memberName = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ") || member.user.email;

  // Only OWNER can assign ADMIN
  const availableRoles = ASSIGNABLE_ROLES.filter(
    (r) => r.value !== "ADMIN" || currentRole === "OWNER"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === member.role) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      await updateMemberRole(member.id, role);
      toast.success(`${memberName}'s role updated to ${role}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role for {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <span className="font-medium">{r.label}</span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {r.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
