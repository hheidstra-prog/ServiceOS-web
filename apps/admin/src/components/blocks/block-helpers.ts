export function getBlockBackgroundProps(background?: string): {
  className: string;
  style?: React.CSSProperties;
} {
  switch (background) {
    case "muted":
      return { className: "section-padding bg-[var(--color-surface-alt)]" };
    case "accent":
      return {
        className: "section-padding bg-[var(--color-primary-900)]",
        style: {
          "--color-on-surface": "#f4f4f5",
          "--color-on-surface-secondary": "#d4d4d8",
          "--color-on-surface-muted": "#a1a1aa",
          "--color-card": "rgba(255,255,255,0.06)",
          "--card-border-color": "rgba(255,255,255,0.1)",
          "--color-card-hover": "rgba(255,255,255,0.08)",
          "--icon-container-bg": "rgba(255,255,255,0.1)",
          "--icon-container-color": "#f4f4f5",
          "--color-input-border": "rgba(255,255,255,0.2)",
          "--color-border": "rgba(255,255,255,0.1)",
          "--color-surface-alt": "rgba(255,255,255,0.05)",
          "--btn-primary-bg": "white",
          "--btn-primary-color": "var(--color-primary-700)",
          "--color-link": "rgba(255,255,255,0.85)",
          "--color-link-hover": "white",
        } as React.CSSProperties,
      };
    case "gradient":
      return {
        className: "section-padding",
        style: {
          background: "var(--gradient-accent)",
          "--color-on-surface": "#ffffff",
          "--color-on-surface-secondary": "rgba(255,255,255,0.85)",
          "--color-on-surface-muted": "rgba(255,255,255,0.65)",
          "--color-card": "rgba(255,255,255,0.1)",
          "--card-border-color": "rgba(255,255,255,0.15)",
          "--color-card-hover": "rgba(255,255,255,0.12)",
          "--icon-container-bg": "rgba(255,255,255,0.15)",
          "--icon-container-color": "#ffffff",
          "--color-input-border": "rgba(255,255,255,0.25)",
          "--color-border": "rgba(255,255,255,0.15)",
          "--color-surface-alt": "rgba(255,255,255,0.08)",
          "--btn-primary-bg": "white",
          "--btn-primary-color": "var(--color-primary-700)",
          "--color-link": "rgba(255,255,255,0.85)",
          "--color-link-hover": "white",
        } as React.CSSProperties,
      };
    default: // "default" or undefined
      return { className: "section-padding bg-[var(--color-surface)]" };
  }
}
