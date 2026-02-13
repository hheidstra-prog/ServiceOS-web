import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBlogPost, getBlogCategories, getBlogTags } from "../actions";
import { BlogPostEditor } from "./blog-post-editor";

interface BlogPostPageProps {
  params: Promise<{ postId: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { postId } = await params;

  const [post, categories, tags] = await Promise.all([
    getBlogPost(postId),
    getBlogCategories(),
    getBlogTags(),
  ]);

  if (!post) {
    notFound();
  }

  // Handle both content formats: TipTap JSON and legacy { html: "..." }
  const rawContent = post.content as Record<string, unknown> | null;
  let tiptapContent = null;
  let htmlContent = "";

  if (rawContent) {
    if (rawContent.type === "doc" && Array.isArray(rawContent.content)) {
      // New TipTap JSON format
      tiptapContent = rawContent;
    } else if (typeof rawContent.html === "string") {
      // Legacy HTML format — pass html for chat fallback, no tiptap content
      htmlContent = rawContent.html;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/blog"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {post.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            /blog/{post.slug}
          </p>
        </div>
      </div>

      {/* Editor */}
      <BlogPostEditor
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: tiptapContent,
          htmlContent,
          featuredImage: post.featuredImage,
          featuredImageAlt: post.featuredImageAlt,
          status: post.status,
          publishedAt: post.publishedAt,
          featured: post.featured,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          categoryIds: post.categories.map((c) => c.category.id),
          tagIds: post.tags.map((t) => t.tag.id),
        }}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
