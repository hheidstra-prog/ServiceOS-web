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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteTeamMember } from "./actions";
import type { MemberRole } from "@servible/database";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: MemberRole;
}

const ASSIGNABLE_ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: "MEMBER", label: "Member", description: "Standard access to all features" },
  { value: "ADMIN", label: "Admin", description: "Full access, can manage team" },
  { value: "BOOKKEEPER", label: "Bookkeeper", description: "View financials only" },
  { value: "VIEWER", label: "Viewer", description: "Read-only access" },
];

export function InviteDialog({ open, onOpenChange, currentRole }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [loading, setLoading] = useState(false);

  // Only OWNER can assign ADMIN
  const availableRoles = ASSIGNABLE_ROLES.filter(
    (r) => r.value !== "ADMIN" || currentRole === "OWNER"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await inviteTeamMember({ email: email.trim().toLowerCase(), role });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setRole("MEMBER");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
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
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
