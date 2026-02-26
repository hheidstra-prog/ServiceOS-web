"use server";

import { revalidatePath } from "next/cache";
import { db, PostStatus, Prisma } from "@servible/database";
import { requireAuthWithOrg } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateBlogPost,
  generateSEOMetadata,
  regenerateTitleAndExcerpt,
  chatEditBlogContent,
  inlineEditSelection,
  type ChatEditResult,
} from "@/lib/ai-site-generator";
import {
  searchFreepikImages,
  downloadAndStoreFreepikImage,
  type FreepikImage,
} from "@/lib/freepik";
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

export async function publishBlogPost(postId: string, siteIds: string[]) {
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

  // Upsert publications for selected sites
  for (const siteId of siteIds) {
    await db.blogPostPublication.upsert({
      where: {
        postId_siteId: { postId, siteId },
      },
      create: {
        postId,
        siteId,
        slug: post.slug,
      },
      update: {
        slug: post.slug,
      },
    });
  }

  // Remove publications for sites NOT in the array
  if (siteIds.length > 0) {
    await db.blogPostPublication.deleteMany({
      where: {
        postId,
        siteId: { notIn: siteIds },
      },
    });
  } else {
    await db.blogPostPublication.deleteMany({
      where: { postId },
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

export async function getOrganizationSites() {
  const { organization } = await requireAuthWithOrg();

  const sites = await db.site.findMany({
    where: { organizationId: organization.id },
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: "asc" },
  });

  return sites;
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

export async function aiInlineEditSelection(data: {
  selectedHtml: string;
  fullDocumentHtml: string;
  instruction: string;
}): Promise<{ updatedHtml: string }> {
  await requireAuthWithOrg();
  return inlineEditSelection(data);
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
// AI IMAGE SEARCH & INSERT
// ===========================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const IMAGE_SEARCH_MODEL = "claude-sonnet-4-20250514";

const IMAGE_SEARCH_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_archive",
    description:
      "Search the organization's file archive for images. Matches against file name, AI description, and tags. Always try this first before searching stock.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search text to match against image names, descriptions, and tags",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_stock",
    description:
      "Search Freepik stock images. Only use this if the archive search returned fewer than 3 good results.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for stock images",
        },
      },
      required: ["query"],
    },
  },
];

export type ImageCandidate = {
  source: "archive" | "stock";
  fileId?: string;
  stockResourceId?: number;
  url: string;
  name: string;
  description?: string | null;
  stockLicense?: "free" | "premium";
};

export type AiFindImageResult = {
  candidates: ImageCandidate[];
  message: string;
};

export async function aiFindAndInsertImage(data: {
  instruction: string;
  contextBefore: string;
  contextAfter: string;
  fullDocumentHtml: string;
}): Promise<AiFindImageResult> {
  const { organization } = await requireAuthWithOrg();

  const ctx = await getOrgContext(organization.id);
  const locale = ctx.locale || "en";
  const localeInstructions: Record<string, string> = {
    nl: "Respond in Dutch.",
    en: "Respond in English.",
    de: "Respond in German.",
    fr: "Respond in French.",
  };

  const systemPrompt = `You are an image finder for a blog editor. The user wants to insert an image into their blog post.
${localeInstructions[locale] || `Respond in the language matching locale "${locale}".`}

Your job:
1. Read the blog content context to understand what kind of image fits.
2. Call search_archive with a short keyword query (1-3 words).
3. If the archive returned fewer than 3 results, ALSO call search_stock to find more options.
4. Return ALL results to the user — do NOT pick one yourself.

CRITICAL RULES:
- ALWAYS search in English, even if the user writes in another language. File names, tags, and descriptions in the archive are in English. Translate the user's request to English keywords before searching.
- Use short, broad search queries (e.g. "business woman" not "professional businesswoman in office").
- Do NOT select or pick a single image. Return all search results so the user can choose.
- CONCISE RESPONSES — the UI renders an image grid with thumbnails. Do NOT list file IDs, URLs, descriptions, or thumbnails in your text. Reply in 1-2 sentences max (e.g. "I found 5 images from your archive — click one to insert it.").`;

  const userMessage = `The user asked: "${data.instruction}"

Blog content before cursor:
"""
${data.contextBefore.slice(-500)}
"""

Blog content after cursor:
"""
${data.contextAfter.slice(0, 500)}
"""

Search for images that would fit here. Return all candidates.`;

  const apiMessages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // Collect candidates across all tool-use iterations
  const archiveCandidates: ImageCandidate[] = [];
  const stockCandidates: ImageCandidate[] = [];

  let iterations = 0;
  const maxIterations = 5;

  let response = await anthropic.messages.create({
    model: IMAGE_SEARCH_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools: IMAGE_SEARCH_TOOLS,
    messages: apiMessages,
  });

  while (response.stop_reason === "tool_use" && iterations < maxIterations) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
        b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const input = block.input as Record<string, unknown>;

      switch (block.name) {
        case "search_archive": {
          const query = input.query as string;
          const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
          const orConditions: Prisma.FileWhereInput[] = [
            { name: { contains: query, mode: "insensitive" } },
            { aiDescription: { contains: query, mode: "insensitive" } },
            { tags: { hasSome: keywords } },
          ];
          for (const kw of keywords) {
            orConditions.push({ aiDescription: { contains: kw, mode: "insensitive" } });
            orConditions.push({ name: { contains: kw, mode: "insensitive" } });
          }
          const where: Prisma.FileWhereInput = {
            organizationId: organization.id,
            mediaType: "IMAGE",
            OR: orConditions,
          };

          const files = await db.file.findMany({
            where,
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              url: true,
              cloudinaryUrl: true,
              aiDescription: true,
              tags: true,
            },
          });

          // Collect archive candidates
          for (const f of files) {
            if (!archiveCandidates.some((c) => c.fileId === f.id)) {
              archiveCandidates.push({
                source: "archive",
                fileId: f.id,
                url: f.cloudinaryUrl || f.url,
                name: f.name,
                description: f.aiDescription,
              });
            }
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({
              count: files.length,
              files: files.map((f) => ({
                id: f.id,
                name: f.name,
                description: f.aiDescription,
                tags: f.tags,
              })),
            }),
          });
          break;
        }

        case "search_stock": {
          const query = input.query as string;
          // Only fetch free stock images (premium requires a paid Freepik license)
          const result = await searchFreepikImages({ query, limit: 8, filters: { license: "freemium" } });

          // Collect stock candidates
          for (const img of result.images) {
            if (!stockCandidates.some((c) => c.stockResourceId === img.id)) {
              const isFree = img.licenses.some((l) => l.type === "freemium");
              stockCandidates.push({
                source: "stock",
                stockResourceId: img.id,
                url: img.thumbnail.url,
                name: img.title,
                stockLicense: isFree ? "free" : "premium",
              });
            }
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({
              count: result.images.length,
              images: result.images.map((img: FreepikImage) => ({
                id: img.id,
                title: img.title,
                author: img.author.name,
              })),
            }),
          });
          break;
        }

        default:
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ error: `Unknown tool: ${block.name}` }),
          });
      }
    }

    response = await anthropic.messages.create({
      model: IMAGE_SEARCH_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: IMAGE_SEARCH_TOOLS,
      messages: [
        ...apiMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    });
  }

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ");

  const candidates = [...archiveCandidates, ...stockCandidates];

  return {
    candidates,
    message: textContent || (candidates.length > 0
      ? "Here are some image options — click one to insert it."
      : "Could not find any suitable images."),
  };
}

export async function importStockAndInsert(data: {
  stockResourceId: number;
  title?: string;
}): Promise<{ imageUrl: string }> {
  const { organization } = await requireAuthWithOrg();

  const imported = await downloadAndStoreFreepikImage(
    data.stockResourceId,
    organization.id,
    data.title
  );

  return { imageUrl: imported.url };
}

export async function generateImageCaption(data: {
  imageDescription: string;
  blogContextBefore: string;
  blogContextAfter: string;
}): Promise<{ caption: string }> {
  const { organization } = await requireAuthWithOrg();

  const ctx = await getOrgContext(organization.id);
  const locale = ctx.locale || "en";

  const response = await anthropic.messages.create({
    model: IMAGE_SEARCH_MODEL,
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Generate a short image caption (max 10 words) in locale "${locale}".

Image: ${data.imageDescription}
Blog context before: "${data.blogContextBefore.slice(-200)}"
Blog context after: "${data.blogContextAfter.slice(0, 200)}"

Reply with ONLY the caption text, nothing else.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^["']|["']$/g, ""); // Strip wrapping quotes

  return { caption: text };
}

export async function aiGenerateSEO(data: {
  title: string;
  excerpt: string;
  contentHtml: string;
}): Promise<{ metaTitle: string; metaDescription: string }> {
  const { organization } = await requireAuthWithOrg();
  const orgContext = await getOrgContext(organization.id);

  return generateSEOMetadata({
    organizationContext: orgContext,
    pageTitle: data.title,
    pageContent: data.excerpt || data.contentHtml,
  });
}

export async function aiRegenerateTitleAndExcerpt(data: {
  contentHtml: string;
}): Promise<{ title: string; excerpt: string }> {
  const { organization } = await requireAuthWithOrg();
  const orgContext = await getOrgContext(organization.id);

  return regenerateTitleAndExcerpt({
    organizationContext: orgContext,
    contentHtml: data.contentHtml,
  });
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
