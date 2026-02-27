"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Newspaper,
  Sparkles,
  Star,
  FileText,
  Lightbulb,
  PenLine,
  RotateCcw,
  Edit,
  Tag,
  FolderOpen,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cloudinaryThumb } from "@/lib/file-utils";
import { BlogChat } from "./blog-chat";
import type { BlogChatResultPayload } from "./blog-chat";
import type { BlogPostResult } from "./blog-chat-actions";
import { refreshBlogPostResults, getRecentBlogPosts } from "./blog-chat-actions";

interface BlogManagerProps {
  totalPosts: number;
  publishedCount: number;
  draftCount: number;
  locale: string;
}

const statusBadgeStyles: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  PUBLISHED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  SCHEDULED: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ARCHIVED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const quickActions = [
  { label: "Show all posts", icon: FileText },
  { label: "Show drafts", icon: Newspaper },
  { label: "Write a new blog", icon: PenLine },
  { label: "Suggest topics", icon: Lightbulb },
];

export function BlogManager({
  totalPosts,
  publishedCount,
  draftCount,
  locale,
}: BlogManagerProps) {
  const router = useRouter();
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [currentPostResults, setCurrentPostResults] = useState<
    BlogPostResult[]
  >([]);
  const [initialPosts, setInitialPosts] = useState<BlogPostResult[]>([]);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPostResult | null>(null);

  // Load recent posts on mount for instant display
  useEffect(() => {
    if (totalPosts > 0) {
      getRecentBlogPosts(20).then((posts) => setInitialPosts(posts)).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-navigate to editor after post creation
  useEffect(() => {
    if (createdPostId) {
      const timer = setTimeout(() => {
        router.push(`/blog/${createdPostId}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [createdPostId, router]);

  const handleResults = async (results: BlogChatResultPayload) => {
    setCurrentPostResults(results.postResults);
    // Refresh from DB to pick up any edits made in the editor
    if (results.postResults.length > 0) {
      try {
        const ids = results.postResults.map((p) => p.id);
        const fresh = await refreshBlogPostResults(ids);
        if (fresh.length > 0) {
          setCurrentPostResults(fresh);
        }
      } catch {
        // Keep stale results if refresh fails
      }
    }
  };

  const handlePostCreated = (postId: string) => {
    setCreatedPostId(postId);
  };

  const handleClearChat = () => {
    setChatKey((k) => k + 1);
    setCurrentPostResults([]);
    setCreatedPostId(null);
    setExternalMessage(null);
    try {
      sessionStorage.removeItem("blog-chat-messages");
    } catch {
      // ignore
    }
  };

  const hasResults = currentPostResults.length > 0;

  return (
    <div className="relative flex w-full min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      {/* Left panel: Chat */}
      <div className="flex w-full min-h-0 shrink-0 flex-col rounded-lg border border-zinc-200 bg-white lg:w-[380px] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-950 dark:text-white">
            Blog Assistant
          </span>
          <button
            onClick={handleClearChat}
            title="New conversation"
            className="ml-auto rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <BlogChat
          key={chatKey}
          externalMessage={externalMessage}
          onExternalMessageConsumed={() => setExternalMessage(null)}
          onResults={handleResults}
          onPostCreated={handlePostCreated}
          initialPostResults={initialPosts.length > 0 ? initialPosts : undefined}
          locale={locale}
        />
      </div>

      {/* Right panel: Results */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {hasResults ? (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-xs font-medium text-zinc-500">
              {currentPostResults.length} post
              {currentPostResults.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentPostResults.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
                >
                  {/* Featured image or placeholder */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    {post.featuredImage ? (
                      <img
                        src={cloudinaryThumb(post.featuredImage, 500, 280)}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Newspaper className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                      </div>
                    )}
                    {/* Status badge */}
                    <span
                      className={`absolute left-2 top-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        statusBadgeStyles[post.status] ||
                        statusBadgeStyles.DRAFT
                      }`}
                    >
                      {post.status.charAt(0) +
                        post.status.slice(1).toLowerCase()}
                    </span>
                    {/* Featured star */}
                    {post.featured && (
                      <Star className="absolute right-2 top-2 h-4 w-4 fill-amber-400 text-amber-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-3">
                    {/* Date */}
                    <p className="text-[10px] text-zinc-400">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString(
                            "nl-NL"
                          )
                        : new Date(post.createdAt).toLocaleDateString("nl-NL")}
                    </p>
                    {/* Title */}
                    <h3 className="mt-1 line-clamp-2 text-sm font-medium text-zinc-950 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                      {post.title}
                    </h3>
                    {/* Excerpt */}
                    {post.excerpt && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                        {post.excerpt}
                      </p>
                    )}
                    {/* Category pills */}
                    {post.categories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.categories.map((c) => (
                          <span
                            key={c.name}
                            className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-600 dark:bg-violet-500/15 dark:text-violet-200"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Landing state */
          <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-950 dark:text-white">
                Blog Assistant
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                {totalPosts > 0 ? (
                  <>
                    {totalPosts} post{totalPosts !== 1 ? "s" : ""} ({publishedCount}{" "}
                    published, {draftCount} draft{draftCount !== 1 ? "s" : ""})
                  </>
                ) : (
                  "No blog posts yet. Start by writing your first post."
                )}
              </p>

              {/* Quick-action chips */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {quickActions.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => setExternalMessage(label)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post Detail Sheet */}
      <Sheet
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Post Details</SheetTitle>
          </SheetHeader>

          {selectedPost && (
            <div className="mt-6 space-y-6 px-4">
              {/* Featured image preview */}
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                {selectedPost.featuredImage ? (
                  <img
                    src={cloudinaryThumb(selectedPost.featuredImage, 500, 280)}
                    alt={selectedPost.title}
                    className="max-h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center">
                    <Newspaper className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
                  {selectedPost.title}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  /{selectedPost.slug}
                </p>
              </div>

              {/* Edit button */}
              <Button asChild className="w-full">
                <Link href={`/blog/${selectedPost.id}`}>
                  <Edit className="mr-1.5 h-4 w-4" />
                  Open in Editor
                </Link>
              </Button>

              {/* Excerpt */}
              {selectedPost.excerpt && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-500">Excerpt</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedPost.excerpt}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <FileText className="h-3 w-3" />
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                      statusBadgeStyles[selectedPost.status] ||
                      statusBadgeStyles.DRAFT
                    }`}
                  >
                    {selectedPost.status.charAt(0) +
                      selectedPost.status.slice(1).toLowerCase()}
                  </span>
                </div>
                {selectedPost.featured && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <Star className="h-3 w-3" />
                      Featured
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Yes
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <Clock className="h-3 w-3" />
                    Created
                  </span>
                  <span className="text-zinc-950 dark:text-white">
                    {new Date(selectedPost.createdAt).toLocaleDateString(
                      "nl-NL"
                    )}
                  </span>
                </div>
                {selectedPost.publishedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <Calendar className="h-3 w-3" />
                      Published
                    </span>
                    <span className="text-zinc-950 dark:text-white">
                      {new Date(selectedPost.publishedAt).toLocaleDateString(
                        "nl-NL"
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Categories */}
              {selectedPost.categories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                    <FolderOpen className="h-3 w-3" />
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPost.categories.map((c) => (
                      <span
                        key={c.name}
                        className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-500/15 dark:text-violet-200"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedPost.tags.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                    <Tag className="h-3 w-3" />
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPost.tags.map((t) => (
                      <span
                        key={t.name}
                        className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
