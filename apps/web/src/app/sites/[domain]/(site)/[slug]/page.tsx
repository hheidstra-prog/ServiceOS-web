import { notFound } from "next/navigation";
import { db } from "@serviceos/database";
import { PageRenderer } from "@/components/renderer/page-renderer";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

interface SitePageProps {
  params: Promise<{ domain: string; slug: string }>;
}

async function getPage(domain: string, slug: string) {
  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
    },
    select: { id: true },
  });

  if (!site) return null;

  const page = await db.page.findFirst({
    where: {
      siteId: site.id,
      slug,
      isPublished: true,
    },
  });

  return page;
}

export async function generateMetadata({ params }: SitePageProps) {
  const { domain, slug } = await params;
  const page = await getPage(domain, slug);

  if (!page) return { title: "Page Not Found" };

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
  };
}

export default async function SitePage({ params }: SitePageProps) {
  const { domain, slug } = await params;
  const page = await getPage(domain, slug);

  if (!page) {
    notFound();
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
