import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@serviceos/database";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { BlogContent } from "@/components/blog/blog-content";
import { format } from "date-fns";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";

interface BlogPostPageProps {
  params: Promise<{ domain: string; slug: string }>;
}

async function getPost(domain: string, slug: string) {
  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      blogEnabled: true,
    },
    select: { id: true, name: true },
  });

  if (!site) return null;

  // Find post through publication
  const publication = await db.blogPostPublication.findUnique({
    where: {
      siteId_slug: { siteId: site.id, slug },
    },
    select: { postId: true },
  });

  if (!publication) return null;

  const post = await db.blogPost.findFirst({
    where: {
      id: publication.postId,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
          imageUrl: true,
        },
      },
      categories: {
        include: { category: true },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!post) return null;

  // Get related posts (also published to this site)
  const relatedPosts = await db.blogPost.findMany({
    where: {
      publications: { some: { siteId: site.id } },
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: { not: post.id },
      OR: post.categories.length > 0
        ? [
            {
              categories: {
                some: {
                  categoryId: {
                    in: post.categories.map((c) => c.categoryId),
                  },
                },
              },
            },
          ]
        : undefined,
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: {
      publications: {
        where: { siteId: site.id },
        select: { slug: true },
      },
    },
  });

  return { site, post, relatedPosts };
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { domain, slug } = await params;
  const data = await getPost(domain, slug);

  if (!data) {
    return { title: "Post Not Found" };
  }

  const { post } = data;

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      images: post.featuredImage ? [post.featuredImage] : undefined,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { domain, slug } = await params;
  const data = await getPost(domain, slug);

  if (!data) {
    notFound();
  }

  const { post, relatedPosts } = data;

  const authorName = post.author
    ? `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim()
    : null;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface">
        <article>
          {/* Header */}
          <header className="bg-surface-alt py-12 sm:py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              {/* Back link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-on-surface-secondary hover:text-on-surface mb-8"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to blog
              </Link>

              {/* Categories */}
              {post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories.map(({ category }) => (
                    <Link
                      key={category.slug}
                      href={`/blog?category=${category.slug}`}
                      className="rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 hover:bg-primary-200"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="mt-4 text-xl text-on-surface-secondary">{post.excerpt}</p>
              )}

              {/* Meta */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-on-surface-muted">
                {authorName && (
                  <div className="flex items-center gap-2">
                    {post.author?.imageUrl ? (
                      <Image
                        src={post.author.imageUrl}
                        alt={authorName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-sm font-medium text-on-surface-secondary">
                        {authorName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-on-surface">{authorName}</p>
                      <p className="text-on-surface-muted">Author</p>
                    </div>
                  </div>
                )}

                {post.publishedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.publishedAt.toISOString()}>
                      {format(new Date(post.publishedAt), "MMMM d, yyyy")}
                    </time>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-4">
              <div className="relative aspect-[2/1] overflow-hidden rounded-xl">
                <Image
                  src={post.featuredImage}
                  alt={post.featuredImageAlt || post.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <BlogContent content={post.content as Record<string, unknown>} />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-border pt-8">
                <Tag className="h-4 w-4 text-on-surface-muted" />
                {post.tags.map(({ tag }) => (
                  <span
                    key={tag.slug}
                    className="rounded-full bg-surface-alt px-3 py-1 text-sm text-on-surface-secondary"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-border bg-surface-alt py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-on-surface">
                Related Articles
              </h2>
              <div className="mt-8 grid gap-8 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.publications[0]?.slug || related.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-alt">
                      {related.featuredImage ? (
                        <Image
                          src={related.featuredImage}
                          alt={related.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-3xl text-on-surface-muted">&#x1f4dd;</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 font-semibold text-on-surface group-hover:text-on-surface-secondary line-clamp-2">
                      {related.title}
                    </h3>
                    {related.excerpt && (
                      <p className="mt-2 text-sm text-on-surface-secondary line-clamp-2">
                        {related.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
