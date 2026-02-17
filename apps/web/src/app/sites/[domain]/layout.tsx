import { notFound } from "next/navigation";
import { db } from "@serviceos/database";
import { SiteProvider } from "@/lib/site-context";
import { generateOklchPalette, getPrimaryContrastColor } from "@/lib/color-utils";
import { isPreviewMode } from "@/lib/preview";
import { PreviewBanner } from "@/components/site/preview-banner";

interface SiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

async function getSite(domain: string) {
  const preview = await isPreviewMode(domain);

  const site = await db.site.findFirst({
    where: {
      OR: [
        { subdomain: domain },
        { customDomain: domain },
      ],
      ...(preview ? {} : { status: "PUBLISHED" }),
    },
    include: {
      organization: {
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
          logo: true,
        },
      },
      theme: true,
      navigation: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return site;
}

export async function generateMetadata({ params }: SiteLayoutProps) {
  const { domain } = await params;
  const site = await getSite(domain);

  if (!site) {
    return { title: "Site Not Found" };
  }

  return {
    title: {
      default: site.metaTitle || site.name,
      template: `%s | ${site.name}`,
    },
    description: site.metaDescription || site.description,
    openGraph: {
      title: site.metaTitle || site.name,
      description: site.metaDescription || site.description || undefined,
      images: site.ogImage ? [site.ogImage] : undefined,
    },
  };
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const { domain } = await params;
  const site = await getSite(domain);
  const preview = await isPreviewMode(domain);

  if (!site) {
    notFound();
  }

  // ─── Generate OKLCH color palettes ───
  let paletteVars = "";
  if (site.primaryColor) {
    const palette = generateOklchPalette(site.primaryColor);
    for (const [shade, color] of Object.entries(palette)) {
      paletteVars += `--color-primary-${shade}: ${color};\n      `;
    }
    paletteVars += `--color-on-primary: ${getPrimaryContrastColor(site.primaryColor)};\n      `;
  }
  if (site.secondaryColor) {
    const palette = generateOklchPalette(site.secondaryColor);
    for (const [shade, color] of Object.entries(palette)) {
      paletteVars += `--color-secondary-${shade}: ${color};\n      `;
    }
  }

  // ─── Build design token overrides ───
  const designTokens = (site.theme?.designTokens as Record<string, string> | null) ?? {};
  let tokenVars = "";
  for (const [key, value] of Object.entries(designTokens)) {
    // Keys are stored without "--" prefix, e.g. "heading-weight": "800"
    tokenVars += `--${key}: ${value};\n      `;
  }

  // ─── Font families ───
  const fontHeading = site.theme?.fontHeading;
  const fontBody = site.theme?.fontBody;
  let fontVars = "";
  if (fontHeading) {
    fontVars += `--font-heading: "${fontHeading}", ui-sans-serif, system-ui, sans-serif;\n      `;
  }
  if (fontBody) {
    fontVars += `--font-sans: "${fontBody}", ui-sans-serif, system-ui, sans-serif;\n      `;
  }

  const themeStyles = `
    :root {
      ${paletteVars}${fontVars}${tokenVars}
    }
  `;

  // ─── Google Fonts link (if custom fonts are set) ───
  const googleFonts: string[] = [];
  if (fontHeading) googleFonts.push(fontHeading);
  if (fontBody && fontBody !== fontHeading) googleFonts.push(fontBody);

  const googleFontsUrl = googleFonts.length > 0
    ? `https://fonts.googleapis.com/css2?${googleFonts
        .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
        .join("&")}&display=swap`
    : null;

  const colorMode = site.theme?.colorMode || "light";
  const template = site.theme?.template || "modern";

  return (
    <SiteProvider site={site}>
      <div data-color-mode={colorMode} data-template={template} className="min-h-screen bg-surface">
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        {googleFontsUrl && (
          <link rel="stylesheet" href={googleFontsUrl} />
        )}
        {preview && <PreviewBanner />}
        {children}
      </div>
    </SiteProvider>
  );
}
