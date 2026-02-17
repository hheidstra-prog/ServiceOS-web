import { generateOklchPalette, getPrimaryContrastColor } from "./color-utils";

export interface SiteTheme {
  primaryColor: string | null;
  secondaryColor: string | null;
  theme: {
    colorMode: string | null;
    fontHeading: string | null;
    fontBody: string | null;
    designTokens: Record<string, string> | null;
  } | null;
}

/**
 * Build inline CSS custom properties from site theme data.
 * Mirrors the logic in apps/web/src/app/sites/[domain]/layout.tsx
 */
export function buildThemeVars(siteTheme: SiteTheme): React.CSSProperties {
  const vars: Record<string, string> = {};

  // Generate OKLCH color palettes
  if (siteTheme.primaryColor) {
    const palette = generateOklchPalette(siteTheme.primaryColor);
    for (const [shade, color] of Object.entries(palette)) {
      vars[`--color-primary-${shade}`] = color;
    }
    vars["--color-on-primary"] = getPrimaryContrastColor(siteTheme.primaryColor);
  }
  if (siteTheme.secondaryColor) {
    const palette = generateOklchPalette(siteTheme.secondaryColor);
    for (const [shade, color] of Object.entries(palette)) {
      vars[`--color-secondary-${shade}`] = color;
    }
  }

  // Design token overrides
  const designTokens = siteTheme.theme?.designTokens ?? {};
  for (const [key, value] of Object.entries(designTokens)) {
    vars[`--${key}`] = value;
  }

  // Font families
  const fontHeading = siteTheme.theme?.fontHeading;
  const fontBody = siteTheme.theme?.fontBody;
  if (fontHeading) {
    vars["--font-heading"] = `"${fontHeading}", ui-sans-serif, system-ui, sans-serif`;
  }
  if (fontBody) {
    vars["--font-sans"] = `"${fontBody}", ui-sans-serif, system-ui, sans-serif`;
  }

  return vars as unknown as React.CSSProperties;
}

/**
 * Get Google Fonts URL for custom fonts.
 */
export function getGoogleFontsUrl(siteTheme: SiteTheme): string | null {
  const googleFonts: string[] = [];
  const fontHeading = siteTheme.theme?.fontHeading;
  const fontBody = siteTheme.theme?.fontBody;

  if (fontHeading) googleFonts.push(fontHeading);
  if (fontBody && fontBody !== fontHeading) googleFonts.push(fontBody);

  if (googleFonts.length === 0) return null;

  return `https://fonts.googleapis.com/css2?${googleFonts
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
    .join("&")}&display=swap`;
}
