import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@serviceos/database";
import { PortalLoginForm } from "@/components/portal/login-form";

interface PortalLoginPageProps {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ token?: string; error?: string }>;
}

async function getSite(domain: string) {
  return db.site.findFirst({
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
          name: true,
          logo: true,
        },
      },
    },
  });
}

async function verifyMagicLink(token: string, organizationId: string) {
  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: {
        organizationId,
      },
    },
  });

  return session;
}

export async function generateMetadata({
  params,
}: PortalLoginPageProps): Promise<Metadata> {
  const { domain } = await params;
  const site = await getSite(domain);

  if (!site) {
    return { title: "Portal Not Available" };
  }

  return {
    title: `Client Portal - ${site.name}`,
    description: `Sign in to access your client portal for ${site.name}`,
  };
}

export default async function PortalLoginPage({
  params,
  searchParams,
}: PortalLoginPageProps) {
  const { domain } = await params;
  const { token, error } = await searchParams;

  const site = await getSite(domain);

  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">
            Portal Not Available
          </h1>
          <p className="mt-2 text-zinc-600">
            This site does not have a client portal enabled.
          </p>
        </div>
      </div>
    );
  }

  // Handle magic link token
  if (token) {
    const session = await verifyMagicLink(token, site.organizationId);

    if (session) {
      // Set the cookie and redirect to portal
      const cookieStore = await cookies();
      cookieStore.set("portal_token", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: session.expiresAt,
        path: "/portal",
      });

      redirect("/portal");
    }

    // Invalid or expired token
    redirect("/portal/login?error=invalid_token");
  }

  const logo = site.logo || site.organization.logo;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          {logo ? (
            <img
              src={logo}
              alt={site.name}
              className="mx-auto h-12 w-auto"
            />
          ) : (
            <h1 className="text-2xl font-bold text-zinc-900">{site.name}</h1>
          )}
          <p className="mt-2 text-sm text-zinc-600">Client Portal</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Sign in to your portal
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Enter your email address and we&apos;ll send you a magic link to
            sign in.
          </p>

          {error === "invalid_token" && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              This link has expired or is invalid. Please request a new one.
            </div>
          )}

          <PortalLoginForm organizationId={site.organizationId} />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-zinc-500">
          Powered by{" "}
          <a
            href="https://serviceos.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700"
          >
            ServiceOS
          </a>
        </p>
      </div>
    </div>
  );
}
