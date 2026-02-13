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

export interface BlogCreationResult {
  content: string;
  postId?: string;
}

const BLOG_CREATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "suggest_topics",
    description:
      "Suggest blog post topic ideas based on the business context and existing posts.",
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
  {
    name: "create_blog_post",
    description:
      "Create a new blog post with the given title, content (HTML), and metadata. Call this when the user is happy with the draft.",
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
            "The full blog post content as HTML using semantic tags (h2, h3, p, ul, ol, li, strong, em, blockquote, a)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Suggested tags for the post",
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
];

export async function chatCreateBlogPost(
  messages: ChatMessage[]
): Promise<BlogCreationResult> {
  const { organization, user } = await requireAuthWithOrg();

  const existingPosts = await db.blogPost.findMany({
    where: { organizationId: organization.id },
    select: { title: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const businessContext = await getBusinessContext(organization.id);

  const existingPostTitles = existingPosts.map((p) => p.title);

  const systemPrompt = `You are a blog content strategist and writer helping create a new blog post.

Business context:
- Industry: ${businessContext?.industry || "N/A"}
- Description: ${businessContext?.description || "N/A"}
- Target audience: ${businessContext?.targetAudience || "N/A"}
- Tone: ${businessContext?.toneOfVoice || "professional, friendly"}

Existing posts: ${existingPostTitles.length > 0 ? existingPostTitles.join(", ") : "None yet"}

Your workflow:
1. Help the user brainstorm topics or discuss their idea
2. Offer to write an outline first
3. Write the full post when ready
4. Call create_blog_post to save it

When writing content:
- Use semantic HTML: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a>
- Write engaging, well-structured content matching the business tone
- Include a compelling introduction and clear conclusion
- Be concise in your chat messages but thorough in the blog content itself

Do NOT create the post until the user explicitly approves or asks you to create/publish it.`;

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let iterations = 0;
  const maxIterations = 3;

  let response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: BLOG_CREATION_TOOLS,
    messages: apiMessages,
  });

  let createdPostId: string | undefined;

  while (response.stop_reason === "tool_use" && iterations < maxIterations) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
        b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      if (block.name === "suggest_topics") {
        const input = block.input as { count?: number; theme?: string };
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({
            topics: [
              "Use the business context to suggest relevant topics.",
              "Consider the existing posts to avoid duplicates.",
              `Theme requested: ${input.theme || "general"}`,
            ],
          }),
        });
      } else if (block.name === "create_blog_post") {
        const input = block.input as {
          title: string;
          slug: string;
          excerpt?: string;
          content: string;
          tags?: string[];
          metaTitle?: string;
          metaDescription?: string;
        };

        // Generate unique slug
        let slug = input.slug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const existingSlug = await db.blogPost.findFirst({
          where: { organizationId: organization.id, slug },
        });

        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }

        // Auto-create tags
        const tagIds: string[] = [];
        if (input.tags) {
          for (const tagName of input.tags) {
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
        }

        // Create the post with HTML content
        const post = await db.blogPost.create({
          data: {
            organizationId: organization.id,
            authorId: user.id,
            title: input.title,
            slug,
            excerpt: input.excerpt || null,
            content: { html: input.content },
            metaTitle: input.metaTitle || null,
            metaDescription: input.metaDescription || null,
            status: PostStatus.DRAFT,
          },
        });

        // Associate tags
        if (tagIds.length > 0) {
          await db.blogPostTag.createMany({
            data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
          });
        }

        createdPostId = post.id;
        revalidatePath("/blog");

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({
            success: true,
            postId: post.id,
            title: input.title,
            slug,
          }),
        });
      }
    }

    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: BLOG_CREATION_TOOLS,
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
    postId: createdPostId,
  };
}
