"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db, PostStatus } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { getBusinessContext } from "@/lib/ai";
import { revalidatePath } from "next/cache";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BlogPostResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  featured: boolean;
  featuredImage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  categories: Array<{ name: string }>;
  tags: Array<{ name: string }>;
}

export interface BlogChatResult {
  content: string;
  actionsTaken?: string[];
  postResults?: BlogPostResult[];
  createdPostId?: string;
}

const BLOG_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_posts",
    description:
      "Search blog posts by text query, status, category, tag, or featured flag. Returns matching posts with metadata.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Text to search in title, excerpt, and slug. Optional when filtering by status/category/tag.",
        },
        status: {
          type: "string",
          enum: ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"],
          description: "Filter by post status",
        },
        category: {
          type: "string",
          description: "Filter by category name (case-insensitive)",
        },
        tag: {
          type: "string",
          description: "Filter by tag name (case-insensitive)",
        },
        featured: {
          type: "boolean",
          description: "Filter featured posts only",
        },
      },
      required: [],
    },
  },
  {
    name: "get_blog_stats",
    description: "Get blog post counts grouped by status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_blog_post",
    description:
      "Create a new blog post with generated HTML content, tags, categories, and SEO metadata. Post is created as DRAFT.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Blog post title" },
        slug: {
          type: "string",
          description: "URL slug (lowercase, hyphens only)",
        },
        excerpt: {
          type: "string",
          description: "Short excerpt/summary (1-2 sentences)",
        },
        content: {
          type: "string",
          description:
            "Full blog post content as HTML using semantic tags (h2, h3, p, ul, ol, li, strong, em, blockquote, a). Write thorough, well-structured content.",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Category names to assign. Prefer existing categories. New ones are auto-created.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Tag names to assign. Prefer existing tags. New ones are auto-created.",
        },
        metaTitle: { type: "string", description: "SEO meta title" },
        metaDescription: {
          type: "string",
          description: "SEO meta description (max 160 chars)",
        },
      },
      required: ["title", "slug", "content"],
    },
  },
  {
    name: "publish_post",
    description: "Publish a draft blog post by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: { type: "string", description: "The blog post ID to publish" },
      },
      required: ["postId"],
    },
  },
  {
    name: "unpublish_post",
    description: "Revert a published blog post back to draft status.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: {
          type: "string",
          description: "The blog post ID to unpublish",
        },
      },
      required: ["postId"],
    },
  },
  {
    name: "delete_post",
    description:
      "Delete a blog post. Only call this AFTER the user has explicitly confirmed deletion.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: { type: "string", description: "The blog post ID to delete" },
      },
      required: ["postId"],
    },
  },
  {
    name: "suggest_topics",
    description:
      "Suggest blog post topic ideas based on business context and existing posts.",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Number of topics to suggest (default 5)",
        },
        theme: {
          type: "string",
          description: "Optional theme or area to focus topics on",
        },
      },
      required: [],
    },
  },
];

interface ToolResult {
  text: string;
  postResults?: BlogPostResult[];
  createdPostId?: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function executeBlogTool(
  toolName: string,
  input: Record<string, unknown>,
  organizationId: string,
  userId: string
): Promise<ToolResult> {
  switch (toolName) {
    case "search_posts": {
      const query = input.query as string | undefined;
      const status = input.status as PostStatus | undefined;
      const category = input.category as string | undefined;
      const tag = input.tag as string | undefined;
      const featured = input.featured as boolean | undefined;

      const where: Record<string, unknown> = { organizationId };

      if (query) {
        where.OR = [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ];
      }
      if (status) where.status = status;
      if (featured !== undefined) where.featured = featured;
      if (category) {
        where.categories = {
          some: { category: { name: { equals: category, mode: "insensitive" } } },
        };
      }
      if (tag) {
        where.tags = {
          some: { tag: { name: { equals: tag, mode: "insensitive" } } },
        };
      }

      const posts = await db.blogPost.findMany({
        where,
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          categories: { include: { category: { select: { name: true } } } },
          tags: { include: { tag: { select: { name: true } } } },
        },
      });

      const postResults: BlogPostResult[] = posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        status: p.status,
        featured: p.featured,
        featuredImage: p.featuredImage,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
        categories: p.categories.map((c) => ({ name: c.category.name })),
        tags: p.tags.map((t) => ({ name: t.tag.name })),
      }));

      return {
        text: JSON.stringify({
          count: posts.length,
          posts: postResults.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            featured: p.featured,
            categories: p.categories.map((c) => c.name),
            tags: p.tags.map((t) => t.name),
          })),
        }),
        postResults,
      };
    }

    case "get_blog_stats": {
      const groups = await db.blogPost.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { id: true },
      });

      const stats: Record<string, number> = {};
      let total = 0;
      for (const g of groups) {
        stats[g.status] = g._count.id;
        total += g._count.id;
      }

      return {
        text: JSON.stringify({ total, byStatus: stats }),
      };
    }

    case "create_blog_post": {
      const title = input.title as string;
      const rawSlug = input.slug as string;
      const excerpt = (input.excerpt as string) || null;
      const content = input.content as string;
      const categoryNames = (input.categories as string[]) || [];
      const tagNames = (input.tags as string[]) || [];
      const metaTitle = (input.metaTitle as string) || null;
      const metaDescription = (input.metaDescription as string) || null;

      // Generate unique slug
      let slug = toSlug(rawSlug);
      const existingSlug = await db.blogPost.findFirst({
        where: { organizationId, slug },
      });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      // Resolve categories (find-or-create by name)
      const categoryIds: string[] = [];
      for (const name of categoryNames) {
        const catSlug = toSlug(name);
        const existing = await db.blogCategory.findFirst({
          where: { organizationId, slug: catSlug },
        });
        if (existing) {
          categoryIds.push(existing.id);
        } else {
          const created = await db.blogCategory.create({
            data: { organizationId, name, slug: catSlug },
          });
          categoryIds.push(created.id);
        }
      }

      // Resolve tags (find-or-create by name)
      const tagIds: string[] = [];
      for (const name of tagNames) {
        const tagSlug = toSlug(name);
        const existing = await db.blogTag.findFirst({
          where: { organizationId, slug: tagSlug },
        });
        if (existing) {
          tagIds.push(existing.id);
        } else {
          const created = await db.blogTag.create({
            data: { organizationId, name, slug: tagSlug },
          });
          tagIds.push(created.id);
        }
      }

      // Create the post
      const post = await db.blogPost.create({
        data: {
          organizationId,
          authorId: userId,
          title,
          slug,
          excerpt,
          content: { html: content },
          metaTitle,
          metaDescription,
          status: PostStatus.DRAFT,
        },
      });

      // Associate categories
      if (categoryIds.length > 0) {
        await db.blogPostCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            postId: post.id,
            categoryId,
          })),
        });
      }

      // Associate tags
      if (tagIds.length > 0) {
        await db.blogPostTag.createMany({
          data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
        });
      }

      revalidatePath("/blog");

      return {
        text: JSON.stringify({
          success: true,
          postId: post.id,
          title,
          slug,
        }),
        createdPostId: post.id,
      };
    }

    case "publish_post": {
      const postId = input.postId as string;

      const post = await db.blogPost.findFirst({
        where: { id: postId, organizationId },
      });
      if (!post) return { text: JSON.stringify({ error: "Post not found" }) };

      await db.blogPost.update({
        where: { id: postId },
        data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
      });

      // Publish to all org sites
      const sites = await db.site.findMany({
        where: { organizationId },
        select: { id: true },
      });
      for (const site of sites) {
        await db.blogPostPublication.upsert({
          where: { postId_siteId: { postId, siteId: site.id } },
          create: { postId, siteId: site.id, slug: post.slug },
          update: { slug: post.slug },
        });
      }

      revalidatePath("/blog");
      revalidatePath(`/blog/${postId}`);

      return {
        text: JSON.stringify({
          success: true,
          postId,
          title: post.title,
          status: "PUBLISHED",
          publishedToSites: sites.length,
        }),
      };
    }

    case "unpublish_post": {
      const postId = input.postId as string;

      const post = await db.blogPost.findFirst({
        where: { id: postId, organizationId },
      });
      if (!post) return { text: JSON.stringify({ error: "Post not found" }) };

      await db.blogPost.update({
        where: { id: postId },
        data: { status: PostStatus.DRAFT, publishedAt: null },
      });

      await db.blogPostPublication.deleteMany({ where: { postId } });

      revalidatePath("/blog");
      revalidatePath(`/blog/${postId}`);

      return {
        text: JSON.stringify({
          success: true,
          postId,
          title: post.title,
          status: "DRAFT",
        }),
      };
    }

    case "delete_post": {
      const postId = input.postId as string;

      const post = await db.blogPost.findFirst({
        where: { id: postId, organizationId },
      });
      if (!post) return { text: JSON.stringify({ error: "Post not found" }) };

      await db.blogPost.delete({
        where: { id: postId, organizationId },
      });

      revalidatePath("/blog");

      return {
        text: JSON.stringify({
          success: true,
          postId,
          title: post.title,
          deleted: true,
        }),
      };
    }

    case "suggest_topics": {
      const count = (input.count as number) || 5;
      const theme = input.theme as string | undefined;

      const existingPosts = await db.blogPost.findMany({
        where: { organizationId },
        select: { title: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      const businessContext = await getBusinessContext(organizationId);

      return {
        text: JSON.stringify({
          instruction: `Generate ${count} blog topic suggestions.`,
          businessContext: {
            name: businessContext?.name,
            industry: businessContext?.industry,
            description: businessContext?.description,
            targetAudience: businessContext?.targetAudience,
            services: businessContext?.services?.map((s) => s.name),
          },
          existingPosts: existingPosts.map((p) => p.title),
          theme: theme || "general",
          note: "Avoid duplicating existing posts. Consider the business context.",
        }),
      };
    }

    default:
      return { text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

export async function chatBlogAssistant(
  messages: ChatMessage[]
): Promise<BlogChatResult> {
  const { organization, user } = await requireAuthWithOrg();

  // Gather context for system prompt
  const [postCounts, businessContext, categories, tags] = await Promise.all([
    db.blogPost.groupBy({
      by: ["status"],
      where: { organizationId: organization.id },
      _count: { id: true },
    }),
    getBusinessContext(organization.id),
    db.blogCategory.findMany({
      where: { organizationId: organization.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    db.blogTag.findMany({
      where: { organizationId: organization.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stats: Record<string, number> = {};
  let totalPosts = 0;
  for (const g of postCounts) {
    stats[g.status] = g._count.id;
    totalPosts += g._count.id;
  }

  const categoryNames = categories.map((c) => c.name);
  const tagNames = tags.map((t) => t.name);

  const systemPrompt = `You are an AI Blog Assistant helping manage a blog with ${totalPosts} posts (${stats.PUBLISHED || 0} published, ${stats.DRAFT || 0} drafts).

Business context:
- Name: ${businessContext?.name || "N/A"}
- Industry: ${businessContext?.industry || "N/A"}
- Description: ${businessContext?.description || "N/A"}
- Target audience: ${businessContext?.targetAudience || "N/A"}
- Tone: ${businessContext?.toneOfVoice || "professional, friendly"}

Existing categories: ${categoryNames.length > 0 ? categoryNames.join(", ") : "None"}
Existing tags: ${tagNames.length > 0 ? tagNames.join(", ") : "None"}

RULES — follow strictly:
1. SEARCH FIRST — call search_posts before answering questions about existing posts.
2. CONCISE — the UI renders post cards in a side panel. Don't repeat post metadata. Reply in 1-2 sentences max.
3. PREFER EXISTING TAXONOMY — when assigning categories/tags in create_blog_post, reuse existing category and tag names above. Only create new ones if nothing fits.
4. DELETION SAFETY — always ask the user for confirmation before calling delete_post. Never delete without explicit approval.
5. CREATION — when creating posts, write thorough HTML content with semantic tags (h2, h3, p, ul, ol, li, strong, em, blockquote). Auto-assign relevant categories and tags.
6. TOPICS — when suggesting topics, consider the business context, existing posts, and target audience. Avoid duplicating existing post topics.

Tools: search_posts, get_blog_stats, create_blog_post, publish_post, unpublish_post, delete_post, suggest_topics.`;

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const actionsTaken: string[] = [];
  let collectedPostResults: BlogPostResult[] = [];
  let collectedCreatedPostId: string | undefined;
  let iterations = 0;
  const maxIterations = 5;

  let response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: BLOG_TOOLS,
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
      const result = await executeBlogTool(
        block.name,
        block.input as Record<string, unknown>,
        organization.id,
        user.id
      );
      actionsTaken.push(`${block.name}: ${result.text}`);
      if (result.postResults) {
        collectedPostResults = result.postResults;
      }
      if (result.createdPostId) {
        collectedCreatedPostId = result.createdPostId;
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.text,
      });
    }

    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: BLOG_TOOLS,
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
    .join("\n");

  return {
    content: textContent,
    actionsTaken: actionsTaken.length > 0 ? actionsTaken : undefined,
    postResults:
      collectedPostResults.length > 0 ? collectedPostResults : undefined,
    createdPostId: collectedCreatedPostId,
  };
}

/**
 * Re-fetch a list of blog posts by ID to get fresh data (e.g. after editing).
 */
export async function refreshBlogPostResults(
  postIds: string[]
): Promise<BlogPostResult[]> {
  const { organization } = await requireAuthWithOrg();

  const posts = await db.blogPost.findMany({
    where: {
      organizationId: organization.id,
      id: { in: postIds },
    },
    orderBy: { createdAt: "desc" },
    include: {
      categories: { include: { category: { select: { name: true } } } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    status: p.status,
    featured: p.featured,
    featuredImage: p.featuredImage,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    categories: p.categories.map((c) => ({ name: c.category.name })),
    tags: p.tags.map((t) => ({ name: t.tag.name })),
  }));
}

export async function getRecentBlogPosts(
  limit = 20
): Promise<BlogPostResult[]> {
  const { organization } = await requireAuthWithOrg();

  const posts = await db.blogPost.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      categories: { include: { category: { select: { name: true } } } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    status: p.status,
    featured: p.featured,
    featuredImage: p.featuredImage,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    categories: p.categories.map((c) => ({ name: c.category.name })),
    tags: p.tags.map((t) => ({ name: t.tag.name })),
  }));
}
