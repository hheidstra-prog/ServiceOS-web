"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface OnboardingData {
  businessName: string;
  country: string;
  currency: string;
  website?: string;
  phone?: string;
}

export async function completeOnboarding(data: OnboardingData) {
  const user = await getCurrentUser();

  if (!user || user.memberships.length === 0) {
    throw new Error("Not authenticated");
  }

  const organizationId = user.memberships[0].organizationId;

  // Update organization with onboarding data
  await db.organization.update({
    where: { id: organizationId },
    data: {
      name: data.businessName,
      country: data.country,
      defaultCurrency: data.currency,
      website: data.website || null,
      phone: data.phone || null,
      onboardingCompletedAt: new Date(),
      // Set locale and timezone based on country
      locale: getLocaleForCountry(data.country),
      timezone: getTimezoneForCountry(data.country),
      defaultTaxRate: getTaxRateForCountry(data.country),
    },
  });

  redirect("/dashboard");
}

function getLocaleForCountry(country: string): string {
  const locales: Record<string, string> = {
    NL: "nl",
    BE: "nl",
    DE: "de",
    FR: "fr",
    GB: "en",
    US: "en",
    ES: "es",
    IT: "it",
    AT: "de",
    CH: "de",
  };
  return locales[country] || "en";
}

function getTimezoneForCountry(country: string): string {
  const timezones: Record<string, string> = {
    NL: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    GB: "Europe/London",
    US: "America/New_York",
    ES: "Europe/Madrid",
    IT: "Europe/Rome",
    AT: "Europe/Vienna",
    CH: "Europe/Zurich",
  };
  return timezones[country] || "UTC";
}

function getTaxRateForCountry(country: string): number {
  const taxRates: Record<string, number> = {
    NL: 21,
    BE: 21,
    DE: 19,
    FR: 20,
    GB: 20,
    US: 0, // Varies by state
    ES: 21,
    IT: 22,
    AT: 20,
    CH: 7.7,
  };
  return taxRates[country] ?? 21;
}
