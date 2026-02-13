"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Star,
  Loader2,
  Tag,
  FolderOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  deleteBlogPost,
  createBlogCategory,
  deleteBlogCategory,
  createBlogTag,
  deleteBlogTag,
} from "./actions";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: Date | null;
  featured: boolean;
  createdAt: Date;
  author: { firstName: string | null; lastName: string | null } | null;
  categories: Array<{ category: { id: string; name: string } }>;
  publications: Array<{ site: { id: string; name: string } }>;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

interface BlogManagerProps {
  posts: BlogPost[];
  categories: BlogCategory[];
  tags: BlogTag[];
}

const statusBadgeStyles: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  PUBLISHED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  SCHEDULED: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ARCHIVED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function BlogManager({ posts, categories, tags }: BlogManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const handleDelete = async (postId: string, postTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${postTitle}"?`)) return;

    try {
      await deleteBlogPost(postId);
      toast.success("Blog post deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete post"
      );
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);

    try {
      const categorySlug = newCategoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      await createBlogCategory({
        name: newCategoryName.trim(),
        slug: categorySlug,
      });
      toast.success("Category created");
      setNewCategoryName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create category"
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteBlogCategory(categoryId);
      toast.success("Category deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category"
      );
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);

    try {
      const tagSlug = newTagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      await createBlogTag({
        name: newTagName.trim(),
        slug: tagSlug,
      });
      toast.success("Tag created");
      setNewTagName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create tag"
      );
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteBlogTag(tagId);
      toast.success("Tag deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete tag"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Blog
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your blog posts, categories, and tags.
          </p>
        </div>
        <Button asChild>
          <Link href="/blog/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      {/* Posts Table */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-950">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-900">
            <Newspaper className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            No blog posts yet
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create your first blog post to get started.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/blog/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                        <Newspaper className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <Link
                          href={`/blog/${post.id}`}
                          className="font-medium text-zinc-950 hover:underline dark:text-white"
                        >
                          {post.title}
                        </Link>
                        {post.featured && (
                          <Star className="ml-1.5 inline h-3.5 w-3.5 text-amber-500" />
                        )}
                        {post.categories.length > 0 && (
                          <span className="ml-2 text-xs text-zinc-500">
                            {post.categories.map((c) => c.category.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        statusBadgeStyles[post.status] || statusBadgeStyles.DRAFT
                      }`}
                    >
                      {post.status.charAt(0) + post.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("nl-NL")
                      : new Date(post.createdAt).toLocaleDateString("nl-NL")}
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
                          <Link href={`/blog/${post.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Post
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(post.id, post.title)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories & Tags */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4" />
              Categories
            </CardTitle>
            <CardDescription>Organize your posts into categories.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                disabled={isCreatingCategory}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || isCreatingCategory}
              >
                {isCreatingCategory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-zinc-500">No categories yet.</p>
            ) : (
              <div className="space-y-1">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span className="text-zinc-950 dark:text-white">
                      {category.name}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Tags
            </CardTitle>
            <CardDescription>Add tags to your posts for filtering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                disabled={isCreatingTag}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
              >
                {isCreatingTag ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {tags.length === 0 ? (
              <p className="text-sm text-zinc-500">No tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
