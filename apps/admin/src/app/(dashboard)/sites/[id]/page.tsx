import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSiteUrl } from "@/lib/utils";
import { getSite } from "../actions";
import { OverviewTab } from "./tabs/overview-tab";
import { PagesTab } from "./tabs/pages-tab";
import { DesignTab } from "./tabs/design-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { SiteActions } from "./site-actions";

interface SiteDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
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

export default async function SiteDetailPage({ params, searchParams }: SiteDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const site = await getSite(id);

  if (!site) {
    notFound();
  }

  const status = statusConfig[site.status];
  const siteUrl = getSiteUrl(site);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/sites"
            className="mt-1 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                {site.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {site.subdomain}.serviceos.app
              {site.customDomain && ` • ${site.customDomain}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {site.status === "PUBLISHED" && (
            <Button variant="outline" size="sm" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                View Site
              </a>
            </Button>
          )}
          <SiteActions site={site} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tab || "overview"} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab site={site} />
        </TabsContent>

        <TabsContent value="pages">
          <PagesTab site={site} />
        </TabsContent>

        <TabsContent value="design">
          <DesignTab site={site} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab site={site} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
