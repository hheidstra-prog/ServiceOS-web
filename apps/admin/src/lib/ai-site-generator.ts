"use server";

import Anthropic from "@anthropic-ai/sdk";
import { OrganizationContext, BusinessContext } from "./ai";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// ===========================================
// TYPES
// ===========================================

export interface GeneratedSite {
  name: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  designTokens: Record<string, string>;
  pages: GeneratedPage[];
}

export interface GeneratedPage {
  title: string;
  slug: string;
  blocks: GeneratedBlock[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface GeneratedBlock {
  type: "hero" | "text" | "features" | "services" | "testimonials" | "cta" | "contact" | "image" | "stats" | "faq" | "process" | "pricing" | "logos" | "columns";
  data: Record<string, unknown>;
}

export interface GeneratedBlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // TipTap JSON string
  metaTitle: string;
  metaDescription: string;
  tags: string[];
}

export interface AvailableImage {
  name: string;
  url: string;
  description?: string | null;
  tags?: string[];
}

/**
 * Format available images as a compact prompt snippet for AI context.
 * Returns empty string if no images are provided.
 */
function formatImageContext(images?: AvailableImage[]): string {
  if (!images || images.length === 0) return "";

  const lines = images.map((img) => {
    const desc = img.description || "No description";
    const tagStr = img.tags?.length ? ` [${img.tags.join(", ")}]` : "";
    return `- "${img.name}": ${desc}${tagStr} | URL: ${img.url}`;
  });

  return `\nAvailable images from the media library (use the URL to set image/backgroundImage fields, pick images that match the section context):\n${lines.join("\n")}\n`;
}

// ===========================================
// DESIGN TOKEN REFERENCE (for AI prompts)
// ===========================================

const DESIGN_TOKEN_DOCS = `
## Design Tokens

You MUST generate a "designTokens" object with CSS custom property overrides. Keys omit the "--" prefix.
Only include tokens you want to override from defaults. The tokens control the ENTIRE visual feel of the site.

### Available Tokens:

**Typography:**
- "heading-weight": Font weight for headings (600, 700, 800, 900)
- "heading-tracking": Letter spacing (-0.035em to 0.02em)
- "heading-line-height": Line height (1.1 to 1.3)
- "heading-transform": Text transform (none, uppercase)
- "hero-heading-size": Hero heading size (use clamp for responsive, e.g. "clamp(3rem, 7vw, 5rem)")
- "section-heading-size": Section heading size (e.g. "clamp(2rem, 4vw, 2.75rem)")

**Spacing:**
- "section-padding-y": Vertical section padding (3rem to 5rem)
- "section-padding-y-lg": Large screen section padding (5rem to 8rem)
- "card-padding": Card internal padding (1.5rem to 3rem)

**Shape:**
- "radius-card": Card border radius (0.375rem for sharp, 1.5rem for round, 9999px for pill)
- "radius-button": Button border radius (0.25rem to 9999px)
- "card-border-width": Card border width (0px for borderless, 1px for bordered)
- "card-border-color": Card border color

**Shadows & Glows:**
- "shadow-card": Default card shadow
- "shadow-card-hover": Hover card shadow
- "glow-card-hover": Glow effect on card hover (e.g. "0 0 30px -5px var(--color-primary-500)" or "none")
- "glow-button": Button glow effect

**Gradients:**
- "hero-gradient": Hero section background gradient
- "gradient-primary": Primary gradient for buttons/accents
- "gradient-accent": Accent gradient for CTA sections

**Animations:**
- "hover-translate-y": Hover lift amount (-1px subtle, -6px dramatic)
- "hover-scale": Hover scale (1.00 to 1.03)
- "transition-duration": Animation speed (150ms fast, 350ms slow)

**Buttons:**
- "button-font-weight": Button font weight (500, 600, 700)
- "button-text-transform": Button text transform (none, uppercase)
- "button-tracking": Button letter spacing

**Icons:**
- "icon-container-size": Size of icon containers (2.5rem to 3.5rem)
- "icon-container-radius": Radius (0.75rem for rounded, 50% for circle)

### Preset Examples:

**Premium Dark (dramatic, bold, glowy):**
{ "heading-weight": "800", "heading-tracking": "-0.03em", "hero-heading-size": "clamp(3rem, 7vw, 5rem)", "radius-card": "1.25rem", "radius-button": "0.75rem", "glow-card-hover": "0 0 30px -5px var(--color-primary-500)", "glow-button": "0 0 20px -3px var(--color-primary-500)", "hero-gradient": "radial-gradient(ellipse at 50% 0%, var(--color-primary-950), var(--color-surface) 70%)", "hover-translate-y": "-4px", "hover-scale": "1.02", "transition-duration": "300ms", "button-font-weight": "600" }

**Clean Minimal (subtle, understated):**
{ "heading-weight": "600", "heading-tracking": "-0.02em", "radius-card": "0.75rem", "shadow-card": "none", "shadow-card-hover": "none", "glow-card-hover": "none", "hero-gradient": "linear-gradient(to bottom, var(--color-surface-alt), var(--color-surface))", "gradient-primary": "none", "hover-translate-y": "0px", "transition-duration": "150ms" }

**Bold Vibrant (big, colorful, energetic):**
{ "heading-weight": "900", "heading-tracking": "-0.035em", "hero-heading-size": "clamp(3rem, 8vw, 5.5rem)", "radius-card": "1.5rem", "radius-button": "9999px", "card-border-width": "0px", "shadow-card": "0 4px 14px -3px rgb(0 0 0 / 0.08)", "glow-card-hover": "0 0 40px -10px var(--color-primary-400)", "gradient-primary": "linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))", "hover-translate-y": "-6px", "hover-scale": "1.03", "button-text-transform": "uppercase", "button-tracking": "0.05em" }

**Classic Elegant (traditional, refined):**
{ "heading-weight": "600", "heading-tracking": "0em", "heading-line-height": "1.25", "radius-card": "0.375rem", "radius-button": "0.25rem", "shadow-card": "0 1px 2px 0 rgb(0 0 0 / 0.03)", "glow-card-hover": "none", "gradient-primary": "none", "hover-translate-y": "-1px" }
`;

const BLOCK_TYPE_DOCS = `
## Block Format

IMPORTANT: Each block MUST be: { "type": "blockType", "data": { ...fields } }
The "data" wrapper is REQUIRED. Never put fields directly on the block object.

Example: { "type": "hero", "data": { "heading": "Welcome", "subheading": "Hello world" } }

## Block Types (fields go inside "data"):

- hero: { heading, subheading?, description?, badge?, highlightWord?, stats?: [{value, label}], primaryCta?: {label, href}, secondaryCta?: {label, href}, variant?: "centered"|"split"|"background", image?, backgroundImage? }
- text: { heading?, content (HTML string), align?: "left"|"center"|"right" }
- features: { heading?, subheading?, features: [{ icon?, title, description }], columns?: 2|3|4, variant?: "cards"|"list"|"icons" }
  - IMPORTANT: "icon" must be a Lucide icon name (lowercase, hyphenated), NOT an emoji. Allowed names: zap, shield, heart, star, check, rocket, target, users, clock, globe, sparkles, lightbulb, trending-up, award, lock, eye, message-circle, phone, mail, map-pin, calendar, bar-chart, settings, search, thumbs-up, headphones, cpu, layers, puzzle, wrench, dollar-sign, brain, leaf, palette, camera, code, database, cloud, shield-check
- services: { heading?, subheading?, services: [{ title, description, price?, icon?, link? }], columns?: 2|3|4, variant?: "cards"|"numbered" }
  - IMPORTANT: "icon" must be a Lucide icon name (same list as features), NOT an emoji.
- testimonials: { heading?, subheading?, testimonials: [{ quote, author, role?, company? }] }
- cta: { heading, subheading?, primaryCta?: {label, href}, secondaryCta?: {label, href}, variant?: "default"|"dark"|"gradient" }
- contact: { heading?, subheading?, email?, phone?, address?, showForm?: true, showInfo?: true }
- stats: { heading?, stats: [{ value, label }], variant?: "default"|"gradient"|"cards" }
- faq: { heading?, subheading?, items: [{ question, answer }] }
- process: { heading?, subheading?, steps: [{ title, description, icon? }] }
  - IMPORTANT: "icon" must be a Lucide icon name (same list as features), NOT an emoji. If omitted, a step number is shown instead.
- pricing: { heading?, subheading?, plans: [{ name, description?, price, period?, features: [string], ctaText?, ctaLink?, highlighted?: boolean }] }
- logos: { heading?, logos: [{ name, src? }] }
- columns: { heading?, subheading?, columns?: 2|3|4, layout?: "equal"|"wide-left"|"wide-right", gap?: "sm"|"md"|"lg", items: [{ heading?, text?, image?, icon?, list?: [string], cta?: {label, href} }] }
  - Use for flexible multi-column layouts that don't fit a semantic block type
  - Each item is one column — fill in whichever fields are needed (all are optional)
  - "wide-left" gives 2/3 to the first column, "wide-right" gives 2/3 to the second column (only for 2 columns)
  - IMPORTANT: "icon" must be a Lucide icon name (same list as features), NOT an emoji.

Tips:
- Use "badge" on hero to add a small label above the heading (e.g. "AI-Powered Platform")
- Use "highlightWord" on hero to make one word gradient-colored (e.g. heading "Transform Your Business", highlightWord "Transform")
- Use "stats" on hero for inline metrics row (e.g. [{value: "500+", label: "Clients"}])
- Use "variant: numbered" on services for step-numbered cards
- For dark sites, prefer CTA "variant: gradient" or "variant: dark" (avoid "default" which is light)
- Use "stats" block with "variant: gradient" for an eye-catching metrics band
- Use "process" block for "How it works" sections with numbered steps
- Use "logos" block for "Trusted by" sections (use text names if no image URLs available)
- Use "columns" block for custom layouts: image + text side-by-side, multi-column cards, or any layout that doesn't fit a semantic block
- Use "columns" with layout "wide-left" for image-left + text-right sections, or "wide-right" for text-left + image-right
`;

// ===========================================
// SITE GENERATION
// ===========================================

/**
 * Generate a complete site structure from business context + style choices.
 */
export async function generateSiteFromDescription(context: {
  organizationContext: OrganizationContext;
  businessContext?: BusinessContext;
  businessDescription?: string;
  targetAudience?: string;
  services?: string[];
  style?: "modern" | "classic" | "minimal" | "bold";
  styleChoices?: {
    colorMode?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontHeading?: string;
    fontBody?: string;
    heroStyle?: string;
    headerStyle?: string;
    footerStyle?: string;
  };
  /** When provided, skip AI design token generation and use these directly */
  presetDesignTokens?: Record<string, string>;
  /** Inject into system prompt so content copy matches the design mood */
  moodSummary?: string;
  /** Available images from the organization's media library */
  availableImages?: AvailableImage[];
}): Promise<GeneratedSite> {
  const bc = context.businessContext;
  const businessName = bc?.name || context.organizationContext.name;
  const industry = bc?.industry || context.organizationContext.industry || "General Services";
  const description = bc?.description || context.businessDescription || businessName;
  const audience = bc?.targetAudience || context.targetAudience || "";
  const serviceList = bc?.services?.map((s) => `${s.name}${s.description ? ` - ${s.description}` : ""}`) || context.services || [];
  const tone = bc?.toneOfVoice || context.organizationContext.toneOfVoice || "professional";
  const locale = context.organizationContext.locale || "en";
  const uniqueValue = bc?.uniqueValue || "";
  const painPoints = bc?.painPoints || [];
  const buyerTriggers = bc?.buyerTriggers || [];
  const wordsToAvoid = bc?.wordsToAvoid || "";

  const hasExplicitColors = !!context.styleChoices?.primaryColor;
  const colorMode = context.styleChoices?.colorMode || "light";
  const isDark = colorMode === "dark";

  const systemPrompt = `You are a premium web designer and copywriter who creates sites that look like $50k custom builds. Your job is to generate compelling website content, visual design tokens, and structure.

You generate websites in JSON format. Be creative but professional. Write compelling copy that converts visitors into customers.

Guidelines:
- Write in the appropriate language based on the locale
- Keep headings short and impactful (max 8 words for hero, 6 for sections)
- Use benefit-focused copy that addresses customer pain points
- Include clear calls-to-action
- Be specific rather than generic — avoid cliché phrases like "unlock your potential"
- Incorporate the unique value proposition naturally into the copy
- Create a cohesive visual style through design tokens — the tokens are what make the site look premium
- For icon fields in features, services, and process blocks: use Lucide icon names (lowercase, hyphenated) like "zap", "shield", "rocket", "target", "users", etc. NEVER use emoji characters for icons.
${wordsToAvoid ? `- NEVER use these words/phrases: ${wordsToAvoid}` : ""}
${isDark ? `- The site uses DARK MODE. Design tokens should work well on dark surfaces. Use "gradient" or "dark" CTA variants. Consider adding glow effects for premium feel.` : ""}
${context.moodSummary ? `- Design mood/direction from the designer consultation: ${context.moodSummary}. Ensure the copy tone and energy match this visual direction.` : ""}

${hasExplicitColors ? "Use the exact colors provided by the user." : `Choose colors that match the industry and style:
- Use hex color codes
- Primary color should be bold and recognizable
- Secondary color should complement the primary`}

${DESIGN_TOKEN_DOCS}

${BLOCK_TYPE_DOCS}
${formatImageContext(context.availableImages)}`;

  const userPrompt = `Create a premium website for:

Business: ${businessName}
Industry: ${industry}
Description: ${description}
${audience ? `Target Audience: ${audience}` : ""}
${serviceList.length > 0 ? `Services offered:\n${serviceList.map((s) => `- ${s}`).join("\n")}` : ""}
${uniqueValue ? `Unique Value Proposition: ${uniqueValue}` : ""}
${painPoints.length > 0 ? `Customer Pain Points: ${painPoints.join(", ")}` : ""}
${buyerTriggers.length > 0 ? `What makes customers buy: ${buyerTriggers.join(", ")}` : ""}
Style preference: ${context.style || "modern"}
Color mode: ${colorMode}
${hasExplicitColors ? `Primary Color: ${context.styleChoices!.primaryColor}\nSecondary Color: ${context.styleChoices!.secondaryColor}` : ""}
Locale: ${locale}
Tone: ${tone}

Generate a complete website with these pages:
1. Home - hero (with badge + highlightWord + stats), features, services overview, testimonials, stats band, CTA
2. About - company story, process/how-we-work, team values
3. Services - detailed service offerings with pricing or descriptions
4. Contact - contact form and information

${context.presetDesignTokens ? `IMPORTANT: Design tokens have already been decided. You MUST use exactly these design tokens and NOT generate your own:\n${JSON.stringify(context.presetDesignTokens, null, 2)}` : `IMPORTANT: Also generate "designTokens" — a flat object of CSS token overrides that define the site's visual personality. Choose tokens that match the business vibe and style preference. This is what makes sites look premium vs template-y.`}

Return ONLY valid JSON (no markdown, no explanation):
{
  "name": "Business Name",
  "tagline": "A compelling tagline",
  "description": "SEO-friendly description of the business",
  "primaryColor": "${context.styleChoices?.primaryColor || "#hex"}",
  "secondaryColor": "${context.styleChoices?.secondaryColor || "#hex"}",
  "designTokens": {
    "heading-weight": "800",
    ...
  },
  "pages": [
    {
      "title": "Page Title",
      "slug": "page-slug",
      "metaTitle": "SEO Title | Business Name",
      "metaDescription": "SEO description",
      "blocks": [{ "type": "hero", "data": { "heading": "...", ... } }, ...]
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to generate site content");
  }

  if (response.stop_reason === "max_tokens") {
    console.error("AI response was truncated due to max_tokens limit");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
    }
    if (!jsonStr.startsWith("{")) {
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }
    }
    const result = JSON.parse(jsonStr) as GeneratedSite;
    // Ensure designTokens exists
    if (!result.designTokens) {
      result.designTokens = {};
    }
    // If preset tokens were provided by the designer, merge them in (they take priority)
    if (context.presetDesignTokens) {
      result.designTokens = { ...result.designTokens, ...context.presetDesignTokens };
    }
    return result;
  } catch (e) {
    console.error("Failed to parse AI response. Raw text:", textContent.text.substring(0, 500));
    console.error("Parse error:", e);
    throw new Error("Failed to parse generated site content");
  }
}

// ===========================================
// PAGE CONTENT GENERATION
// ===========================================

/**
 * Generate content for a specific page
 */
export async function generatePageContent(context: {
  organizationContext: OrganizationContext;
  pageType: "home" | "about" | "services" | "contact" | "custom";
  pageTitle?: string;
  pageDescription?: string;
  existingContent?: string;
  availableImages?: AvailableImage[];
}): Promise<GeneratedPage> {
  const systemPrompt = `You are a premium web copywriter. Generate compelling page content that converts visitors into customers.

Write in the appropriate language based on the locale. Be specific and benefit-focused.

${BLOCK_TYPE_DOCS}
${formatImageContext(context.availableImages)}`;

  const pageTypePrompts: Record<string, string> = {
    home: "Create a homepage with hero (use badge + highlightWord), feature highlights, stats, testimonials, and a strong CTA.",
    about: "Create an about page with the company story, a process/how-we-work section, and values.",
    services: "Create a services page with detailed offerings. Consider using the pricing block if applicable.",
    contact: "Create a contact page with FAQ section and contact form.",
    custom: `Create a page about: ${context.pageTitle || "Custom content"}`,
  };

  const userPrompt = `Generate page content for ${context.organizationContext.name}.

Industry: ${context.organizationContext.industry || "General Services"}
Page Type: ${context.pageType}
${context.pageTitle ? `Page Title: ${context.pageTitle}` : ""}
${context.pageDescription ? `Additional Context: ${context.pageDescription}` : ""}
Locale: ${context.organizationContext.locale || "en"}
Tone: ${context.organizationContext.toneOfVoice || "professional"}

${pageTypePrompts[context.pageType]}

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Page Title",
  "slug": "page-slug",
  "metaTitle": "SEO Title",
  "metaDescription": "SEO description",
  "blocks": [...]
}`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to generate page content");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr) as GeneratedPage;
  } catch {
    throw new Error("Failed to parse generated page content");
  }
}

// ===========================================
// BLOCK CONTENT GENERATION
// ===========================================

/**
 * Generate or improve content for a specific block
 */
export async function generateBlockContent(context: {
  organizationContext: OrganizationContext;
  blockType: GeneratedBlock["type"];
  instructions?: string;
  currentContent?: Record<string, unknown>;
  availableImages?: AvailableImage[];
}): Promise<GeneratedBlock> {
  const systemPrompt = `You are a premium web copywriter. Generate compelling content for website blocks.

Be concise, benefit-focused, and persuasive. Write in the appropriate language based on locale.

${BLOCK_TYPE_DOCS}
${formatImageContext(context.availableImages)}`;

  const blockTypeInstructions: Record<string, string> = {
    hero: "Generate a compelling hero section with a strong headline, badge text, highlightWord for gradient effect, and optional stats row.",
    text: "Generate engaging text content with an optional heading.",
    features: "Generate 3-4 key features or benefits with icons. Use Lucide icon names (NOT emoji): zap, shield, heart, star, check, rocket, target, users, clock, globe, sparkles, lightbulb, trending-up, award, lock, eye, layers, cpu, brain, leaf, code, database, wrench, dollar-sign.",
    services: "Generate a list of 3-4 services with descriptions. Use Lucide icon names (NOT emoji) for icon fields: zap, shield, rocket, target, users, globe, sparkles, lightbulb, trending-up, award, layers, wrench, dollar-sign, code, database, brain, palette.",
    testimonials: "Generate 2-3 realistic customer testimonials.",
    cta: "Generate a compelling call-to-action section.",
    contact: "Generate contact section content.",
    image: "Generate alt text and caption for an image placeholder.",
    stats: "Generate 3-4 impressive statistics/metrics.",
    faq: "Generate 4-6 frequently asked questions with helpful answers.",
    process: "Generate 3-5 steps for a 'How it works' section. Use Lucide icon names (NOT emoji) for optional icon fields.",
    pricing: "Generate 2-3 pricing plans with features.",
    logos: "Generate 4-6 client/partner company names for a 'Trusted by' section.",
    columns: "Generate a flexible multi-column layout. Each column item can have any combination of heading, text, image, icon, list, and cta. Use Lucide icon names (NOT emoji) for optional icon fields.",
  };

  const userPrompt = `Generate ${context.blockType} block content for ${context.organizationContext.name}.

Industry: ${context.organizationContext.industry || "General Services"}
Locale: ${context.organizationContext.locale || "en"}
Tone: ${context.organizationContext.toneOfVoice || "professional"}

${blockTypeInstructions[context.blockType]}
${context.instructions ? `Additional instructions: ${context.instructions}` : ""}
${context.currentContent ? `Current content to improve: ${JSON.stringify(context.currentContent)}` : ""}

Return ONLY valid JSON (no markdown):
{
  "type": "${context.blockType}",
  "data": { ... }
}`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to generate block content");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr) as GeneratedBlock;
  } catch {
    throw new Error("Failed to parse generated block content");
  }
}

// ===========================================
// BLOG POST GENERATION
// ===========================================

/**
 * Generate a blog post
 */
export async function generateBlogPost(context: {
  organizationContext: OrganizationContext;
  topic: string;
  keywords?: string[];
  targetLength?: "short" | "medium" | "long";
  existingPosts?: string[];
}): Promise<GeneratedBlogPost> {
  const systemPrompt = `You are a professional content writer and SEO expert. Write engaging blog posts that provide value to readers while naturally incorporating keywords.

Guidelines:
- Write in the appropriate language based on locale
- Use clear headings and subheadings
- Include actionable advice
- Be specific with examples
- Write for humans, optimize for search engines`;

  const lengthGuide = {
    short: "400-600 words",
    medium: "800-1200 words",
    long: "1500-2000 words",
  };

  const userPrompt = `Write a blog post for ${context.organizationContext.name}.

Industry: ${context.organizationContext.industry || "General Services"}
Topic: ${context.topic}
${context.keywords?.length ? `Keywords to include: ${context.keywords.join(", ")}` : ""}
Target length: ${lengthGuide[context.targetLength || "medium"]}
Locale: ${context.organizationContext.locale || "en"}
Tone: ${context.organizationContext.toneOfVoice || "professional"}
${context.existingPosts?.length ? `Avoid topics similar to: ${context.existingPosts.join(", ")}` : ""}

Return ONLY valid JSON (no markdown wrapper):
{
  "title": "Engaging Blog Title",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence summary for previews",
  "content": "<p>Full blog content as HTML...</p>",
  "metaTitle": "SEO optimized title | Brand",
  "metaDescription": "SEO meta description under 160 characters",
  "tags": ["tag1", "tag2"]
}

Important: The content field should be valid HTML with <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em> tags.`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to generate blog post");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr) as GeneratedBlogPost;
  } catch {
    throw new Error("Failed to parse generated blog post");
  }
}

// ===========================================
// TITLE & EXCERPT REGENERATION
// ===========================================

/**
 * Regenerate title and excerpt from current blog content.
 */
export async function regenerateTitleAndExcerpt(context: {
  organizationContext: OrganizationContext;
  contentHtml: string;
}): Promise<{ title: string; excerpt: string }> {
  const locale = context.organizationContext.locale || "en";
  const tone = context.organizationContext.toneOfVoice || "professional";

  const systemPrompt = `You are a professional content strategist. Generate a compelling blog post title and excerpt based on the provided content.

Rules:
- Title: max 70 characters, engaging, specific — not clickbait
- Excerpt: 2-3 sentences suitable for preview cards and social sharing
- Match the tone and language of the content
- Write in the appropriate language based on the locale
- Return ONLY valid JSON, no markdown wrappers`;

  const userPrompt = `Generate a new title and excerpt for this blog post.

Locale: ${locale}
Tone: ${tone}
Business: ${context.organizationContext.name}

Blog content:
${context.contentHtml.slice(0, 3000)}

Return ONLY valid JSON:
{
  "title": "Engaging title here",
  "excerpt": "2-3 sentence excerpt here."
}`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 256,
    temperature: 0.5,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to regenerate title and excerpt");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse regenerated title and excerpt");
  }
}

// ===========================================
// SEO GENERATION
// ===========================================

/**
 * Generate SEO metadata for a page
 */
export async function generateSEOMetadata(context: {
  organizationContext: OrganizationContext;
  pageTitle: string;
  pageContent: string;
  keywords?: string[];
}): Promise<{ metaTitle: string; metaDescription: string }> {
  const systemPrompt = `You are an SEO expert. Generate optimized meta titles and descriptions.

Rules:
- Meta title: 50-60 characters, include brand name
- Meta description: 150-160 characters, include call-to-action
- Be specific and compelling
- Write in the appropriate language`;

  const userPrompt = `Generate SEO metadata for this page.

Business: ${context.organizationContext.name}
Page Title: ${context.pageTitle}
Content Summary: ${context.pageContent.slice(0, 500)}...
${context.keywords?.length ? `Target keywords: ${context.keywords.join(", ")}` : ""}
Locale: ${context.organizationContext.locale || "en"}

Return ONLY valid JSON:
{
  "metaTitle": "Title | Brand",
  "metaDescription": "Compelling description with CTA"
}`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 256,
    temperature: 0.5,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to generate SEO metadata");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse generated SEO metadata");
  }
}

// ===========================================
// CHAT-BASED BLOCK EDITING
// ===========================================

export interface ChatEditResult {
  content: string;
  updatedData?: Record<string, unknown>;
  updatedHtml?: string;
}

/**
 * Conversational block editing using Claude tool_use.
 * Sends conversation history + current block data, returns AI text + optional block update.
 */
export async function chatEditBlockContent(context: {
  blockType: string;
  currentData: Record<string, unknown>;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  availableImages?: AvailableImage[];
}): Promise<ChatEditResult> {
  const UPDATE_BLOCK_TOOL: Anthropic.Tool = {
    name: "update_block",
    description:
      "Update the block content with new data. Always include ALL fields, not just changed ones.",
    input_schema: {
      type: "object" as const,
      properties: {
        data: {
          type: "object",
          description: "Complete updated block data with all fields",
        },
      },
      required: ["data"],
    },
  };

  const systemPrompt = `You are an AI assistant helping a user edit a "${context.blockType}" block on their website. You can both respond conversationally AND update the block content using the update_block tool.

Current block data:
${JSON.stringify(context.currentData, null, 2)}

${BLOCK_TYPE_DOCS}
${formatImageContext(context.availableImages)}
Instructions:
- When the user asks you to change content, respond with a brief confirmation AND call the update_block tool with the complete updated data.
- When the user asks a question (e.g. "what fields can I change?"), just respond with text — no tool call needed.
- Always include ALL existing fields in your update_block call, not just the ones you changed. This ensures no data is lost.
- Keep your text responses concise and friendly.
- For icon fields, use Lucide icon names (lowercase, hyphenated), never emoji.`;

  const apiMessages: Anthropic.MessageParam[] = context.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let textContent = "";
  let updatedData: Record<string, unknown> | undefined;
  let currentMessages = apiMessages;
  let iterations = 0;

  while (iterations < 3) {
    iterations++;

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      temperature: 0.7,
      system: systemPrompt,
      messages: currentMessages,
      tools: [UPDATE_BLOCK_TOOL],
    });

    // Extract text content
    for (const block of response.content) {
      if (block.type === "text") {
        textContent += (textContent ? "\n" : "") + block.text;
      }
    }

    // Check for tool use
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
        block.type === "tool_use"
    );

    if (toolUseBlock && toolUseBlock.name === "update_block") {
      const input = toolUseBlock.input as { data: Record<string, unknown> };
      updatedData = input.data;

      // If the model wants to continue after tool use, send tool result back
      if (response.stop_reason === "tool_use") {
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseBlock.id,
                content: "Block updated successfully.",
              },
            ],
          },
        ];
        continue;
      }
    }

    break;
  }

  if (!textContent) {
    textContent = "I've updated the block.";
  }

  return { content: textContent, updatedData };
}

// ===========================================
// CONTENT IMPROVEMENT
// ===========================================

/**
 * Improve existing content with AI
 */
export async function improveContent(context: {
  organizationContext: OrganizationContext;
  content: string;
  improvementType: "clarity" | "persuasion" | "seo" | "tone" | "length";
  additionalInstructions?: string;
}): Promise<string> {
  const systemPrompt = `You are a professional editor and copywriter. Improve content while maintaining the original meaning and intent.`;

  const improvementPrompts: Record<string, string> = {
    clarity: "Make this content clearer and easier to understand. Simplify complex sentences.",
    persuasion: "Make this content more persuasive and compelling. Add benefit-focused language.",
    seo: "Optimize this content for search engines while keeping it natural and readable.",
    tone: `Adjust the tone to be more ${context.organizationContext.toneOfVoice || "professional"}.`,
    length: "Make this content more concise without losing key information.",
  };

  const userPrompt = `Improve this content for ${context.organizationContext.name}.

Original content:
${context.content}

Improvement goal: ${improvementPrompts[context.improvementType]}
${context.additionalInstructions ? `Additional instructions: ${context.additionalInstructions}` : ""}
Locale: ${context.organizationContext.locale || "en"}

Return ONLY the improved content, no explanations or markers.`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    temperature: 0.5,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to improve content");
  }

  return textContent.text.trim();
}

// ===========================================
// INLINE SELECTION EDITING
// ===========================================

/**
 * Edit a specific selection within a blog post.
 * Sends the selected HTML + full document context + instruction to Claude.
 * Returns only the replacement HTML for the selection.
 */
export async function inlineEditSelection(context: {
  selectedHtml: string;
  fullDocumentHtml: string;
  instruction: string;
}): Promise<{ updatedHtml: string }> {
  const isGenerateMode = !context.selectedHtml;

  const systemPrompt = isGenerateMode
    ? "You are a professional content writer helping to write blog post content. Generate HTML content based on the user's instruction that fits naturally into the existing blog post. Return ONLY the HTML to insert — no explanation, no markdown wrappers. Use semantic HTML tags (p, h2, h3, strong, em, a, ul, ol, li, blockquote)."
    : "You are editing a specific selection within a blog post. Return ONLY the rewritten selection HTML, not the full document. Do not include any explanation, markdown wrappers, or extra text. Return only the HTML that should replace the selected portion. Use semantic HTML tags (p, h2, h3, strong, em, a, ul, ol, li, blockquote). Preserve the general structure unless the instruction specifically asks to change it.";

  const userPrompt = isGenerateMode
    ? `Here is the current blog post for context:\n\n${context.fullDocumentHtml}\n\n---\n\nInstruction: ${context.instruction}\n\nGenerate HTML content to insert into the blog post based on the instruction above.`
    : `Here is the full blog post for context:\n\n${context.fullDocumentHtml}\n\n---\n\nHere is the specific selected text to edit:\n\n${context.selectedHtml}\n\n---\n\nInstruction: ${context.instruction}\n\nReturn ONLY the replacement HTML for the selected text.`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    temperature: 0.5,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to get AI response for inline edit");
  }

  let html = textContent.text.trim();
  if (html.startsWith("```")) {
    html = html
      .replace(/^```(?:html)?\s*\n?/, "")
      .replace(/\n?\s*```\s*$/, "");
  }

  return { updatedHtml: html };
}

// ===========================================
// CHAT-BASED BLOG CONTENT EDITING
// ===========================================

/**
 * Conversational blog content editing using Claude tool_use.
 * Sends conversation history + current HTML, returns AI text + optional HTML update.
 */
export async function chatEditBlogContent(context: {
  currentHtml: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatEditResult> {
  const UPDATE_CONTENT_TOOL: Anthropic.Tool = {
    name: "update_content",
    description:
      "Update the blog post HTML content. Provide the complete updated HTML.",
    input_schema: {
      type: "object" as const,
      properties: {
        html: {
          type: "string",
          description: "The complete updated HTML content for the blog post",
        },
      },
      required: ["html"],
    },
  };

  const systemPrompt = `You are an AI assistant helping a user edit their blog post content. You can both respond conversationally AND update the content using the update_content tool.

Current blog post HTML:
${context.currentHtml || "<p></p>"}

Instructions:
- When the user asks you to change content, respond with a brief confirmation AND call the update_content tool with the complete updated HTML.
- When the user asks a question (e.g. "how long is this post?"), just respond with text — no tool call needed.
- Always provide the COMPLETE updated HTML in your update_content call, not just the changed parts.
- Use semantic HTML tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a>.
- Keep your text responses concise and friendly.
- Write professional, engaging content.`;

  const apiMessages: Anthropic.MessageParam[] = context.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let textContent = "";
  let updatedHtml: string | undefined;
  let currentMessages = apiMessages;
  let iterations = 0;

  while (iterations < 3) {
    iterations++;

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: currentMessages,
      tools: [UPDATE_CONTENT_TOOL],
    });

    // Extract text content
    for (const block of response.content) {
      if (block.type === "text") {
        textContent += (textContent ? "\n" : "") + block.text;
      }
    }

    // Check for tool use
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
        block.type === "tool_use"
    );

    if (toolUseBlock && toolUseBlock.name === "update_content") {
      const input = toolUseBlock.input as { html: string };
      updatedHtml = input.html;

      // If the model wants to continue after tool use, send tool result back
      if (response.stop_reason === "tool_use") {
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseBlock.id,
                content: "Content updated successfully.",
              },
            ],
          },
        ];
        continue;
      }
    }

    break;
  }

  if (!textContent) {
    textContent = "I've updated the content.";
  }

  return { content: textContent, updatedHtml };
}
