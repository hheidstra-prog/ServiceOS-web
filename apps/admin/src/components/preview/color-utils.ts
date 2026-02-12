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
