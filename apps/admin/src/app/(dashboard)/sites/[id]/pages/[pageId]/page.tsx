import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSite, getPage } from "../../../actions";
import { PageEditor } from "./page-editor";

interface PageDetailProps {
  params: Promise<{ id: string; pageId: string }>;
}

export default async function PageDetailPage({ params }: PageDetailProps) {
  const { id: siteId, pageId } = await params;

  const [site, page] = await Promise.all([
    getSite(siteId),
    getPage(siteId, pageId),
  ]);

  if (!site || !page) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/sites/${siteId}`}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {page.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            /{page.slug || ""} • {site.name}
          </p>
        </div>
      </div>

      {/* Page Editor */}
      <PageEditor
        siteId={siteId}
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          isPublished: page.isPublished,
          content: page.content as unknown as { blocks: Array<{ id: string; type: "hero" | "text" | "features" | "services" | "testimonials" | "cta" | "contact" | "image" | "stats" | "faq" | "process" | "pricing" | "logos"; data: Record<string, unknown> }> },
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
        }}
        siteTheme={{
          primaryColor: site.primaryColor,
          secondaryColor: site.secondaryColor,
          theme: site.theme ? {
            colorMode: site.theme.colorMode,
            fontHeading: site.theme.fontHeading,
            fontBody: site.theme.fontBody,
            designTokens: site.theme.designTokens as Record<string, string> | null,
          } : null,
        }}
      />
    </div>
  );
}
