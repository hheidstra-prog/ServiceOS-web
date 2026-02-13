import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogCreationChat } from "./blog-creation-chat";

export default function BlogNewPage() {
  return (
    <div className="space-y-4">
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
            New Blog Post
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create a new blog post with AI assistance.
          </p>
        </div>
      </div>

      {/* Chat-First Creation */}
      <BlogCreationChat />
    </div>
  );
}
