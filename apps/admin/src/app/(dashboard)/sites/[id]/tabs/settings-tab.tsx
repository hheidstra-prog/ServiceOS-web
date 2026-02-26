"use client";

import { useState } from "react";
import { Loader2, Globe, Search, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateSite } from "../../actions";

interface Site {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  tagline: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  blogEnabled: boolean;
  portalEnabled: boolean;
  bookingEnabled: boolean;
}

interface SettingsTabProps {
  site: Site;
}

export function SettingsTab({ site }: SettingsTabProps) {
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingSeo, setIsSavingSeo] = useState(false);
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [blogEnabled, setBlogEnabled] = useState(site.blogEnabled);
  const [portalEnabled, setPortalEnabled] = useState(site.portalEnabled);
  const [bookingEnabled, setBookingEnabled] = useState(site.bookingEnabled);

  const handleGeneralSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingGeneral(true);

    try {
      const formData = new FormData(e.currentTarget);
      await updateSite(site.id, {
        name: formData.get("name") as string,
        subdomain: formData.get("subdomain") as string,
        customDomain: formData.get("customDomain") as string || undefined,
        tagline: formData.get("tagline") as string || undefined,
        description: formData.get("description") as string || undefined,
      });
      toast.success("Settings updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings"
      );
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSeoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingSeo(true);

    try {
      const formData = new FormData(e.currentTarget);
      await updateSite(site.id, {
        metaTitle: formData.get("metaTitle") as string || undefined,
        metaDescription: formData.get("metaDescription") as string || undefined,
        ogImage: formData.get("ogImage") as string || undefined,
      });
      toast.success("SEO settings updated");
    } catch (error) {
      toast.error("Failed to update SEO settings");
    } finally {
      setIsSavingSeo(false);
    }
  };

  const handleFeaturesSubmit = async () => {
    setIsSavingFeatures(true);

    try {
      await updateSite(site.id, {
        blogEnabled,
        portalEnabled,
        bookingEnabled,
      });
      toast.success("Features updated");
    } catch (error) {
      toast.error("Failed to update features");
    } finally {
      setIsSavingFeatures(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-500" />
            <CardTitle>General Settings</CardTitle>
          </div>
          <CardDescription>
            Basic information about your site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGeneralSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={site.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    name="subdomain"
                    defaultValue={site.subdomain}
                    required
                    pattern="[a-z0-9-]+"
                    className="rounded-r-none"
                  />
                  <span className="flex h-9 items-center rounded-r-md border border-l-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                    .servible.app
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain (optional)</Label>
              <Input
                id="customDomain"
                name="customDomain"
                defaultValue={site.customDomain || ""}
                placeholder="www.yourdomain.com"
              />
              <p className="text-xs text-zinc-500">
                To use a custom domain, add a CNAME record pointing to
                cname.servible.app
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                defaultValue={site.tagline || ""}
                placeholder="Your business tagline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={site.description || ""}
                placeholder="A brief description of your business..."
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingGeneral}>
                {isSavingGeneral && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-zinc-500" />
            <CardTitle>SEO Settings</CardTitle>
          </div>
          <CardDescription>
            Optimize your site for search engines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSeoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                name="metaTitle"
                defaultValue={site.metaTitle || ""}
                placeholder="Page title for search engines"
              />
              <p className="text-xs text-zinc-500">
                Recommended: 50-60 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                defaultValue={site.metaDescription || ""}
                placeholder="Brief description for search results"
                rows={3}
              />
              <p className="text-xs text-zinc-500">
                Recommended: 150-160 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogImage">Social Share Image URL</Label>
              <Input
                id="ogImage"
                name="ogImage"
                type="url"
                defaultValue={site.ogImage || ""}
                placeholder="https://..."
              />
              <p className="text-xs text-zinc-500">
                Recommended size: 1200x630 pixels
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingSeo}>
                {isSavingSeo && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save SEO Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-zinc-500" />
            <CardTitle>Features</CardTitle>
          </div>
          <CardDescription>
            Enable or disable site features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="font-medium text-zinc-950 dark:text-white">Blog</p>
                <p className="text-sm text-zinc-500">
                  Publish articles and updates on your site.
                </p>
              </div>
              <Switch
                checked={blogEnabled}
                onCheckedChange={setBlogEnabled}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="font-medium text-zinc-950 dark:text-white">
                  Client Portal
                </p>
                <p className="text-sm text-zinc-500">
                  Allow clients to log in and view their projects, invoices, and
                  files.
                </p>
              </div>
              <Switch
                checked={portalEnabled}
                onCheckedChange={setPortalEnabled}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="font-medium text-zinc-950 dark:text-white">
                  Online Booking
                </p>
                <p className="text-sm text-zinc-500">
                  Let visitors book appointments directly from your site.
                </p>
              </div>
              <Switch
                checked={bookingEnabled}
                onCheckedChange={setBookingEnabled}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleFeaturesSubmit} disabled={isSavingFeatures}>
                {isSavingFeatures && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Features
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
