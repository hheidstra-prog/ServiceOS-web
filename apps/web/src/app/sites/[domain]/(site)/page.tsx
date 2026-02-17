import { notFound } from "next/navigation";
import { db } from "@serviceos/database";
import { PageRenderer } from "@/components/renderer/page-renderer";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { isPreviewMode } from "@/lib/preview";

export const dynamic = "force-dynamic";

interface SiteHomeProps {
  params: Promise<{ domain: string }>;
}

async function getHomepage(domain: string) {
  const preview = await isPreviewMode(domain);

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      ...(preview ? {} : { status: "PUBLISHED" }),
    },
    select: { id: true },
  });

  if (!site) return null;

  const page = await db.page.findFirst({
    where: {
      siteId: site.id,
      isHomepage: true,
      ...(preview ? {} : { isPublished: true }),
    },
  });

  return page;
}

export default async function SiteHomePage({ params }: SiteHomeProps) {
  const { domain } = await params;
  const page = await getHomepage(domain);

  if (!page) {
    // Return a default homepage if none is configured
    return (
      <>
        <SiteHeader />
        <main className="min-h-screen">
          <section className="flex min-h-[60vh] items-center justify-center bg-hero-gradient">
            <div className="text-center px-4">
              <h1 className="text-4xl font-bold tracking-tight text-on-surface sm:text-5xl">
                Welcome
              </h1>
              <p className="mt-4 text-lg text-on-surface-secondary">
                This site is being set up. Check back soon!
              </p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main>
        <PageRenderer content={page.content as Record<string, unknown>} />
      </main>
      <SiteFooter />
    </>
  );
}
