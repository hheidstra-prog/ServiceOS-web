import { db } from "@servible/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { BlogManager } from "./blog-manager";

export default async function BlogPage() {
  const { organization } = await requireAuthWithOrg();

  const counts = await db.blogPost.groupBy({
    by: ["status"],
    where: { organizationId: organization.id },
    _count: { id: true },
  });

  let totalPosts = 0;
  let publishedCount = 0;
  let draftCount = 0;

  for (const group of counts) {
    totalPosts += group._count.id;
    if (group.status === "PUBLISHED") publishedCount = group._count.id;
    if (group.status === "DRAFT") draftCount = group._count.id;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
          Blog
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create, manage, and publish your blog posts.
        </p>
      </div>
      <BlogManager
        totalPosts={totalPosts}
        publishedCount={publishedCount}
        draftCount={draftCount}
        locale={organization.locale || "en"}
      />
    </div>
  );
}
