"use server";

import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db, SiteStatus } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { getBusinessContext, type BusinessContext } from "@/lib/ai";
import { generateSiteFromDescription, generateBlogPost } from "@/lib/ai-site-generator";
import { buildDesignerSystemPrompt, DESIGNER_TOOLS } from "./designer-prompt";
import type { MoodboardItem, DesignDirection, DesignerMessage } from "./types";
import { enrichBlocksWithStockImages } from "@/lib/enrich-block-images";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DESIGNER_MODEL = "claude-sonnet-4-20250514";
const MAX_TOOL_ITERATIONS = 5;

/**
 * If a logo URL is external (not already on Vercel Blob), download it and
 * re-upload to Vercel Blob so the URL never expires.
 */
async function persistLogoUrl(url: string, organizationId: string): Promise<string> {
  // Already on Vercel Blob — nothing to do
  if (url.includes(".vercel-storage.com") || url.includes(".public.blob.vercel-storage.com")) {
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch logo from ${url}: ${response.status}`);
      return url; // Return original URL as fallback
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const ext = contentType.includes("svg") ? "svg" : contentType.includes("webp") ? "webp" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const buffer = await response.arrayBuffer();

    const blob = await put(
      `ServiceOS/${organizationId}/logos/logo.${ext}`,
      Buffer.from(buffer),
      { access: "public", addRandomSuffix: true, contentType }
    );

    return blob.url;
  } catch (error) {
    console.warn("Failed to persist logo URL, using original:", error);
    return url; // Return original URL as fallback
  }
}

// ===========================================
// 1. Get business context for the designer
// ===========================================

export async function getDesignerBusinessContext(): Promise<BusinessContext> {
  const { organization } = await requireAuthWithOrg();
  const ctx = await getBusinessContext(organization.id);
  if (!ctx) {
    throw new Error("Business profile not found. Please complete your settings first.");
  }
  return ctx;
}

// ===========================================
// 2. Send a message to the AI Designer
// ===========================================

interface DesignerResponse {
  content: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
}

export async function sendDesignerMessage(
  messages: DesignerMessage[],
  moodboardItems: MoodboardItem[],
  designDirection: DesignDirection | null,
  businessContext: BusinessContext
): Promise<DesignerResponse> {
  await requireAuthWithOrg();

  const systemPrompt = buildDesignerSystemPrompt(
    businessContext,
    moodboardItems,
    designDirection
  );

  // Convert our messages to Anthropic format
  const apiMessages: Anthropic.MessageParam[] = messages.map((msg) => {
    if (msg.role === "user" && msg.images && msg.images.length > 0) {
      // Message with images — use content blocks
      const content: Anthropic.ContentBlockParam[] = [];

      for (const imageUrl of msg.images) {
        content.push({
          type: "image",
          source: { type: "url", url: imageUrl },
        });
      }

      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }

      return { role: "user" as const, content };
    }

    return { role: msg.role as "user" | "assistant", content: msg.content };
  });

  // Tool use loop — collect all tool calls across iterations
  const allToolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
  let finalContent = "";
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: DESIGNER_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: apiMessages,
      tools: DESIGNER_TOOLS as Anthropic.Tool[],
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
      );
      const textBlock = response.content.find(
        (c): c is Anthropic.TextBlock => c.type === "text"
      );

      // Collect tool calls
      for (const tool of toolUseBlocks) {
        allToolCalls.push({
          name: tool.name,
          input: tool.input as Record<string, unknown>,
        });
      }

      // Add assistant turn to conversation
      apiMessages.push({ role: "assistant", content: response.content });

      // Add tool results (we just acknowledge — the real state update is client-side)
      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
        (tool) => ({
          type: "tool_result" as const,
          tool_use_id: tool.id,
          content: tool.name === "suggest_reference_site"
            ? `Reference site shown to user: ${tool.name}`
            : `Added to moodboard: ${tool.name}`,
        })
      );

      apiMessages.push({ role: "user", content: toolResults });

      // If there was text, capture it
      if (textBlock) {
        finalContent = textBlock.text;
      }

      continue;
    }

    // No more tool use — extract final text
    const textBlock = response.content.find(
      (c): c is Anthropic.TextBlock => c.type === "text"
    );
    if (textBlock) {
      finalContent = textBlock.text;
    }
    break;
  }

  // If we exhausted the loop and still have no text, make one final call without tools
  // to force the AI to produce a conversational reply.
  if (!finalContent) {
    const fallback = await anthropic.messages.create({
      model: DESIGNER_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: apiMessages,
    });
    const textBlock = fallback.content.find(
      (c): c is Anthropic.TextBlock => c.type === "text"
    );
    if (textBlock) {
      finalContent = textBlock.text;
    }
  }

  return { content: finalContent, toolCalls: allToolCalls };
}

// ===========================================
// 3. Create site from design direction
// ===========================================

export async function aiCreateSiteFromDesigner(
  designDirection: DesignDirection,
  logoUrl?: string | null
): Promise<{ siteId: string }> {
  const { organization } = await requireAuthWithOrg();
  const businessContext = await getBusinessContext(organization.id);
  if (!businessContext) {
    throw new Error("Business profile not found");
  }

  // Generate site content using the design direction from the moodboard
  const generated = await generateSiteFromDescription({
    organizationContext: businessContext,
    businessContext,
    styleChoices: {
      colorMode: designDirection.colorMode,
      primaryColor: designDirection.primaryColor,
      secondaryColor: designDirection.secondaryColor,
      fontHeading: designDirection.fontHeading,
      fontBody: designDirection.fontBody,
      heroStyle: designDirection.heroStyle,
      headerStyle: designDirection.headerStyle,
      footerStyle: designDirection.footerStyle,
    },
    presetDesignTokens: designDirection.designTokens,
    moodSummary: designDirection.summary,
  });

  // Generate subdomain from name
  const subdomain = generated.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  // Check subdomain availability
  let finalSubdomain = subdomain;
  let counter = 1;
  while (true) {
    const existing = await db.site.findFirst({
      where: { subdomain: finalSubdomain },
    });
    if (!existing) break;
    finalSubdomain = `${subdomain}-${counter}`;
    counter++;
  }

  const primaryColor = designDirection.primaryColor || generated.primaryColor;
  const secondaryColor = designDirection.secondaryColor || generated.secondaryColor;

  // Resolve logo: explicit param > design direction > null
  // If the URL is external (not Vercel Blob), download and re-upload to persist it
  const rawLogo = logoUrl || designDirection.logoUrl || null;
  const resolvedLogo = rawLogo ? await persistLogoUrl(rawLogo, organization.id) : null;

  // Create the site
  const site = await db.site.create({
    data: {
      organizationId: organization.id,
      name: generated.name,
      subdomain: finalSubdomain,
      tagline: generated.tagline,
      description: generated.description,
      primaryColor,
      secondaryColor,
      logo: resolvedLogo,
      status: SiteStatus.DRAFT,
      blogEnabled: true,
      portalEnabled: true,
      bookingEnabled: false,
    },
  });

  // Create theme with design direction values
  await db.siteTheme.create({
    data: {
      siteId: site.id,
      template: "modern",
      colorMode: designDirection.colorMode,
      headerStyle: designDirection.headerStyle,
      footerStyle: designDirection.footerStyle,
      heroStyle: designDirection.heroStyle,
      fontHeading: designDirection.fontHeading,
      fontBody: designDirection.fontBody,
      designTokens:
        generated.designTokens && Object.keys(generated.designTokens).length > 0
          ? generated.designTokens
          : designDirection.designTokens,
    },
  });

  // Create pages from generated content
  const createdPages: Array<{ pageId: string; blocks: Array<{ id: string; type: string; data: Record<string, unknown> }> }> = [];

  for (let i = 0; i < generated.pages.length; i++) {
    const page = generated.pages[i];
    const cleanSlug = page.slug.replace(/^\/+/, "");
    const isHomepage = cleanSlug === "" || cleanSlug === "home" || i === 0;

    // AI may return flat blocks (type + fields) or nested (type + data).
    // Normalize to always have { id, type, data }.
    const normalizedBlocks = page.blocks.map((block, idx) => {
      const { type, data, ...rest } = block as unknown as Record<string, unknown>;
      return {
        id: `block-${Date.now()}-${idx}`,
        type: type as string,
        data: (data ?? rest) as Record<string, unknown>,
      };
    });

    const dbPage = await db.page.create({
      data: {
        siteId: site.id,
        title: page.title,
        slug: isHomepage ? "" : cleanSlug,
        isHomepage,
        isPublished: true,
        metaTitle: page.metaTitle || null,
        metaDescription: page.metaDescription || null,
        content: JSON.parse(JSON.stringify({ blocks: normalizedBlocks })),
      },
    });

    createdPages.push({ pageId: dbPage.id, blocks: normalizedBlocks });
  }

  // Create navigation items
  const navItems = generated.pages
    .map((p) => ({ ...p, cleanSlug: p.slug.replace(/^\/+/, "") }))
    .filter((p) => p.cleanSlug !== "" && p.cleanSlug !== "home")
    .map((page, idx) => ({
      siteId: site.id,
      label: page.title,
      href: `/${page.cleanSlug}`,
      sortOrder: idx,
    }));

  if (navItems.length > 0) {
    await db.navigation.createMany({ data: navItems });
  }

  // Fire-and-forget: enrich blocks with stock images
  enrichBlocksWithStockImages(createdPages, organization.id, site.id)
    .catch((err) => console.error("Stock image enrichment failed:", err));

  // Fire-and-forget: generate starter blog posts in the background
  generateStarterBlogPosts(
    organization.id,
    site.id,
    businessContext,
    designDirection.blogPreferences
  ).catch((err) => console.error("Failed to generate starter blog posts:", err));

  revalidatePath("/sites");

  return { siteId: site.id };
}

// ===========================================
// 4. Generate starter blog posts
// ===========================================

async function generateStarterBlogPosts(
  organizationId: string,
  siteId: string,
  businessContext: BusinessContext,
  blogPreferences?: { topics?: string[]; style?: string }
) {
  const industry = businessContext.industry || "general services";

  // Build topics from preferences or fall back to industry-based defaults
  const topics =
    blogPreferences?.topics && blogPreferences.topics.length > 0
      ? blogPreferences.topics.slice(0, 3)
      : [
          `Essential tips for choosing the right ${industry} provider`,
          `Common mistakes to avoid in ${industry}`,
          `How ${businessContext.name} approaches ${industry} differently`,
        ];

  // Generate posts in parallel
  const results = await Promise.allSettled(
    topics.map((topic, idx) =>
      generateBlogPost({
        organizationContext: businessContext,
        topic,
        keywords: [industry, businessContext.name],
        targetLength: idx === 0 ? "long" : "medium",
        existingPosts: [],
      })
    )
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const post = result.value;

    try {
      // Create the blog post under the organization
      const blogPost = await db.blogPost.create({
        data: {
          organizationId,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: { html: post.content },
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      // Create publication entry for the site
      await db.blogPostPublication.create({
        data: {
          postId: blogPost.id,
          siteId,
          slug: post.slug,
        },
      });

      // Create tags
      if (post.tags && post.tags.length > 0) {
        for (const tagName of post.tags) {
          const slug = tagName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

          const tag = await db.blogTag.upsert({
            where: { organizationId_slug: { organizationId, slug } },
            create: { organizationId, name: tagName, slug },
            update: {},
          });

          await db.blogPostTag.create({
            data: { postId: blogPost.id, tagId: tag.id },
          });
        }
      }
    } catch (err) {
      console.error("Failed to save blog post:", err);
    }
  }
}
