"use client";

import { createContext, useContext, ReactNode } from "react";

interface Site {
  id: string;
  subdomain: string;
  customDomain: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  blogEnabled: boolean;
  portalEnabled: boolean;
  bookingEnabled: boolean;
  organization: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    logo: string | null;
    locale: string;
  };
  theme: {
    template: string;
    colorMode: string;
    headerStyle: string;
    footerStyle: string;
    heroStyle: string;
    customCss: string | null;
  } | null;
  navigation: Array<{
    id: string;
    label: string;
    href: string;
    sortOrder: number;
  }>;
}

const SiteContext = createContext<Site | null>(null);

export function SiteProvider({
  site,
  children,
}: {
  site: Site;
  children: ReactNode;
}) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const site = useContext(SiteContext);
  if (!site) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return site;
}

export function useSiteOptional() {
  return useContext(SiteContext);
}
