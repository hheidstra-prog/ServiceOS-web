"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  FileText,
  Search,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/utils";
import { deleteSite } from "./actions";
import { SiteForm } from "./site-form";

interface Site {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  status: "DRAFT" | "PUBLISHED" | "MAINTENANCE";
  blogEnabled: boolean;
  portalEnabled: boolean;
  createdAt: Date;
  _count: {
    pages: number;
  };
}

interface SitesListProps {
  sites: Site[];
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function SitesList({ sites }: SitesListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSite(deleteTarget.id);
      toast.success("Site deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete site");
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Sites
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your public website and client portal.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Site
              <ChevronDown className="ml-1.5 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Manually
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/sites/new">
                <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
                Generate with AI
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      {sites.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-950">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-900">
            <Globe className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            {searchQuery ? "No sites found" : "No sites yet"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {searchQuery
              ? "Try a different search term."
              : "Create your first site to get started."}
          </p>
          {!searchQuery && (
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={() => setIsFormOpen(true)} size="sm" variant="outline">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Manually
              </Button>
              <Button asChild size="sm">
                <Link href="/sites/new">
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Generate with AI
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSites.map((site) => {
            const status = statusConfig[site.status];

            return (
              <div
                key={site.id}
                className="group relative rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                      <Globe className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div>
                      <Link
                        href={`/sites/${site.id}`}
                        className="font-semibold text-zinc-900 hover:underline dark:text-white"
                      >
                        {site.name}
                      </Link>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {site.subdomain}.servible.app
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/sites/${site.id}`}>
                          Edit site
                        </Link>
                      </DropdownMenuItem>
                      {site.status === "PUBLISHED" && (
                        <DropdownMenuItem asChild>
                          <a
                            href={getSiteUrl(site)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View live site
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ id: site.id, name: site.name })}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete site
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status */}
                <div className="mt-4">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {site._count.pages} pages
                  </span>
                </div>

                {/* Features */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {site.blogEnabled && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                      Blog
                    </span>
                  )}
                  {site.portalEnabled && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                      Portal
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Site Form */}
      <SiteForm open={isFormOpen} onOpenChange={setIsFormOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-zinc-950 dark:text-white">{deleteTarget?.name}</span>? All pages and content will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete site"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
