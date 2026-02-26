"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { archiveClient, unarchiveClient } from "../actions";

interface ClientActionsProps {
  client: {
    id: string;
    status: string;
  };
}

export function ClientActions({ client }: ClientActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const isArchived = client.status === "ARCHIVED";

  const handleArchive = async () => {
    const ok = await confirm({
      title: "Archive client",
      description: "Are you sure you want to archive this client?",
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;

    setIsLoading(true);
    try {
      await archiveClient(client.id);
      router.push("/clients");
    } catch (error) {
      console.error("Error archiving client:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async () => {
    setIsLoading(true);
    try {
      await unarchiveClient(client.id);
      toast.success("Client restored");
      router.refresh();
    } catch (error) {
      console.error("Error restoring client:", error);
      toast.error("Failed to restore client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {ConfirmDialog}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isArchived ? (
          <DropdownMenuItem
            onClick={handleUnarchive}
            disabled={isLoading}
          >
            <ArchiveRestore className="mr-2 h-4 w-4" />
            {isLoading ? "Restoring..." : "Restore Client"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={handleArchive}
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
          >
            <Archive className="mr-2 h-4 w-4" />
            {isLoading ? "Archiving..." : "Archive Client"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
