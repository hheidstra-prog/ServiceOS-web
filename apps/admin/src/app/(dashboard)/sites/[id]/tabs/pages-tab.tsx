"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  ExternalLink,
  Eye,
  Home,
  Sparkles,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/utils";
import { createPage, deletePage, aiCreatePageWithContent } from "../../actions";

interface Page {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  isHomepage: boolean;
}

interface Site {
  id: string;
  subdomain: string;
  customDomain: string | null;
  status: string;
  pages: Page[];
}

interface PagesTabProps {
  site: Site;
  previewToken: string | null;
}

export function PagesTab({ site, previewToken }: PagesTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAIFormOpen, setIsAIFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slug, setSlug] = useState("");
  const [aiPageType, setAIPageType] = useState<"home" | "about" | "services" | "contact" | "custom">("about");
  const [aiPageTitle, setAIPageTitle] = useState("");
  const [aiPageDescription, setAIPageDescription] = useState("");

  const siteUrl = getSiteUrl(site);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      await createPage(site.id, {
        title: formData.get("title") as string,
        slug: formData.get("slug") as string,
      });
      toast.success("Page created successfully");
      setIsFormOpen(false);
      setSlug("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create page"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pageId: string, pageTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${pageTitle}"?`)) return;

    try {
      await deletePage(site.id, pageId);
      toast.success("Page deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete page"
      );
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      await aiCreatePageWithContent(site.id, {
        pageType: aiPageType,
        pageTitle: aiPageType === "custom" ? aiPageTitle : undefined,
        pageDescription: aiPageDescription || undefined,
      });
      toast.success("Page created with AI-generated content!");
      setIsAIFormOpen(false);
      setAIPageType("about");
      setAIPageTitle("");
      setAIPageDescription("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate page"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Pages
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your site pages and content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Page
          </Button>
          <Button onClick={() => setIsAIFormOpen(true)}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate with AI
          </Button>
        </div>
      </div>

      {/* Pages List */}
      {site.pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-950">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-900">
            <FileText className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            No pages yet
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create your first page to get started.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => setIsFormOpen(true)} size="sm" variant="outline">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Page
            </Button>
            <Button onClick={() => setIsAIFormOpen(true)} size="sm">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Generate with AI
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Page
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {site.pages.map((page) => (
                  <tr
                    key={page.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                          {page.isHomepage ? (
                            <Home className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/sites/${site.id}/pages/${page.id}`}
                            className="font-medium text-zinc-950 hover:underline dark:text-white"
                          >
                            {page.title}
                          </Link>
                          {page.isHomepage && (
                            <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                              Homepage
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      /{page.slug || ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          page.isPublished
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {page.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/sites/${site.id}/pages/${page.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Page
                            </Link>
                          </DropdownMenuItem>
                          {site.status === "PUBLISHED" && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`${siteUrl}/${page.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Live
                              </a>
                            </DropdownMenuItem>
                          )}
                          {previewToken && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`${siteUrl}/${page.slug}?preview=${previewToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </a>
                            </DropdownMenuItem>
                          )}
                          {!page.isHomepage && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(page.id, page.title)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Page
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Page Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Add a new page to your site.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="About Us"
                required
                onChange={handleTitleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center">
                <span className="flex h-9 items-center rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  /
                </span>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="about-us"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  pattern="[a-z0-9-/]+"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Only lowercase letters, numbers, hyphens, and slashes allowed.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Create Page
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Generate Page Dialog */}
      <Dialog open={isAIFormOpen} onOpenChange={setIsAIFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Generate Page with AI
            </DialogTitle>
            <DialogDescription>
              Let AI create page content based on your site and business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pageType">Page Type</Label>
              <Select
                value={aiPageType}
                onValueChange={(v) => setAIPageType(v as typeof aiPageType)}
                disabled={isGenerating}
              >
                <SelectTrigger id="pageType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="about">About - Company story and values</SelectItem>
                  <SelectItem value="services">Services - Service offerings</SelectItem>
                  <SelectItem value="contact">Contact - Contact form and info</SelectItem>
                  <SelectItem value="custom">Custom - Specify your own</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aiPageType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="aiPageTitle">Page Title</Label>
                <Input
                  id="aiPageTitle"
                  placeholder="e.g., Our Process, FAQ, Pricing..."
                  value={aiPageTitle}
                  onChange={(e) => setAIPageTitle(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="aiPageDescription">Additional Context (optional)</Label>
              <Textarea
                id="aiPageDescription"
                placeholder="Any specific information or requirements for this page..."
                value={aiPageDescription}
                onChange={(e) => setAIPageDescription(e.target.value)}
                rows={3}
                disabled={isGenerating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAIFormOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button onClick={handleAIGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Generate Page
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
