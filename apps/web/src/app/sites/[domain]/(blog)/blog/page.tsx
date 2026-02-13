import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@serviceos/database";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { formatDistanceToNow } from "date-fns";

interface BlogPageProps {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ page?: string; category?: string }>;
}

async function getSiteAndPosts(
  domain: string,
  page: number = 1,
  categorySlug?: string
) {
  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      blogEnabled: true,
    },
    select: { id: true, name: true, organizationId: true },
  });

  if (!site) return null;

  const perPage = 12;
  const skip = (page - 1) * perPage;

  // Build where clause — query through publications
  const where: Record<string, unknown> = {
    publications: { some: { siteId: site.id } },
    status: "PUBLISHED",
    publishedAt: { lte: new Date() },
  };

  if (categorySlug) {
    where.categories = {
      some: {
        category: { slug: categorySlug },
      },
    };
  }

  const [posts, total, categories] = await Promise.all([
    db.blogPost.findMany({
      where,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      skip,
      take: perPage,
      include: {
        author: {
          select: { firstName: true, lastName: true, imageUrl: true },
        },
        categories: {
          include: { category: true },
        },
        publications: {
          where: { siteId: site.id },
          select: { slug: true },
        },
      },
    }),
    db.blogPost.count({ where }),
    db.blogCategory.findMany({
      where: { organizationId: site.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    site,
    posts,
    categories,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { domain } = await params;
  const data = await getSiteAndPosts(domain);

  if (!data) {
    return { title: "Blog Not Found" };
  }

  return {
    title: "Blog",
    description: `Latest articles and updates from ${data.site.name}`,
  };
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { domain } = await params;
  const { page, category } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;

  const data = await getSiteAndPosts(domain, currentPage, category);

  if (!data) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-on-surface">Blog not available</h1>
            <p className="mt-2 text-on-surface-secondary">
              This site does not have a blog enabled.
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { posts, categories, pagination } = data;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface">
        {/* Header */}
        <section className="bg-surface-alt py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface">
              Blog
            </h1>
            <p className="mt-4 text-lg text-on-surface-secondary">
              Latest articles, insights, and updates.
            </p>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                <Link
                  href="/blog"
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    !category
                      ? "bg-on-surface text-surface"
                      : "bg-card text-on-surface-secondary hover:bg-card-hover"
                  }`}
                >
                  All
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/blog?category=${cat.slug}`}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      category === cat.slug
                        ? "bg-on-surface text-surface"
                        : "bg-card text-on-surface-secondary hover:bg-card-hover"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-on-surface-secondary">No posts found.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center gap-2">
                    {pagination.page > 1 && (
                      <Link
                        href={`/blog?page=${pagination.page - 1}${category ? `&category=${category}` : ""}`}
                        className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-on-surface-secondary hover:bg-card-hover"
                      >
                        Previous
                      </Link>
                    )}
                    <span className="flex items-center px-4 text-sm text-on-surface-secondary">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    {pagination.page < pagination.totalPages && (
                      <Link
                        href={`/blog?page=${pagination.page + 1}${category ? `&category=${category}` : ""}`}
                        className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-on-surface-secondary hover:bg-card-hover"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  publishedAt: Date | null;
  featured: boolean;
  author: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | null;
  categories: Array<{
    category: {
      name: string;
      slug: string;
    };
  }>;
  publications: Array<{
    slug: string;
  }>;
}

function BlogCard({ post }: { post: BlogPost }) {
  const authorName = post.author
    ? `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim()
    : null;
  const displaySlug = post.publications[0]?.slug || post.slug;

  return (
    <article className="group">
      <Link href={`/blog/${displaySlug}`}>
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-alt">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.featuredImageAlt || post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl text-on-surface-muted">&#x1f4dd;</span>
            </div>
          )}
          {post.featured && (
            <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white">
              Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className="mt-4">
          {/* Categories */}
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {post.categories.slice(0, 2).map(({ category }) => (
                <span
                  key={category.slug}
                  className="text-xs font-medium text-primary-600"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-lg font-semibold text-on-surface group-hover:text-on-surface-secondary line-clamp-2">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-2 text-sm text-on-surface-secondary line-clamp-2">
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="mt-4 flex items-center gap-3 text-sm text-on-surface-muted">
            {authorName && (
              <div className="flex items-center gap-2">
                {post.author?.imageUrl ? (
                  <Image
                    src={post.author.imageUrl}
                    alt={authorName}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-xs font-medium text-on-surface-secondary">
                    {authorName.charAt(0)}
                  </div>
                )}
                <span>{authorName}</span>
              </div>
            )}
            {post.publishedAt && (
              <span>
                {formatDistanceToNow(new Date(post.publishedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
