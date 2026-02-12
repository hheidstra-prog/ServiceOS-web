"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveClient } from "../actions";

interface ClientActionsProps {
  client: {
    id: string;
  };
}

export function ClientActions({ client }: ClientActionsProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this client?")) {
      return;
    }

    setIsArchiving(true);
    try {
      await archiveClient(client.id);
      router.push("/clients");
    } catch (error) {
      console.error("Error archiving client:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Create Quote</DropdownMenuItem>
        <DropdownMenuItem>Create Invoice</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleArchive}
          disabled={isArchiving}
          className="text-destructive focus:text-destructive"
        >
          <Archive className="mr-2 h-4 w-4" />
          {isArchiving ? "Archiving..." : "Archive Client"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
