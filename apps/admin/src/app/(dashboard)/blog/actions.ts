"use server";

import { revalidatePath } from "next/cache";
import { db, PostStatus, Prisma } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";
import {
  generateBlogPost,
  chatEditBlogContent,
  type ChatEditResult,
} from "@/lib/ai-site-generator";
import { getBusinessContext } from "@/lib/ai";

// ===========================================
// BLOG POST ACTIONS
// ===========================================

export async function getBlogPosts() {
  const { organization } = await requireAuthWithOrg();

  const posts = await db.blogPost.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { firstName: true, lastName: true } },
      categories: { include: { category: true } },
      publications: {
        include: { site: { select: { id: true, name: true } } },
      },
    },
  });

  return posts;
}

export async function getBlogPost(postId: string) {
  const { organization } = await requireAuthWithOrg();

  const post = await db.blogPost.findFirst({
    where: {
      id: postId,
      organizationId: organization.id,
    },
    include: {
      author: { select: { firstName: true, lastName: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      publications: {
        include: { site: { select: { id: true, name: true } } },
      },
    },
  });

  return post;
}

export async function createBlogPost(data: { title: string; slug: string }) {
  const { organization, user } = await requireAuthWithOrg();

  // Check slug uniqueness within organization
  const existing = await db.blogPost.findFirst({
    where: { organizationId: organization.id, slug: data.slug.toLowerCase() },
  });

  if (existing) {
    throw new Error("A blog post with this slug already exists");
  }

  const post = await db.blogPost.create({
    data: {
      organizationId: organization.id,
      authorId: user.id,
      title: data.title,
      slug: data.slug.toLowerCase(),
      content: { type: "doc", content: [{ type: "paragraph" }] },
      status: PostStatus.DRAFT,
    },
  });

  revalidatePath("/blog");

  return post;
}

export async function updateBlogPost(
  postId: string,
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: Prisma.InputJsonValue;
    featuredImage?: string;
    featuredImageAlt?: string;
    status?: PostStatus;
    publishedAt?: Date | null;
    featured?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    categoryIds?: string[];
    tagIds?: string[];
  }
) {
  const { organization } = await requireAuthWithOrg();

  // If slug is being changed, check availability
  if (data.slug) {
    const existing = await db.blogPost.findFirst({
      where: {
        organizationId: organization.id,
        slug: data.slug.toLowerCase(),
        NOT: { id: postId },
      },
    });

    if (existing) {
      throw new Error("A blog post with this slug already exists");
    }
  }

  const { categoryIds, tagIds, ...postData } = data;

  const updateData: Prisma.BlogPostUpdateInput = {
    ...postData,
    slug: data.slug?.toLowerCase(),
  };

  const post = await db.blogPost.update({
    where: {
      id: postId,
      organizationId: organization.id,
    },
    data: updateData,
  });

  // Handle category associations
  if (categoryIds !== undefined) {
    await db.blogPostCategory.deleteMany({ where: { postId } });
    if (categoryIds.length > 0) {
      await db.blogPostCategory.createMany({
        data: categoryIds.map((categoryId) => ({ postId, categoryId })),
      });
    }
  }

  // Handle tag associations
  if (tagIds !== undefined) {
    await db.blogPostTag.deleteMany({ where: { postId } });
    if (tagIds.length > 0) {
      await db.blogPostTag.createMany({
        data: tagIds.map((tagId) => ({ postId, tagId })),
      });
    }
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${postId}`);

  return post;
}

export async function deleteBlogPost(postId: string) {
  const { organization } = await requireAuthWithOrg();

  await db.blogPost.delete({
    where: {
      id: postId,
      organizationId: organization.id,
    },
  });

  revalidatePath("/blog");
}

export async function publishBlogPost(postId: string) {
  const { organization } = await requireAuthWithOrg();

  // Update post status
  const post = await db.blogPost.update({
    where: {
      id: postId,
      organizationId: organization.id,
    },
    data: {
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  // Upsert publication for the org's site
  const site = await db.site.findFirst({
    where: { organizationId: organization.id },
  });

  if (site) {
    await db.blogPostPublication.upsert({
      where: {
        postId_siteId: { postId, siteId: site.id },
      },
      create: {
        postId,
        siteId: site.id,
        slug: post.slug,
      },
      update: {
        slug: post.slug,
      },
    });
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${postId}`);

  return post;
}

export async function unpublishBlogPost(postId: string) {
  const { organization } = await requireAuthWithOrg();

  // Update post status
  const post = await db.blogPost.update({
    where: {
      id: postId,
      organizationId: organization.id,
    },
    data: {
      status: PostStatus.DRAFT,
      publishedAt: null,
    },
  });

  // Remove all publication entries
  await db.blogPostPublication.deleteMany({
    where: { postId },
  });

  revalidatePath("/blog");
  revalidatePath(`/blog/${postId}`);

  return post;
}

// ===========================================
// AI BLOG POST ACTIONS
// ===========================================

/** Helper to build OrganizationContext with BusinessProfile data */
async function getOrgContext(organizationId: string) {
  const ctx = await getBusinessContext(organizationId);
  if (!ctx) throw new Error("Organization not found");
  return ctx;
}

export async function aiCreateBlogPostWithContent(data: {
  topic: string;
  keywords?: string[];
  targetLength?: "short" | "medium" | "long";
}): Promise<{ postId: string }> {
  const { organization, user } = await requireAuthWithOrg();

  const existingPosts = await db.blogPost.findMany({
    where: { organizationId: organization.id },
    select: { title: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const ctx = await getOrgContext(organization.id);

  const generated = await generateBlogPost({
    organizationContext: ctx,
    topic: data.topic,
    keywords: data.keywords,
    targetLength: data.targetLength,
    existingPosts: existingPosts.map((p) => p.title),
  });

  // Generate unique slug
  let slug = generated.slug;
  const existingSlug = await db.blogPost.findFirst({
    where: { organizationId: organization.id, slug },
  });
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  // Auto-create tags
  const tagIds: string[] = [];
  for (const tagName of generated.tags) {
    const tagSlug = tagName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existingTag = await db.blogTag.findFirst({
      where: { organizationId: organization.id, slug: tagSlug },
    });

    if (existingTag) {
      tagIds.push(existingTag.id);
    } else {
      const newTag = await db.blogTag.create({
        data: { organizationId: organization.id, name: tagName, slug: tagSlug },
      });
      tagIds.push(newTag.id);
    }
  }

  // Create the post
  const post = await db.blogPost.create({
    data: {
      organizationId: organization.id,
      authorId: user.id,
      title: generated.title,
      slug,
      excerpt: generated.excerpt,
      content: { html: generated.content },
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      status: PostStatus.DRAFT,
    },
  });

  // Associate tags
  if (tagIds.length > 0) {
    await db.blogPostTag.createMany({
      data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
    });
  }

  revalidatePath("/blog");

  return { postId: post.id };
}

export async function aiChatEditBlogContent(data: {
  currentHtml: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatEditResult> {
  await requireAuthWithOrg();

  const result = await chatEditBlogContent({
    currentHtml: data.currentHtml,
    messages: data.messages,
  });

  return result;
}

// ===========================================
// BLOG CATEGORY ACTIONS
// ===========================================

export async function getBlogCategories() {
  const { organization } = await requireAuthWithOrg();

  const categories = await db.blogCategory.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });

  return categories;
}

export async function createBlogCategory(data: { name: string; slug: string }) {
  const { organization } = await requireAuthWithOrg();

  const existing = await db.blogCategory.findFirst({
    where: { organizationId: organization.id, slug: data.slug.toLowerCase() },
  });

  if (existing) {
    throw new Error("A category with this slug already exists");
  }

  const category = await db.blogCategory.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      slug: data.slug.toLowerCase(),
    },
  });

  revalidatePath("/blog");

  return category;
}

export async function deleteBlogCategory(categoryId: string) {
  const { organization } = await requireAuthWithOrg();

  await db.blogCategory.delete({
    where: {
      id: categoryId,
      organizationId: organization.id,
    },
  });

  revalidatePath("/blog");
}

// ===========================================
// BLOG TAG ACTIONS
// ===========================================

export async function getBlogTags() {
  const { organization } = await requireAuthWithOrg();

  const tags = await db.blogTag.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });

  return tags;
}

export async function createBlogTag(data: { name: string; slug: string }) {
  const { organization } = await requireAuthWithOrg();

  const existing = await db.blogTag.findFirst({
    where: { organizationId: organization.id, slug: data.slug.toLowerCase() },
  });

  if (existing) {
    throw new Error("A tag with this slug already exists");
  }

  const tag = await db.blogTag.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      slug: data.slug.toLowerCase(),
    },
  });

  revalidatePath("/blog");

  return tag;
}

export async function deleteBlogTag(tagId: string) {
  const { organization } = await requireAuthWithOrg();

  await db.blogTag.delete({
    where: {
      id: tagId,
      organizationId: organization.id,
    },
  });

  revalidatePath("/blog");
}
