/**
 * OKLCH Color Palette Generator
 *
 * Converts hex colors to OKLCH and generates a full 11-shade palette (50-950).
 * OKLCH produces perceptually uniform colors — unlike HSL, equal steps in
 * lightness look equally spaced to the human eye. Mid-tones get higher chroma
 * (saturation) while extremes are desaturated, matching how real design palettes work.
 */

// ─── Hex → RGB → Linear RGB → OKLCH pipeline ───────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/** sRGB → Linear RGB (inverse gamma) */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear RGB → OKLab (via LMS) */
function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** OKLab → OKLCH */
function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

/** Full pipeline: hex → OKLCH */
export function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [L, a, bVal] = linearRgbToOklab(lr, lg, lb);
  return oklabToOklch(L, a, bVal);
}

// ─── OKLCH → sRGB reverse pipeline (for contrast computation) ────

/** OKLCH → OKLab (polar → cartesian) */
function oklchToOklab(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

/** OKLab → Linear RGB (inverse of LMS transform) */
function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +( 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    +(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    +(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

/** WCAG relative luminance from linear RGB */
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * Math.max(0, r) + 0.7152 * Math.max(0, g) + 0.0722 * Math.max(0, b);
}

/**
 * Determine the best text color for content on a primary-colored background.
 * Computes WCAG contrast ratio of the primary-500 shade against white and dark text,
 * returns whichever provides better contrast (preferring white when equal).
 */
export function getPrimaryContrastColor(hex: string): string {
  const [, sourceChroma, hue] = hexToOklch(hex);
  const peakChroma = Math.max(sourceChroma, 0.08);

  // Primary-600 shade (lightest in gradient-primary): L=0.47, chromaScale=0.95
  const L = 0.47;
  const C = peakChroma * 0.95;
  const [labL, labA, labB] = oklchToOklab(L, C, hue);
  const [lr, lg, lb] = oklabToLinearRgb(labL, labA, labB);
  const bgLum = relativeLuminance(lr, lg, lb);

  // White text luminance = 1.0, dark text (#1a1a1a) luminance ≈ 0.0093
  const whiteLum = 1.0;
  const darkLum = 0.0093;

  const whiteContrast = (whiteLum + 0.05) / (bgLum + 0.05);
  const darkContrast = (bgLum + 0.05) / (darkLum + 0.05);

  return whiteContrast >= darkContrast ? "white" : "#1a1a1a";
}

// ─── Palette generation ─────────────────────────────────────────────

/**
 * Shade definitions: target lightness and chroma multiplier.
 * Chroma peaks at mid-tones (400-600) and drops at extremes,
 * producing vivid mid-range colors and clean lights/darks.
 */
const SHADE_CONFIG: Record<string, { L: number; chromaScale: number }> = {
  "50":  { L: 0.97, chromaScale: 0.15 },
  "100": { L: 0.93, chromaScale: 0.25 },
  "200": { L: 0.86, chromaScale: 0.45 },
  "300": { L: 0.76, chromaScale: 0.70 },
  "400": { L: 0.65, chromaScale: 0.90 },
  "500": { L: 0.55, chromaScale: 1.00 },
  "600": { L: 0.47, chromaScale: 0.95 },
  "700": { L: 0.39, chromaScale: 0.80 },
  "800": { L: 0.32, chromaScale: 0.65 },
  "900": { L: 0.25, chromaScale: 0.50 },
  "950": { L: 0.18, chromaScale: 0.35 },
};

/**
 * Generate an 11-shade OKLCH palette from a hex color.
 * Returns a map of shade → `oklch(L C H)` CSS values.
 */
export function generateOklchPalette(hex: string): Record<string, string> {
  const [, sourceChroma, hue] = hexToOklch(hex);

  // Use the source chroma as the reference maximum.
  // Clamp to a reasonable range so very desaturated inputs still produce a usable palette.
  const peakChroma = Math.max(sourceChroma, 0.08);

  const result: Record<string, string> = {};
  for (const [shade, config] of Object.entries(SHADE_CONFIG)) {
    const L = config.L;
    const C = +(peakChroma * config.chromaScale).toFixed(4);
    const H = +hue.toFixed(1);
    result[shade] = `oklch(${L} ${C} ${H})`;
  }
  return result;
}
