"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";

// Get organization settings
export async function getOrganizationSettings() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  return db.organization.findUnique({
    where: { id: organization.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      postalCode: true,
      country: true,
      legalName: true,
      registrationNumber: true,
      vatNumber: true,
      iban: true,
      logo: true,
      primaryColor: true,
      defaultCurrency: true,
      defaultTaxRate: true,
      defaultPaymentTermDays: true,
      timezone: true,
      locale: true,
      toneOfVoice: true,
      industry: true,
    },
  });
}

// Get business profile
export async function getBusinessProfile() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  const profile = await db.businessProfile.findUnique({
    where: { organizationId: organization.id },
  });

  return profile;
}

// Update business profile (upsert)
export async function updateBusinessProfile(data: {
  industry?: string;
  description?: string;
  tagline?: string;
  targetAudience?: string;
  targetIndustries?: string[];
  regions?: string[];
  uniqueValue?: string;
  painPoints?: string[];
  buyerTriggers?: string[];
  toneOfVoice?: string;
  wordsToAvoid?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.businessProfile.upsert({
    where: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      industry: data.industry || null,
      description: data.description || null,
      tagline: data.tagline || null,
      targetAudience: data.targetAudience || null,
      targetIndustries: data.targetIndustries || [],
      regions: data.regions || [],
      uniqueValue: data.uniqueValue || null,
      painPoints: data.painPoints || [],
      buyerTriggers: data.buyerTriggers || [],
      toneOfVoice: data.toneOfVoice || null,
      wordsToAvoid: data.wordsToAvoid || null,
    },
    update: {
      industry: data.industry || null,
      description: data.description || null,
      tagline: data.tagline || null,
      targetAudience: data.targetAudience || null,
      targetIndustries: data.targetIndustries || [],
      regions: data.regions || [],
      uniqueValue: data.uniqueValue || null,
      painPoints: data.painPoints || [],
      buyerTriggers: data.buyerTriggers || [],
      toneOfVoice: data.toneOfVoice || null,
      wordsToAvoid: data.wordsToAvoid || null,
    },
  });

  // Also sync industry and toneOfVoice back to Organization for backward compat
  await db.organization.update({
    where: { id: organization.id },
    data: {
      industry: data.industry || null,
      toneOfVoice: data.toneOfVoice || null,
    },
  });

  revalidatePath("/settings");
}

// Scan website with AI to pre-fill business profile
export async function scanWebsiteForProfile(websiteUrl: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  if (!websiteUrl) throw new Error("Website URL is required");

  // Use Claude to analyze the website
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    temperature: 0.3,
    system: "You are a business analyst. Analyze the given website URL and extract business information. Return ONLY valid JSON, no markdown.",
    messages: [
      {
        role: "user",
        content: `Analyze this business website and extract the following information. Make reasonable inferences based on the URL and domain name even if you can't access the actual page content.

Website: ${websiteUrl}
Business Name: ${organization.name}

Return ONLY valid JSON in this exact format:
{
  "industry": "one of: consulting, design, development, marketing, legal, accounting, coaching, healthcare, construction, other",
  "description": "2-3 sentence business description/elevator pitch",
  "tagline": "short catchy tagline/slogan",
  "targetAudience": "description of ideal customers",
  "targetIndustries": ["industry1", "industry2"],
  "uniqueValue": "what makes this business unique/their value proposition",
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "buyerTriggers": ["trigger 1", "trigger 2"],
  "toneOfVoice": "one of: formal, professional, friendly, casual"
}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Failed to analyze website");
  }

  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr) as {
      industry?: string;
      description?: string;
      tagline?: string;
      targetAudience?: string;
      targetIndustries?: string[];
      uniqueValue?: string;
      painPoints?: string[];
      buyerTriggers?: string[];
      toneOfVoice?: string;
    };
  } catch {
    throw new Error("Failed to parse website analysis");
  }
}

// Update business information
export async function updateBusinessInfo(data: {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
    },
  });

  revalidatePath("/settings");
}

// Update address
export async function updateAddress(data: {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data: {
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country,
    },
  });

  revalidatePath("/settings");
}

// Update legal & tax information
export async function updateLegalInfo(data: {
  legalName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  iban?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data: {
      legalName: data.legalName || null,
      registrationNumber: data.registrationNumber || null,
      vatNumber: data.vatNumber || null,
      iban: data.iban || null,
    },
  });

  revalidatePath("/settings");
}

// Update default settings
export async function updateDefaults(data: {
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTermDays: number;
  timezone: string;
  locale: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data: {
      defaultCurrency: data.defaultCurrency,
      defaultTaxRate: data.defaultTaxRate,
      defaultPaymentTermDays: data.defaultPaymentTermDays,
      timezone: data.timezone,
      locale: data.locale,
    },
  });

  revalidatePath("/settings");
}

// Update branding
export async function updateBranding(data: {
  logo?: string;
  primaryColor?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data: {
      logo: data.logo || null,
      primaryColor: data.primaryColor || null,
    },
  });

  revalidatePath("/settings");
}

// Update AI settings
export async function updateAISettings(data: {
  toneOfVoice?: string;
  industry?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data: {
      toneOfVoice: data.toneOfVoice || null,
      industry: data.industry || null,
    },
  });

  revalidatePath("/settings");
}
