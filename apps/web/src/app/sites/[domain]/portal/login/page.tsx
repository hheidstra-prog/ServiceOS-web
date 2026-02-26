import { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@servible/database";
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Portal Not Available
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            This site does not have a client portal enabled.
          </p>
        </div>
      </div>
    );
  }

  // Handle magic link token — redirect to API route handler which can set cookies
  if (token) {
    redirect(`/api/portal/verify-magic-link?token=${encodeURIComponent(token)}&domain=${encodeURIComponent(domain)}`);
  }

  const logo = site.logo || site.organization.logo;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{site.name}</h1>
          )}
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Client Portal</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Sign in to your portal
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email address and we&apos;ll send you a magic link to
            sign in.
          </p>

          {error === "invalid_token" && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              This link has expired or is invalid. Please request a new one.
            </div>
          )}

          <PortalLoginForm organizationId={site.organizationId} />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Powered by{" "}
          <a
            href="https://servible.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Servible
          </a>
        </p>
      </div>
    </div>
  );
}
