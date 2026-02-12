/**
 * Design Token Presets
 *
 * Reference presets for testing and as few-shot examples in AI prompts.
 * Each preset is a flat object of token overrides (keys without "--" prefix).
 * Only non-default values are included — defaults come from globals.css.
 */

export type TokenPreset = Record<string, string>;

/**
 * Premium Dark — Like Virtalize.ai
 * Glows, gradients, bold weight, dramatic spacing, dark surfaces.
 */
export const premiumDark: TokenPreset = {
  "heading-weight": "800",
  "heading-tracking": "-0.03em",
  "hero-heading-size": "clamp(3rem, 7vw, 5rem)",
  "section-heading-size": "clamp(2rem, 4vw, 2.75rem)",
  "section-padding-y": "5rem",
  "section-padding-y-lg": "7rem",
  "card-padding": "2.5rem",
  "radius-card": "1.25rem",
  "radius-button": "0.75rem",
  "card-border-width": "1px",
  "card-border-color": "rgba(255, 255, 255, 0.06)",
  "shadow-card": "0 2px 8px -2px rgb(0 0 0 / 0.3)",
  "shadow-card-hover": "0 20px 40px -10px rgb(0 0 0 / 0.4)",
  "glow-card-hover": "0 0 30px -5px var(--color-primary-500)",
  "glow-button": "0 0 20px -3px var(--color-primary-500)",
  "hero-gradient": "radial-gradient(ellipse at 50% 0%, var(--color-primary-950), var(--color-surface) 70%)",
  "gradient-primary": "linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))",
  "gradient-accent": "linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))",
  "hover-translate-y": "-4px",
  "hover-scale": "1.02",
  "transition-duration": "300ms",
  "button-font-weight": "600",
  "button-tracking": "0.025em",
  "icon-container-radius": "1rem",
  "icon-container-bg": "var(--color-primary-950)",
  "icon-container-color": "var(--color-primary-400)",
};

/**
 * Clean Minimal — Subtle borders, no shadows, light weight.
 * Think Notion, Linear, Apple.
 */
export const cleanMinimal: TokenPreset = {
  "heading-weight": "600",
  "heading-tracking": "-0.02em",
  "hero-heading-size": "clamp(2.25rem, 5vw, 3.5rem)",
  "section-heading-size": "clamp(1.5rem, 2.5vw, 2rem)",
  "section-padding-y": "3.5rem",
  "section-padding-y-lg": "5rem",
  "card-padding": "1.5rem",
  "radius-card": "0.75rem",
  "radius-button": "0.5rem",
  "card-border-width": "1px",
  "shadow-card": "none",
  "shadow-card-hover": "none",
  "glow-card-hover": "none",
  "glow-button": "none",
  "hero-gradient": "linear-gradient(to bottom, var(--color-surface-alt), var(--color-surface))",
  "gradient-primary": "none",
  "hover-translate-y": "0px",
  "hover-scale": "1.00",
  "transition-duration": "150ms",
  "button-font-weight": "500",
  "icon-container-radius": "50%",
};

/**
 * Bold Vibrant — Big shadows, scale-on-hover, uppercase buttons, gradient accents.
 * Think Stripe, Vercel.
 */
export const boldVibrant: TokenPreset = {
  "heading-weight": "900",
  "heading-tracking": "-0.035em",
  "heading-transform": "none",
  "hero-heading-size": "clamp(3rem, 8vw, 5.5rem)",
  "section-heading-size": "clamp(2rem, 4vw, 3rem)",
  "section-padding-y": "5rem",
  "section-padding-y-lg": "8rem",
  "card-padding": "2.5rem",
  "radius-card": "1.5rem",
  "radius-button": "9999px",
  "card-border-width": "0px",
  "shadow-card": "0 4px 14px -3px rgb(0 0 0 / 0.08)",
  "shadow-card-hover": "0 20px 50px -12px rgb(0 0 0 / 0.15)",
  "glow-card-hover": "0 0 40px -10px var(--color-primary-400)",
  "glow-button": "0 0 25px -5px var(--color-primary-500)",
  "gradient-primary": "linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))",
  "gradient-accent": "linear-gradient(135deg, var(--color-primary-400), var(--color-secondary-400))",
  "hover-translate-y": "-6px",
  "hover-scale": "1.03",
  "transition-duration": "350ms",
  "button-font-weight": "700",
  "button-text-transform": "uppercase",
  "button-tracking": "0.05em",
  "icon-container-size": "3rem",
  "icon-container-radius": "1rem",
};

/**
 * Classic Elegant — Small radius, subtle shadows, traditional feel.
 * Think law firms, consultants, heritage brands.
 */
export const classicElegant: TokenPreset = {
  "heading-weight": "600",
  "heading-tracking": "0em",
  "heading-line-height": "1.25",
  "hero-heading-size": "clamp(2rem, 5vw, 3.25rem)",
  "section-heading-size": "clamp(1.5rem, 2.5vw, 2rem)",
  "section-padding-y": "3.5rem",
  "section-padding-y-lg": "5rem",
  "card-padding": "1.75rem",
  "radius-card": "0.375rem",
  "radius-button": "0.25rem",
  "radius-input": "0.25rem",
  "card-border-width": "1px",
  "shadow-card": "0 1px 2px 0 rgb(0 0 0 / 0.03)",
  "shadow-card-hover": "0 4px 12px -2px rgb(0 0 0 / 0.06)",
  "glow-card-hover": "none",
  "glow-button": "none",
  "hero-gradient": "linear-gradient(to bottom, var(--color-surface), var(--color-surface))",
  "gradient-primary": "none",
  "hover-translate-y": "-1px",
  "hover-scale": "1.00",
  "transition-duration": "200ms",
  "button-font-weight": "500",
  "button-tracking": "0.02em",
  "icon-container-radius": "0.375rem",
};

/** All presets indexed by name */
export const TOKEN_PRESETS: Record<string, TokenPreset> = {
  premiumDark,
  cleanMinimal,
  boldVibrant,
  classicElegant,
};
