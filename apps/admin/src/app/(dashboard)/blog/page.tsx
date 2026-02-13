import { getBlogPosts, getBlogCategories, getBlogTags } from "./actions";
import { BlogManager } from "./blog-manager";

export default async function BlogPage() {
  const [posts, categories, tags] = await Promise.all([
    getBlogPosts(),
    getBlogCategories(),
    getBlogTags(),
  ]);

  return (
    <div className="space-y-6">
      <BlogManager posts={posts} categories={categories} tags={tags} />
    </div>
  );
}
