"use client";

import Link from "next/link";
import {
  FileText,
  Newspaper,
  Users,
  Globe,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSiteUrl } from "@/lib/utils";

interface Site {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  tagline: string | null;
  description: string | null;
  status: string;
  blogEnabled: boolean;
  portalEnabled: boolean;
  bookingEnabled: boolean;
  pages: Array<{ id: string; title: string; slug: string; isHomepage: boolean }>;
  _count: {
    pages: number;
  };
}

interface OverviewTabProps {
  site: Site;
}

export function OverviewTab({ site }: OverviewTabProps) {
  const siteUrl = getSiteUrl(site);

  const quickStats = [
    {
      label: "Pages",
      value: site._count.pages,
      icon: FileText,
      href: `/sites/${site.id}?tab=pages`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-zinc-950 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-900">
                    <Icon className="h-5 w-5 text-zinc-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Site Info */}
        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
            <CardDescription>Basic details about your site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                URL
              </p>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {siteUrl}
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            {site.tagline && (
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Tagline
                </p>
                <p className="mt-1 text-sm text-zinc-950 dark:text-white">
                  {site.tagline}
                </p>
              </div>
            )}
            {site.description && (
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Description
                </p>
                <p className="mt-1 text-sm text-zinc-950 dark:text-white">
                  {site.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Enabled features for this site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
                    <Newspaper className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-white">
                      Blog
                    </p>
                    <p className="text-sm text-zinc-500">
                      Publish articles and updates
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    site.blogEnabled
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  {site.blogEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
                    <Users className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-white">
                      Client Portal
                    </p>
                    <p className="text-sm text-zinc-500">
                      Clients can log in to view projects
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    site.portalEnabled
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  {site.portalEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
                    <Globe className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-white">
                      Online Booking
                    </p>
                    <p className="text-sm text-zinc-500">
                      Let visitors book appointments
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    site.bookingEnabled
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  {site.bookingEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pages */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pages</CardTitle>
              <CardDescription>Your site pages</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sites/${site.id}?tab=pages`}>
                View All
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {site.pages.length === 0 ? (
              <p className="text-sm text-zinc-500">No pages yet</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {site.pages.slice(0, 5).map((page) => (
                  <Link
                    key={page.id}
                    href={`/sites/${site.id}/pages/${page.id}`}
                    className="flex items-center justify-between py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 -mx-4 px-4 first:-mt-3 last:-mb-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium text-zinc-950 dark:text-white">
                        {page.title}
                      </span>
                      {page.isHomepage && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                          Home
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500">
                      /{page.slug || ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
