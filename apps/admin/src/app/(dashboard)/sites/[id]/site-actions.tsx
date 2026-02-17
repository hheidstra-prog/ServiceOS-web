"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Globe, Wrench, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SiteStatus } from "@serviceos/database";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { updateSite, deleteSite } from "../actions";

interface Site {
  id: string;
  name: string;
  status: SiteStatus;
}

interface SiteActionsProps {
  site: Site;
}

export function SiteActions({ site }: SiteActionsProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const handlePublish = async () => {
    try {
      await updateSite(site.id, { status: SiteStatus.PUBLISHED });
      toast.success("Site published successfully");
    } catch (error) {
      toast.error("Failed to publish site");
    }
  };

  const handleUnpublish = async () => {
    try {
      await updateSite(site.id, { status: SiteStatus.DRAFT });
      toast.success("Site unpublished");
    } catch (error) {
      toast.error("Failed to unpublish site");
    }
  };

  const handleMaintenance = async () => {
    try {
      await updateSite(site.id, { status: SiteStatus.MAINTENANCE });
      toast.success("Site set to maintenance mode");
    } catch (error) {
      toast.error("Failed to set maintenance mode");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete site",
      description: `Are you sure you want to delete "${site.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteSite(site.id);
      toast.success("Site deleted");
      router.push("/sites");
    } catch (error) {
      toast.error("Failed to delete site");
    }
  };

  return (
    <>{ConfirmDialog}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {site.status === SiteStatus.DRAFT && (
          <DropdownMenuItem onClick={handlePublish}>
            <Send className="mr-2 h-4 w-4" />
            Publish Site
          </DropdownMenuItem>
        )}
        {site.status === SiteStatus.PUBLISHED && (
          <>
            <DropdownMenuItem onClick={handleUnpublish}>
              <Globe className="mr-2 h-4 w-4" />
              Unpublish Site
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMaintenance}>
              <Wrench className="mr-2 h-4 w-4" />
              Maintenance Mode
            </DropdownMenuItem>
          </>
        )}
        {site.status === SiteStatus.MAINTENANCE && (
          <>
            <DropdownMenuItem onClick={handlePublish}>
              <Send className="mr-2 h-4 w-4" />
              Publish Site
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUnpublish}>
              <Globe className="mr-2 h-4 w-4" />
              Unpublish Site
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 dark:text-red-400"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Site
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
