import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { AI_TOOLS, executeTool } from "./ai-tools";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default model - can be overridden per request
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// Maximum tool use iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 5;

// Types
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  industry?: string | null;
  toneOfVoice?: string | null;
  locale?: string;
}

/** Enriched business context pulled from Organization + BusinessProfile + Services */
export interface BusinessContext extends OrganizationContext {
  website?: string | null;
  description?: string | null;
  tagline?: string | null;
  targetAudience?: string | null;
  targetIndustries?: string[];
  regions?: string[];
  uniqueValue?: string | null;
  painPoints?: string[];
  buyerTriggers?: string[];
  wordsToAvoid?: string | null;
  services?: Array<{ name: string; description?: string | null; price?: string }>;
}

export interface AIResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ===========================================
// CORE CHAT FUNCTION
// ===========================================

export async function chat(
  messages: Message[],
  options?: {
    organizationContext?: OrganizationContext;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    enableTools?: boolean;
  }
): Promise<AIResponse> {
  const systemPrompt = options?.systemPrompt || buildSystemPrompt(options?.organizationContext);
  const enableTools = options?.enableTools !== false && options?.organizationContext?.id;

  // Build initial messages for API
  let apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let iterations = 0;

  // Tool use loop
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 0.7,
      system: systemPrompt,
      messages: apiMessages,
      tools: enableTools ? AI_TOOLS : undefined,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Check if the model wants to use tools
    if (response.stop_reason === "tool_use") {
      // Find all tool use blocks
      const toolUseBlocks = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        break; // No tools to execute, shouldn't happen but safety check
      }

      // Add assistant response with tool use to messages
      apiMessages.push({
        role: "assistant",
        content: response.content,
      });

      // Execute each tool and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          options!.organizationContext!.id
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.result,
        });
      }

      // Add tool results to messages
      apiMessages.push({
        role: "user",
        content: toolResults,
      });

      // Continue the loop to get the model's response after tool execution
      continue;
    }

    // Model finished without tool use, extract text response
    const textContent = response.content.find((c) => c.type === "text");

    return {
      content: textContent?.type === "text" ? textContent.text : "",
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  }

  // If we hit max iterations, return what we have
  return {
    content: "I apologize, but I encountered an issue processing your request. Please try again.",
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  };
}

// ===========================================
// STREAMING CHAT
// ===========================================

export async function* chatStream(
  messages: Message[],
  options?: {
    organizationContext?: OrganizationContext;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = options?.systemPrompt || buildSystemPrompt(options?.organizationContext);

  const stream = await anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

// ===========================================
// SYSTEM PROMPT BUILDER
// ===========================================

function buildSystemPrompt(context?: OrganizationContext): string {
  const basePrompt = `You are a helpful AI assistant for ServiceOS, a business management platform for European service providers.

Your role is to help users manage their business efficiently. You have access to tools that allow you to:
- Create and search clients
- Create projects and list project status
- Log time entries and get time summaries
- Create invoices and quotes
- Check unpaid invoices
- View bookings and schedule
- Get business summary/dashboard information

Guidelines:
- Be concise and professional
- Use the metric system and European date formats (DD-MM-YYYY)
- Default currency is EUR unless specified otherwise
- When the user asks you to perform an action (create client, log time, etc.), use the appropriate tool
- When showing lists or summaries, format the information clearly
- If you need more information to complete an action, ask clarifying questions
- After completing an action, confirm what was done and offer related suggestions`;

  if (!context) return basePrompt;

  let contextPrompt = basePrompt + "\n\n";
  contextPrompt += `You are assisting ${context.name}.`;

  if (context.industry) {
    contextPrompt += ` They operate in the ${context.industry} industry.`;
  }

  if (context.toneOfVoice) {
    const toneDescriptions: Record<string, string> = {
      formal: "Use formal, professional language.",
      professional: "Use clear, professional language.",
      friendly: "Be warm and friendly while remaining professional.",
      casual: "Use casual, conversational language.",
    };
    contextPrompt += ` ${toneDescriptions[context.toneOfVoice] || ""}`;
  }

  if (context.locale) {
    const localeDescriptions: Record<string, string> = {
      nl: "The user prefers Dutch. Respond in Dutch unless they write in another language.",
      en: "The user prefers English.",
      de: "The user prefers German. Respond in German unless they write in another language.",
      fr: "The user prefers French. Respond in French unless they write in another language.",
    };
    contextPrompt += ` ${localeDescriptions[context.locale] || ""}`;
  }

  return contextPrompt;
}

// ===========================================
// SPECIALIZED AI FUNCTIONS
// ===========================================

/**
 * Generate a professional email based on context
 */
export async function generateEmail(
  purpose: "quote_followup" | "invoice_reminder" | "booking_confirmation" | "thank_you" | "custom",
  context: {
    organizationContext: OrganizationContext;
    recipientName: string;
    recipientCompany?: string;
    customInstructions?: string;
    additionalContext?: Record<string, unknown>;
  }
): Promise<string> {
  const purposeDescriptions = {
    quote_followup: "a follow-up email for a quote that was sent",
    invoice_reminder: "a polite reminder for an overdue invoice",
    booking_confirmation: "a booking confirmation email",
    thank_you: "a thank you email after completing a project",
    custom: context.customInstructions || "a professional business email",
  };

  const systemPrompt = `You are an email writing assistant for ${context.organizationContext.name}.
Write professional, concise emails. Do not include subject lines unless asked.
${context.organizationContext.toneOfVoice === "formal" ? "Use formal language." : "Be professional but personable."}`;

  const userPrompt = `Write ${purposeDescriptions[purpose]} to ${context.recipientName}${context.recipientCompany ? ` from ${context.recipientCompany}` : ""}.
${context.additionalContext ? `\nAdditional context: ${JSON.stringify(context.additionalContext)}` : ""}
${context.customInstructions && purpose === "custom" ? `\nInstructions: ${context.customInstructions}` : ""}`;

  const response = await chat([{ role: "user", content: userPrompt }], {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 512,
  });

  return response.content;
}

/**
 * Generate a quote/proposal description
 */
export async function generateQuoteDescription(context: {
  organizationContext: OrganizationContext;
  clientName: string;
  serviceName: string;
  serviceDescription?: string;
  additionalNotes?: string;
}): Promise<string> {
  const systemPrompt = `You are a proposal writing assistant. Write clear, professional service descriptions for quotes.
Keep descriptions concise (2-4 sentences) and focused on value to the client.`;

  const userPrompt = `Write a brief service description for a quote.
Business: ${context.organizationContext.name}
Client: ${context.clientName}
Service: ${context.serviceName}
${context.serviceDescription ? `Service details: ${context.serviceDescription}` : ""}
${context.additionalNotes ? `Additional notes: ${context.additionalNotes}` : ""}`;

  const response = await chat([{ role: "user", content: userPrompt }], {
    systemPrompt,
    temperature: 0.6,
    maxTokens: 256,
  });

  return response.content;
}

/**
 * Summarize time entries for invoicing
 */
export async function summarizeTimeEntries(context: {
  organizationContext: OrganizationContext;
  entries: Array<{
    description: string | null;
    duration: number;
    date: Date;
    project?: string | null;
  }>;
  format?: "brief" | "detailed";
}): Promise<string> {
  const systemPrompt = `You are a time tracking assistant. Summarize work entries clearly and professionally for invoicing purposes.`;

  const entriesText = context.entries
    .map((e) => `- ${e.date.toLocaleDateString()}: ${e.description || "Work"} (${Math.floor(e.duration / 60)}h ${e.duration % 60}m)${e.project ? ` - ${e.project}` : ""}`)
    .join("\n");

  const userPrompt = `Summarize these time entries for an invoice${context.format === "detailed" ? " with details" : " briefly"}:

${entriesText}

Total: ${context.entries.reduce((sum, e) => sum + e.duration, 0)} minutes`;

  const response = await chat([{ role: "user", content: userPrompt }], {
    systemPrompt,
    temperature: 0.3,
    maxTokens: context.format === "detailed" ? 512 : 256,
  });

  return response.content;
}

/**
 * Generate meeting/booking notes
 */
export async function generateMeetingNotes(context: {
  organizationContext: OrganizationContext;
  bookingType: string;
  clientName: string;
  notes?: string;
  duration: number;
}): Promise<string> {
  const systemPrompt = `You are a meeting notes assistant. Generate professional meeting note templates.`;

  const userPrompt = `Create a meeting notes template for:
Type: ${context.bookingType}
Client: ${context.clientName}
Duration: ${context.duration} minutes
${context.notes ? `Existing notes: ${context.notes}` : ""}

Include sections for: Key Discussion Points, Action Items, Follow-up Required`;

  const response = await chat([{ role: "user", content: userPrompt }], {
    systemPrompt,
    temperature: 0.5,
    maxTokens: 512,
  });

  return response.content;
}

/**
 * Analyze client data and provide insights
 */
export async function analyzeClientInsights(context: {
  organizationContext: OrganizationContext;
  clientData: {
    name: string;
    totalRevenue: number;
    invoiceCount: number;
    projectCount: number;
    avgPaymentDays?: number;
    lastActivity?: Date;
  };
}): Promise<string> {
  const systemPrompt = `You are a business analytics assistant. Provide brief, actionable insights about client relationships.`;

  const userPrompt = `Analyze this client relationship for ${context.organizationContext.name}:

Client: ${context.clientData.name}
Total Revenue: €${context.clientData.totalRevenue.toLocaleString()}
Invoices: ${context.clientData.invoiceCount}
Projects: ${context.clientData.projectCount}
${context.clientData.avgPaymentDays ? `Avg Payment Time: ${context.clientData.avgPaymentDays} days` : ""}
${context.clientData.lastActivity ? `Last Activity: ${context.clientData.lastActivity.toLocaleDateString()}` : ""}

Provide 2-3 brief insights or recommendations.`;

  const response = await chat([{ role: "user", content: userPrompt }], {
    systemPrompt,
    temperature: 0.6,
    maxTokens: 256,
  });

  return response.content;
}

// ===========================================
// HELPER: GET ORGANIZATION CONTEXT
// ===========================================

export async function getOrganizationContext(organizationId: string): Promise<OrganizationContext | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      industry: true,
      toneOfVoice: true,
      locale: true,
    },
  });

  return org;
}

/**
 * Get enriched business context from Organization + BusinessProfile + Services
 */
export async function getBusinessContext(organizationId: string): Promise<BusinessContext | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      industry: true,
      toneOfVoice: true,
      locale: true,
      website: true,
      description: true,
      tagline: true,
      targetAudience: true,
      uniqueValue: true,
      businessProfile: true,
      services: {
        where: { isActive: true },
        select: {
          name: true,
          description: true,
          price: true,
          currency: true,
          pricingType: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!org) return null;

  // Prefer BusinessProfile data over Organization fields (backward compat)
  const bp = org.businessProfile;

  return {
    id: org.id,
    name: org.name,
    website: org.website,
    locale: org.locale,
    // BusinessProfile fields take precedence over Organization fields
    industry: bp?.industry || org.industry,
    toneOfVoice: bp?.toneOfVoice || org.toneOfVoice,
    description: bp?.description || org.description,
    tagline: bp?.tagline || org.tagline,
    targetAudience: bp?.targetAudience || org.targetAudience,
    uniqueValue: bp?.uniqueValue || org.uniqueValue,
    targetIndustries: bp?.targetIndustries || [],
    regions: bp?.regions || [],
    painPoints: bp?.painPoints || [],
    buyerTriggers: bp?.buyerTriggers || [],
    wordsToAvoid: bp?.wordsToAvoid || null,
    services: org.services.map((s) => ({
      name: s.name,
      description: s.description,
      price: `${s.currency} ${s.price}`,
    })),
  };
}
