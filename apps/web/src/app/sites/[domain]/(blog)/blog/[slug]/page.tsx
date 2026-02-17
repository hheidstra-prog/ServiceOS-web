import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@serviceos/database";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { BlogContent } from "@/components/blog/blog-content";
import { extractHeadings } from "@/components/blog/blog-utils";
import { format } from "date-fns";
import { ArrowLeft, Calendar, User, Tag, ArrowRight } from "lucide-react";
import { isPreviewMode } from "@/lib/preview";

export const dynamic = "force-dynamic";

interface BlogPostPageProps {
  params: Promise<{ domain: string; slug: string }>;
}

async function getPost(domain: string, slug: string) {
  const preview = await isPreviewMode(domain);

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      ...(preview ? {} : { status: "PUBLISHED" }),
      blogEnabled: true,
    },
    select: {
      id: true,
      name: true,
      bookingEnabled: true,
      organization: {
        select: { name: true, locale: true, logo: true },
      },
    },
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
      ...(preview ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
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
      ...(preview ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
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

  const { site, post, relatedPosts } = data;

  const authorName = post.author
    ? `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim()
    : null;

  const locale = site.organization.locale || "en";
  const sidebar = {
    nl: { toc: "Inhoudsopgave", book: "Afspraak maken", bookDesc: "Bespreek uw situatie met een expert.", bookBtn: "Plan een gesprek", related: "Gerelateerde artikelen", readMore: "Lees meer" },
    en: { toc: "Table of Contents", book: "Book a Consultation", bookDesc: "Discuss your situation with an expert.", bookBtn: "Schedule a call", related: "Related Articles", readMore: "Read more" },
    de: { toc: "Inhaltsverzeichnis", book: "Beratung buchen", bookDesc: "Besprechen Sie Ihre Situation mit einem Experten.", bookBtn: "Gespräch planen", related: "Verwandte Artikel", readMore: "Mehr lesen" },
    fr: { toc: "Sommaire", book: "Prendre rendez-vous", bookDesc: "Discutez de votre situation avec un expert.", bookBtn: "Planifier un appel", related: "Articles connexes", readMore: "Lire la suite" },
  };
  const s = sidebar[locale as keyof typeof sidebar] || sidebar.en;
  const headings = extractHeadings(post.content as Record<string, unknown>);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface">
        <article>
          {/* Header area — full width */}
          <div className="bg-surface-alt">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Back link */}
              <div className="pt-8 pb-6">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm text-on-surface-secondary hover:text-on-surface"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to blog
                </Link>
              </div>

              {/* Featured Image */}
              {post.featuredImage && (
                <div className="relative aspect-[2/1] overflow-hidden rounded-xl">
                  <Image
                    src={post.featuredImage}
                    alt={post.featuredImageAlt || post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Title & Meta */}
              <header className="py-8 sm:py-10">
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

                <h1 className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="mt-4 text-xl text-on-surface-secondary">{post.excerpt}</p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-on-surface-muted">
                  {authorName && (
                    <div className="flex items-center gap-2">
                      {post.author?.imageUrl ? (
                        <Image
                          src={post.author.imageUrl}
                          alt={authorName}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-sm font-medium text-on-surface-secondary">
                          {authorName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-on-surface">{authorName}</span>
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
              </header>
            </div>
          </div>

          {/* Two-column content area */}
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-12">
              {/* Article body */}
              <div className="min-w-0">
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

              {/* Sidebar */}
              <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-6">
                  {/* Table of Contents */}
                  {headings.length > 1 && (
                    <nav className="rounded-xl border border-border bg-card p-6">
                      <h3 className="font-semibold text-on-surface mb-3">{s.toc}</h3>
                      <ul className="space-y-2 text-sm">
                        {headings.map((heading) => (
                          <li
                            key={heading.id}
                            style={{ paddingLeft: heading.level > 1 ? `${(heading.level - 1) * 0.75}rem` : undefined }}
                          >
                            <a
                              href={`#${heading.id}`}
                              className="text-on-surface-secondary hover:text-on-surface transition-colors line-clamp-1"
                            >
                              {heading.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}

                  {/* Author / Organization card */}
                  <div className="rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3">
                      {authorName ? (
                        <>
                          {post.author?.imageUrl ? (
                            <Image
                              src={post.author.imageUrl}
                              alt={authorName}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-lg font-medium text-on-surface-secondary">
                              {authorName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-on-surface">{authorName}</p>
                            <p className="text-sm text-on-surface-muted">{site.organization.name}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {site.organization.logo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={site.organization.logo}
                              alt={site.organization.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-lg font-medium text-on-surface-secondary">
                              {site.organization.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-on-surface">{site.organization.name}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CTA — Book a consultation */}
                  {site.bookingEnabled && (
                    <div className="rounded-xl border border-primary-500/30 bg-card p-6">
                      <h3 className="font-semibold text-on-surface">{s.book}</h3>
                      <p className="mt-2 text-sm text-on-surface-secondary">
                        {s.bookDesc}
                      </p>
                      <Link
                        href="/book"
                        className="btn-primary mt-4 w-full text-sm inline-flex items-center justify-center gap-2"
                      >
                        {s.bookBtn}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  {/* Related posts */}
                  {relatedPosts.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h3 className="font-semibold text-on-surface mb-4">{s.related}</h3>
                      <div className="space-y-4">
                        {relatedPosts.map((related) => (
                          <Link
                            key={related.id}
                            href={`/blog/${related.publications[0]?.slug || related.slug}`}
                            className="group block"
                          >
                            <div className="flex gap-3">
                              {related.featuredImage && (
                                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                  <Image
                                    src={related.featuredImage}
                                    alt={related.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium text-on-surface group-hover:text-on-surface-secondary line-clamp-2">
                                  {related.title}
                                </h4>
                                {related.excerpt && (
                                  <p className="mt-1 text-xs text-on-surface-muted line-clamp-1">
                                    {related.excerpt}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories */}
                  {post.categories.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h3 className="font-semibold text-on-surface mb-3">Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {post.categories.map(({ category }) => (
                          <Link
                            key={category.slug}
                            href={`/blog?category=${category.slug}`}
                            className="rounded-full bg-surface-alt px-3 py-1 text-sm text-on-surface-secondary hover:text-on-surface"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </article>

        {/* Related Posts — full width (mobile + fallback) */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-border bg-surface-alt py-16 lg:hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-on-surface">
                {s.related}
              </h2>
              <div className="mt-8 grid gap-8 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.publications[0]?.slug || related.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-card">
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
