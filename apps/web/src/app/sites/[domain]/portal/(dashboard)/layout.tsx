import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@servible/database";
import { PortalProvider } from "@/lib/portal/portal-context";
import { PortalNav } from "@/components/portal/portal-nav";

interface PortalDashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

async function getPortalSession(domain: string, token: string | undefined) {
  if (!token) return null;

  // Find the site
  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: {
      id: true,
      name: true,
      logo: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          logo: true,
          locale: true,
        },
      },
    },
  });

  if (!site) return null;

  // Verify the portal token
  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: {
        organizationId: site.organizationId,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!session) return null;

  return {
    client: session.client,
    contact: session.contact,
    organization: site.organization,
    siteName: site.name,
    siteLogo: site.logo || site.organization.logo,
  };
}

export default async function PortalDashboardLayout({
  children,
  params,
}: PortalDashboardLayoutProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const portalToken = cookieStore.get("portal_token")?.value;

  const session = await getPortalSession(domain, portalToken);

  if (!session) {
    redirect(`/portal/login`);
  }

  return (
    <PortalProvider
      client={session.client}
      contact={session.contact}
      organization={session.organization}
      siteName={session.siteName}
    >
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <PortalNav
          siteName={session.siteName}
          siteLogo={session.siteLogo}
          clientName={session.contact
            ? [session.contact.firstName, session.contact.lastName].filter(Boolean).join(" ")
            : session.client.name}
        />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </PortalProvider>
  );
}
