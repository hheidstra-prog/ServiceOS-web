"use server";

import { revalidatePath } from "next/cache";
import { db, SiteStatus, Prisma } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";

export async function getSites() {
  const { organization } = await requireAuthWithOrg();

  const sites = await db.site.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          pages: true,
        },
      },
    },
  });

  return sites;
}

export async function getSite(id: string) {
  const { organization } = await requireAuthWithOrg();

  const site = await db.site.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
    include: {
      theme: true,
      pages: {
        orderBy: { title: "asc" },
      },
      navigation: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: {
          pages: true,
        },
      },
    },
  });

  return site;
}

export async function createSite(data: {
  name: string;
  subdomain: string;
  tagline?: string;
  description?: string;
}) {
  const { organization } = await requireAuthWithOrg();

  // Check if subdomain is available
  const existing = await db.site.findFirst({
    where: { subdomain: data.subdomain.toLowerCase() },
  });

  if (existing) {
    throw new Error("This subdomain is already taken");
  }

  const site = await db.site.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      subdomain: data.subdomain.toLowerCase(),
      tagline: data.tagline || null,
      description: data.description || null,
      status: SiteStatus.DRAFT,
      blogEnabled: true,
      portalEnabled: true,
      bookingEnabled: false,
    },
  });

  // Create default theme
  await db.siteTheme.create({
    data: {
      siteId: site.id,
      template: "modern",
      headerStyle: "standard",
      footerStyle: "standard",
      heroStyle: "centered",
    },
  });

  // Create default home page
  await db.page.create({
    data: {
      siteId: site.id,
      slug: "",
      title: "Home",
      isHomepage: true,
      isPublished: false,
      content: {
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            data: {
              heading: `Welcome to ${data.name}`,
              subheading: data.tagline || "We're here to help you succeed",
              ctaText: "Get Started",
              ctaLink: "/contact",
            },
          },
        ],
      },
    },
  });

  revalidatePath("/sites");

  return site;
}

export async function updateSite(
  id: string,
  data: {
    name?: string;
    subdomain?: string;
    tagline?: string;
    description?: string;
    customDomain?: string;
    status?: SiteStatus;
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
    blogEnabled?: boolean;
    portalEnabled?: boolean;
    bookingEnabled?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  }
) {
  const { organization } = await requireAuthWithOrg();

  // If subdomain is being changed, check availability
  if (data.subdomain) {
    const existing = await db.site.findFirst({
      where: {
        subdomain: data.subdomain.toLowerCase(),
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("This subdomain is already taken");
    }
  }

  const updateData: Prisma.SiteUpdateInput = {
    ...data,
    subdomain: data.subdomain?.toLowerCase(),
  };

  const site = await db.site.update({
    where: {
      id,
      organizationId: organization.id,
    },
    data: updateData,
  });

  revalidatePath("/sites");
  revalidatePath(`/sites/${id}`);

  return site;
}

export async function deleteSite(id: string) {
  const { organization } = await requireAuthWithOrg();

  await db.site.delete({
    where: {
      id,
      organizationId: organization.id,
    },
  });

  revalidatePath("/sites");
}

// Page actions
export async function getPages(siteId: string) {
  const { organization } = await requireAuthWithOrg();

  const pages = await db.page.findMany({
    where: {
      siteId,
      site: { organizationId: organization.id },
    },
    orderBy: [{ isHomepage: "desc" }, { title: "asc" }],
  });

  return pages;
}

export async function getPage(siteId: string, pageId: string) {
  const { organization } = await requireAuthWithOrg();

  const page = await db.page.findFirst({
    where: {
      id: pageId,
      siteId,
      site: { organizationId: organization.id },
    },
  });

  return page;
}

export async function createPage(
  siteId: string,
  data: {
    title: string;
    slug: string;
  }
) {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  // Check if slug exists
  const existing = await db.page.findFirst({
    where: { siteId, slug: data.slug.toLowerCase() },
  });

  if (existing) {
    throw new Error("A page with this slug already exists");
  }

  const page = await db.page.create({
    data: {
      siteId,
      title: data.title,
      slug: data.slug.toLowerCase(),
      isPublished: false,
      content: {
        blocks: [],
      },
    },
  });

  revalidatePath(`/sites/${siteId}`);

  return page;
}

export async function updatePage(
  siteId: string,
  pageId: string,
  data: {
    title?: string;
    slug?: string;
    content?: Prisma.InputJsonValue;
    isPublished?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }
) {
  const { organization } = await requireAuthWithOrg();

  // If slug is being changed, check availability
  if (data.slug) {
    const existing = await db.page.findFirst({
      where: {
        siteId,
        slug: data.slug.toLowerCase(),
        NOT: { id: pageId },
      },
    });

    if (existing) {
      throw new Error("A page with this slug already exists");
    }
  }

  const updateData: Prisma.PageUpdateInput = {
    ...data,
    slug: data.slug?.toLowerCase(),
  };

  const page = await db.page.update({
    where: {
      id: pageId,
      siteId,
      site: { organizationId: organization.id },
    },
    data: updateData,
  });

  revalidatePath(`/sites/${siteId}`);
  revalidatePath(`/sites/${siteId}/pages/${pageId}`);

  return page;
}

export async function deletePage(siteId: string, pageId: string) {
  const { organization } = await requireAuthWithOrg();

  // Check if it's the homepage
  const page = await db.page.findFirst({
    where: {
      id: pageId,
      siteId,
      site: { organizationId: organization.id },
    },
  });

  if (page?.isHomepage) {
    throw new Error("Cannot delete the homepage");
  }

  await db.page.delete({
    where: {
      id: pageId,
      siteId,
      site: { organizationId: organization.id },
    },
  });

  revalidatePath(`/sites/${siteId}`);
}

// Navigation actions
export async function updateNavigation(
  siteId: string,
  items: Array<{ id?: string; label: string; href: string; sortOrder: number }>
) {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  // Delete existing navigation
  await db.navigation.deleteMany({
    where: { siteId },
  });

  // Create new navigation items
  await db.navigation.createMany({
    data: items.map((item) => ({
      siteId,
      label: item.label,
      href: item.href,
      sortOrder: item.sortOrder,
    })),
  });

  revalidatePath(`/sites/${siteId}`);
}

// Theme actions
export async function updateTheme(
  siteId: string,
  data: {
    template?: string;
    colorMode?: string;
    headerStyle?: string;
    footerStyle?: string;
    heroStyle?: string;
    fontHeading?: string;
    fontBody?: string;
    customCss?: string;
    designTokens?: Record<string, string>;
  }
) {
  const { organization } = await requireAuthWithOrg();

  await db.siteTheme.upsert({
    where: { siteId },
    create: {
      siteId,
      ...data,
    },
    update: data,
  });

  revalidatePath(`/sites/${siteId}`);
}

// ===========================================
// AI GENERATION ACTIONS
// ===========================================

import {
  generateSiteFromDescription,
  generatePageContent,
  generateBlockContent,
  generateBlogPost,
  generateSEOMetadata,
  improveContent,
  chatEditBlockContent,
  type GeneratedSite,
  type GeneratedPage,
  type GeneratedBlock,
  type GeneratedBlogPost,
  type ChatEditResult,
  type AvailableImage,
} from "@/lib/ai-site-generator";
import { getBusinessContext } from "@/lib/ai";
import Anthropic from "@anthropic-ai/sdk";
import {
  searchFreepikImages,
  downloadAndStoreFreepikImage,
  type FreepikImage,
} from "@/lib/freepik";

/** Helper to build OrganizationContext with BusinessProfile data */
async function getOrgContext(organizationId: string) {
  const ctx = await getBusinessContext(organizationId);
  if (!ctx) throw new Error("Organization not found");
  return ctx;
}

/** Fetch recent images from the organization's media library for AI context */
async function getOrganizationImages(organizationId: string): Promise<AvailableImage[]> {
  const files = await db.file.findMany({
    where: { organizationId, mediaType: "IMAGE" },
    take: 50,
    select: { name: true, url: true, cloudinaryUrl: true, aiDescription: true, tags: true },
    orderBy: { createdAt: "desc" },
  });

  return files.map((f) => ({
    name: f.name,
    url: f.cloudinaryUrl || f.url,
    description: f.aiDescription,
    tags: (f.tags as string[]) || [],
  }));
}

export async function aiGenerateSite(data: {
  style?: "modern" | "classic" | "minimal" | "bold";
  primaryColor?: string;
  secondaryColor?: string;
  fontHeading?: string;
  fontBody?: string;
  heroStyle?: string;
  headerStyle?: string;
  footerStyle?: string;
}): Promise<GeneratedSite> {
  const { organization } = await requireAuthWithOrg();
  const businessContext = await getOrgContext(organization.id);

  const result = await generateSiteFromDescription({
    organizationContext: businessContext,
    businessContext,
    style: data.style,
    styleChoices: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      fontHeading: data.fontHeading,
      fontBody: data.fontBody,
      heroStyle: data.heroStyle,
      headerStyle: data.headerStyle,
      footerStyle: data.footerStyle,
    },
  });

  return result;
}

export async function aiCreateSiteWithContent(data: {
  style?: "modern" | "classic" | "minimal" | "bold";
  colorMode?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontHeading?: string;
  fontBody?: string;
  heroStyle?: string;
  headerStyle?: string;
  footerStyle?: string;
}): Promise<{ siteId: string }> {
  const { organization } = await requireAuthWithOrg();
  const businessContext = await getOrgContext(organization.id);

  // Fetch available images for AI context
  const availableImages = await getOrganizationImages(organization.id);

  // Generate site content using business profile + style choices
  const generated = await generateSiteFromDescription({
    organizationContext: businessContext,
    businessContext,
    style: data.style,
    styleChoices: {
      colorMode: data.colorMode,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      fontHeading: data.fontHeading,
      fontBody: data.fontBody,
      heroStyle: data.heroStyle,
      headerStyle: data.headerStyle,
      footerStyle: data.footerStyle,
    },
    availableImages,
  });

  // Generate subdomain from name
  const subdomain = generated.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  // Check subdomain availability and add suffix if needed
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

  // Use explicit colors from wizard, or fall back to AI-generated
  const primaryColor = data.primaryColor || generated.primaryColor;
  const secondaryColor = data.secondaryColor || generated.secondaryColor;

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
      status: SiteStatus.DRAFT,
      blogEnabled: true,
      portalEnabled: true,
      bookingEnabled: false,
    },
  });

  // Create theme with wizard choices + AI-generated design tokens
  await db.siteTheme.create({
    data: {
      siteId: site.id,
      template: data.style || "modern",
      colorMode: data.colorMode || "light",
      headerStyle: data.headerStyle || "standard",
      footerStyle: data.footerStyle || "standard",
      heroStyle: data.heroStyle || "centered",
      fontHeading: data.fontHeading || null,
      fontBody: data.fontBody || null,
      designTokens: generated.designTokens && Object.keys(generated.designTokens).length > 0
        ? generated.designTokens
        : undefined,
    },
  });

  // Create pages from generated content
  for (let i = 0; i < generated.pages.length; i++) {
    const page = generated.pages[i];
    // Normalize slug: strip leading slashes, treat "home"/"" as homepage
    const cleanSlug = page.slug.replace(/^\/+/, "");
    const isHomepage = cleanSlug === "" || cleanSlug === "home" || i === 0;

    await db.page.create({
      data: {
        siteId: site.id,
        title: page.title,
        slug: isHomepage ? "" : cleanSlug,
        isHomepage,
        isPublished: true,
        metaTitle: page.metaTitle || null,
        metaDescription: page.metaDescription || null,
        content: JSON.parse(JSON.stringify({
          blocks: page.blocks.map((block, idx) => {
            const { type, data, ...rest } = block as unknown as Record<string, unknown>;
            return {
              id: `block-${Date.now()}-${idx}`,
              type,
              data: data ?? rest,
            };
          }),
        })),
      },
    });
  }

  // Create navigation items (exclude homepage)
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
    await db.navigation.createMany({
      data: navItems,
    });
  }

  revalidatePath("/sites");

  return { siteId: site.id };
}

export async function aiGeneratePage(
  siteId: string,
  data: {
    pageType: "home" | "about" | "services" | "contact" | "custom";
    pageTitle?: string;
    pageDescription?: string;
  }
): Promise<GeneratedPage> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const ctx = await getOrgContext(organization.id);

  const result = await generatePageContent({
    organizationContext: ctx,
    pageType: data.pageType,
    pageTitle: data.pageTitle,
    pageDescription: data.pageDescription,
  });

  return result;
}

export async function aiCreatePageWithContent(
  siteId: string,
  data: {
    pageType: "home" | "about" | "services" | "contact" | "custom";
    pageTitle?: string;
    pageDescription?: string;
  }
): Promise<{ pageId: string }> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const ctx = await getOrgContext(organization.id);

  const availableImages = await getOrganizationImages(organization.id);

  const generated = await generatePageContent({
    organizationContext: ctx,
    pageType: data.pageType,
    pageTitle: data.pageTitle,
    pageDescription: data.pageDescription,
    availableImages,
  });

  // Check if slug exists
  let slug = generated.slug;
  const existing = await db.page.findFirst({
    where: { siteId, slug },
  });

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const page = await db.page.create({
    data: {
      siteId,
      title: generated.title,
      slug,
      isHomepage: false,
      isPublished: false,
      metaTitle: generated.metaTitle || null,
      metaDescription: generated.metaDescription || null,
      content: JSON.parse(JSON.stringify({
        blocks: generated.blocks.map((block, idx) => {
          const { type, data, ...rest } = block as unknown as Record<string, unknown>;
          return {
            id: `block-${Date.now()}-${idx}`,
            type,
            data: data ?? rest,
          };
        }),
      })),
    },
  });

  revalidatePath(`/sites/${siteId}`);

  return { pageId: page.id };
}

export async function aiGenerateBlock(
  siteId: string,
  data: {
    blockType: GeneratedBlock["type"];
    instructions?: string;
    currentContent?: Record<string, unknown>;
  }
): Promise<GeneratedBlock> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const ctx = await getOrgContext(organization.id);

  const availableImages = await getOrganizationImages(organization.id);

  const result = await generateBlockContent({
    organizationContext: ctx,
    blockType: data.blockType,
    instructions: data.instructions,
    currentContent: data.currentContent,
    availableImages,
  });

  return result;
}

export async function aiGenerateBlogPost(
  siteId: string,
  data: {
    topic: string;
    keywords?: string[];
    targetLength?: "short" | "medium" | "long";
  }
): Promise<GeneratedBlogPost> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const existingPosts = await db.blogPost.findMany({
    where: { organizationId: organization.id },
    select: { title: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const ctx = await getOrgContext(organization.id);

  const result = await generateBlogPost({
    organizationContext: ctx,
    topic: data.topic,
    keywords: data.keywords,
    targetLength: data.targetLength,
    existingPosts: existingPosts.map((p) => p.title),
  });

  return result;
}

export async function aiGenerateSEO(
  siteId: string,
  pageId: string
): Promise<{ metaTitle: string; metaDescription: string }> {
  const { organization } = await requireAuthWithOrg();

  const page = await db.page.findFirst({
    where: {
      id: pageId,
      siteId,
      site: { organizationId: organization.id },
    },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  const ctx = await getOrgContext(organization.id);

  // Extract text content from blocks
  const content = page.content as { blocks?: Array<{ data?: Record<string, unknown> }> };
  const textContent = content.blocks
    ?.map((block) => {
      const data = block.data || {};
      return [data.heading, data.subheading, data.content].filter(Boolean).join(" ");
    })
    .join(" ") || page.title;

  const result = await generateSEOMetadata({
    organizationContext: ctx,
    pageTitle: page.title,
    pageContent: textContent,
  });

  return result;
}

export async function aiImproveContent(
  siteId: string,
  data: {
    content: string;
    improvementType: "clarity" | "persuasion" | "seo" | "tone" | "length";
    additionalInstructions?: string;
  }
): Promise<string> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const ctx = await getOrgContext(organization.id);

  const result = await improveContent({
    organizationContext: ctx,
    content: data.content,
    improvementType: data.improvementType,
    additionalInstructions: data.additionalInstructions,
  });

  return result;
}

export async function aiChatEditBlock(
  siteId: string,
  data: {
    blockType: string;
    currentData: Record<string, unknown>;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }
): Promise<ChatEditResult> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const availableImages = await getOrganizationImages(organization.id);

  const result = await chatEditBlockContent({
    blockType: data.blockType,
    currentData: data.currentData,
    messages: data.messages,
    availableImages,
  });

  return result;
}

// ===========================================
// AI IMAGE SEARCH FOR BLOCK EDITOR
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

export type AiBlockImageSearchResult = {
  candidates: ImageCandidate[];
  message: string;
};

export async function aiSearchBlockImages(
  siteId: string,
  data: {
    instruction: string;
    blockType: string;
    currentData: Record<string, unknown>;
  }
): Promise<AiBlockImageSearchResult> {
  const { organization } = await requireAuthWithOrg();

  // Verify site ownership
  const site = await db.site.findFirst({
    where: { id: siteId, organizationId: organization.id },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const ctx = await getOrgContext(organization.id);
  const locale = ctx.locale || "en";
  const localeInstructions: Record<string, string> = {
    nl: "Respond in Dutch.",
    en: "Respond in English.",
    de: "Respond in German.",
    fr: "Respond in French.",
  };

  const systemPrompt = `You are an image finder for a website page editor. The user wants to find an image for a ${data.blockType} block.
${localeInstructions[locale] || `Respond in the language matching locale "${locale}".`}

Current block data:
${JSON.stringify(data.currentData, null, 2)}

Your job:
1. Read the block context to understand what kind of image fits.
2. Call search_archive with a short keyword query (1-3 words).
3. If the archive returned fewer than 3 results, ALSO call search_stock to find more options.
4. Return ALL results to the user — do NOT pick one yourself.

CRITICAL RULES:
- ALWAYS search in English, even if the user writes in another language. File names, tags, and descriptions in the archive are in English. Translate the user's request to English keywords before searching.
- Use short, broad search queries (e.g. "business woman" not "professional businesswoman in office").
- Do NOT select or pick a single image. Return all search results so the user can choose.
- CONCISE RESPONSES — the UI renders an image grid with thumbnails. Do NOT list file IDs, URLs, descriptions, or thumbnails in your text. Reply in 1-2 sentences max (e.g. "I found 5 images from your archive — click one to use it.").`;

  const userMessage = `The user asked: "${data.instruction}"

Search for images that would fit this ${data.blockType} block. Return all candidates.`;

  const apiMessages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

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
          const result = await searchFreepikImages({ query, limit: 8, filters: { license: "freemium" } });

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
      ? "Here are some image options — click one to use it."
      : "Could not find any suitable images."),
  };
}

export async function importStockImage(data: {
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
