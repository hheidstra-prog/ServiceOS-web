import type { BusinessContext } from "@/lib/ai";
import type { MoodboardItem, DesignDirection } from "./types";

/**
 * Build the system prompt for the AI Designer persona.
 * The designer only discusses visual design — never asks about the business itself.
 */
export function buildDesignerSystemPrompt(
  businessContext: BusinessContext,
  moodboardItems: MoodboardItem[],
  designDirection: DesignDirection | null
): string {
  const locale = businessContext.locale || "en";
  const isNl = locale === "nl";

  const businessSummary = [
    `Business: ${businessContext.name}`,
    businessContext.industry && `Industry: ${businessContext.industry}`,
    businessContext.description && `Description: ${businessContext.description}`,
    businessContext.tagline && `Tagline: ${businessContext.tagline}`,
    businessContext.targetAudience && `Target audience: ${businessContext.targetAudience}`,
    businessContext.toneOfVoice && `Tone: ${businessContext.toneOfVoice}`,
    businessContext.services?.length &&
      `Services: ${businessContext.services.map((s) => s.name).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const currentMoodboard =
    moodboardItems.length > 0
      ? `\n\nCurrent moodboard items:\n${moodboardItems
          .map((item) => {
            switch (item.type) {
              case "color_palette":
                return `- Color palette "${item.name}": ${item.colors.join(", ")}`;
              case "typography":
                return `- Typography: ${item.heading} / ${item.body} (${item.vibe})`;
              case "style_keyword":
                return `- Style keyword [${item.category}]: ${item.keyword}`;
              case "uploaded_image":
                return `- Uploaded image: ${item.filename}${item.analysis ? ` (${item.analysis.summary})` : ""}`;
              case "layout_preference":
                return `- Layout: ${item.key} = ${item.value}`;
              case "design_token":
                return `- Design token: ${item.token} = ${item.value} (${item.description})`;
              case "mood_description":
                return `- Mood: ${item.description}`;
            }
          })
          .join("\n")}`
      : "";

  const directionStatus = designDirection
    ? `\n\nDesign direction has been set (confidence: ${designDirection.confidence}). The user can generate the site.`
    : "";

  return `You are a senior creative director doing a design intake for a client's website. This is a real conversation — you need to LISTEN first and understand what they want before proposing anything.

## Personality
- Warm, curious, expert — you ask great questions and really listen
- Short and natural (2-3 sentences per message). No bullet points, no lists.
- When you DO make recommendations later, be specific and opinionated
${isNl ? "- Respond in Dutch since the user's locale is Dutch" : "- Respond in English"}

## Business context (you already know this — never ask about it)
${businessSummary}

## How a real design intake works

### Step 1: LISTEN first (messages 1-3)
Start by understanding the client's taste. Ask discovery questions like a real designer would:
- "Are there any websites you really love the look of? Doesn't have to be in your industry."
- "Do you have existing brand assets — a logo, brand colors, anything like that?"
- "When someone lands on your site, what should they feel in the first few seconds?"
- "Do you lean more minimal and clean, or more bold and expressive?"

Ask ONE question per message. Actually listen to the answer before moving on. If the client shares a site they like, acknowledge it specifically. If they don't know, that's fine — help them by offering concrete alternatives (e.g. "Would you say more like a Stripe-style clean look, or something warmer and more personal?").

### Step 2: PROPOSE based on what you heard (messages 3-5)
Now that you understand their taste, make concrete proposals:
- Show 1-2 reference websites (suggest_reference_site) that match what they described
- Propose a color palette and explain why it fits their vibe
- Suggest typography and layout direction

Use your tools to add items to the moodboard as you propose. If they disagree, adjust.

### Step 3: REFINE the details (messages 5-7)
Dial in the specifics:
- Fine-tune colors, fonts, layout density, shape language
- Ask if they have a logo to include (casually — don't force it)
- Near the end, ask one quick question about blog content they'd find useful

### Step 4: FINALIZE
When the direction is clear, call update_design_direction and tell them they can generate.

## Tools
Use tools naturally as the conversation progresses — don't rush them all in early.
- suggest_reference_site: show real websites as examples (best used in Step 2 after you've listened)
- add_color_palette, add_typography, add_style_keyword, add_layout_preference, add_design_token: build the moodboard
- set_logo: when user shares a logo image
- set_blog_preferences: when user mentions blog topics
- update_design_direction: when direction is finalized

CRITICAL: Every response MUST include conversational text for the client. Never respond with only tool calls and no visible message.
${currentMoodboard}
${directionStatus}

## Rules
- 2-3 sentences max per message
- ONE question or topic per message — never combine unrelated things
- In Step 1: ASK and LISTEN. Don't propose yet.
- In Step 2+: PROPOSE based on what you learned, then ask for feedback
- Don't narrate your tool usage — just use tools silently while talking
- Never generate site content or copy — visual design only
- If the user drops an image, analyze it and extract design inspiration`;
}

/**
 * Tool definitions for the AI Designer.
 * These map to moodboard reducer actions on the client side.
 */
export const DESIGNER_TOOLS = [
  {
    name: "add_color_palette",
    description:
      "Add a color palette to the moodboard. Use when the user mentions colors they like, or when you want to suggest a palette based on the conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        colors: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Array of hex color codes (3-6 colors)",
        },
        name: {
          type: "string" as const,
          description: "A descriptive name for this palette (e.g. 'Ocean Depths', 'Warm Sunset')",
        },
      },
      required: ["colors", "name"],
    },
  },
  {
    name: "add_typography",
    description:
      "Add a typography pairing to the moodboard. Use when discussing font preferences.",
    input_schema: {
      type: "object" as const,
      properties: {
        heading: {
          type: "string" as const,
          description: "Google Font name for headings (e.g. 'Inter', 'Playfair Display', 'Montserrat')",
        },
        body: {
          type: "string" as const,
          description: "Google Font name for body text",
        },
        vibe: {
          type: "string" as const,
          description: "Short description of the feeling (e.g. 'Clean & Modern', 'Classic & Elegant')",
        },
      },
      required: ["heading", "body", "vibe"],
    },
  },
  {
    name: "add_style_keyword",
    description:
      "Add a style keyword to the moodboard. Use to capture design direction as single descriptive words.",
    input_schema: {
      type: "object" as const,
      properties: {
        keyword: {
          type: "string" as const,
          description: "A single design keyword (e.g. 'luxurious', 'airy', 'geometric', 'tactile')",
        },
        category: {
          type: "string" as const,
          enum: ["mood", "density", "shape", "feel"],
          description: "Category: mood (emotional feel), density (spacious vs packed), shape (rounded vs angular), feel (texture/material)",
        },
      },
      required: ["keyword", "category"],
    },
  },
  {
    name: "add_layout_preference",
    description:
      "Add a layout preference to the moodboard. Use for structural design decisions.",
    input_schema: {
      type: "object" as const,
      properties: {
        key: {
          type: "string" as const,
          description: "The layout aspect (e.g. 'heroStyle', 'headerStyle', 'footerStyle', 'colorMode', 'spacing', 'cardStyle')",
        },
        value: {
          type: "string" as const,
          description: "The chosen value (e.g. 'centered', 'split', 'minimal', 'dark', 'spacious')",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "add_design_token",
    description:
      "Add a specific CSS design token override to the moodboard. Use for granular visual decisions like border radius, shadows, animation speed.",
    input_schema: {
      type: "object" as const,
      properties: {
        token: {
          type: "string" as const,
          description: "CSS token name without -- prefix (e.g. 'radius-card', 'shadow-card', 'heading-weight')",
        },
        value: {
          type: "string" as const,
          description: "The CSS value (e.g. '1.5rem', '800', '0 0 30px -5px var(--color-primary-500)')",
        },
        description: {
          type: "string" as const,
          description: "Human-readable description of what this token controls",
        },
      },
      required: ["token", "value", "description"],
    },
  },
  {
    name: "suggest_reference_site",
    description:
      "Show the user a real website as a design reference. Use this when you want to give the user a concrete visual example of a style, layout, or mood you're describing. Include 1-2 reference sites to illustrate your point.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string" as const,
          description: "Full URL of the reference website (e.g. 'https://stripe.com', 'https://linear.app')",
        },
        title: {
          type: "string" as const,
          description: "Short name for the site (e.g. 'Stripe', 'Linear')",
        },
        description: {
          type: "string" as const,
          description: "Brief note on what design element to notice (e.g. 'Clean typography and spacious layout', 'Bold dark mode with vibrant accents')",
        },
      },
      required: ["url", "title", "description"],
    },
  },
  {
    name: "set_logo",
    description:
      "Set the user's logo URL. Call this when the user uploads or shares a logo image. The URL should be the image URL from the uploaded file.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string" as const,
          description: "The URL of the uploaded logo image",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "set_blog_preferences",
    description:
      "Capture the user's blog content preferences. Call this when the user mentions blog topics they're interested in or a writing style they prefer.",
    input_schema: {
      type: "object" as const,
      properties: {
        topics: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Blog topics the user is interested in (e.g. 'industry tips', 'case studies', 'how-to guides')",
        },
        style: {
          type: "string" as const,
          description: "Preferred writing style (e.g. 'casual and friendly', 'professional and authoritative', 'educational')",
        },
      },
      required: [],
    },
  },
  {
    name: "update_design_direction",
    description:
      "Synthesize all moodboard items into a final design direction. Call this when you feel confident about the overall visual direction after discussing preferences with the user. This enables the 'Generate Site' button.",
    input_schema: {
      type: "object" as const,
      properties: {
        colorMode: {
          type: "string" as const,
          enum: ["light", "dark"],
          description: "Light or dark color mode",
        },
        primaryColor: {
          type: "string" as const,
          description: "Primary brand color as hex",
        },
        secondaryColor: {
          type: "string" as const,
          description: "Secondary accent color as hex",
        },
        fontHeading: {
          type: "string" as const,
          description: "Google Font name for headings",
        },
        fontBody: {
          type: "string" as const,
          description: "Google Font name for body text",
        },
        heroStyle: {
          type: "string" as const,
          enum: ["centered", "split", "background", "minimal"],
          description: "Hero section layout style",
        },
        headerStyle: {
          type: "string" as const,
          enum: ["standard", "centered", "minimal"],
          description: "Header layout style",
        },
        footerStyle: {
          type: "string" as const,
          enum: ["standard", "simple", "expanded"],
          description: "Footer layout style",
        },
        designTokens: {
          type: "object" as const,
          description:
            "CSS design token overrides as key-value pairs (e.g. heading-weight, radius-card, shadow-card, etc.)",
        },
        confidence: {
          type: "number" as const,
          description: "Your confidence in this direction (0.0 to 1.0)",
        },
        summary: {
          type: "string" as const,
          description:
            "A 1-2 sentence summary of the design direction in plain language",
        },
        logoUrl: {
          type: "string" as const,
          description: "URL of the user's logo if one was provided via set_logo",
        },
        blogPreferences: {
          type: "object" as const,
          description: "Blog content preferences if discussed",
          properties: {
            topics: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Blog topics",
            },
            style: {
              type: "string" as const,
              description: "Writing style",
            },
          },
        },
      },
      required: [
        "colorMode",
        "primaryColor",
        "secondaryColor",
        "fontHeading",
        "fontBody",
        "heroStyle",
        "headerStyle",
        "footerStyle",
        "designTokens",
        "confidence",
        "summary",
      ],
    },
  },
];
