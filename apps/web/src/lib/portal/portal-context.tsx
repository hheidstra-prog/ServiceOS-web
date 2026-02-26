"use client";

import { createContext, useContext, ReactNode } from "react";

interface PortalClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
}

interface PortalContact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

interface PortalOrganization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  locale: string | null;
}

interface PortalContext {
  client: PortalClient;
  contact: PortalContact | null;
  organization: PortalOrganization;
  siteName: string;
}

const PortalContext = createContext<PortalContext | null>(null);

export function PortalProvider({
  client,
  contact,
  organization,
  siteName,
  children,
}: PortalContext & { children: ReactNode }) {
  return (
    <PortalContext.Provider value={{ client, contact, organization, siteName }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
}

export function usePortalOptional() {
  return useContext(PortalContext);
}
