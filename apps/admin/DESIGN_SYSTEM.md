# Servible Design System

A Catalyst-inspired design system using Tailwind CSS v4 with a zinc-based color palette.

## Design Principles

1. **Clean & Professional** - Light, airy interfaces with subtle borders and shadows
2. **Consistent** - Same patterns repeated across all components
3. **Accessible** - Proper contrast ratios, focus states, and dark mode support
4. **Performant** - Tables for lists, minimal DOM complexity

---

## Color Palette

### Base Colors (Zinc)

| Usage | Light Mode | Dark Mode |
|-------|------------|-----------|
| Text primary | `text-zinc-950` | `text-white` |
| Text secondary | `text-zinc-500` | `text-zinc-400` |
| Text muted | `text-zinc-400` | `text-zinc-500` |
| Background | `bg-white` | `bg-zinc-900` |
| Background subtle | `bg-zinc-50` | `bg-zinc-800` |
| Border | `border-zinc-950/10` | `border-white/10` |
| Border hover | `border-zinc-950/20` | `border-white/20` |
| Divider | `divide-zinc-950/10` | `divide-white/10` |

### Accent Colors (Status)

| Status | Badge | Border Accent |
|--------|-------|---------------|
| Info / Primary | `bg-sky-500/10 text-sky-700` | `border-sky-300` |
| Success | `bg-emerald-500/10 text-emerald-700` | `border-emerald-300` |
| Warning | `bg-amber-500/10 text-amber-700` | `border-amber-300` |
| Error | `bg-rose-500/10 text-rose-700` | `border-rose-300` |
| Neutral | `bg-zinc-500/10 text-zinc-600` | — |
| Accent | `bg-violet-500/10 text-violet-700` | `border-violet-300` |

---

## Typography

Using **Inter** for UI and **JetBrains Mono** for code.

| Element | Classes |
|---------|---------|
| Page title (h1) | `text-2xl font-bold tracking-tight` |
| Section title (h2) | `text-lg font-semibold` |
| Card title | `text-sm font-semibold` |
| Body text | `text-sm` (14px base) |
| Small/caption | `text-xs` |
| Labels | `text-sm font-medium` |
| Table header | `text-xs font-medium uppercase tracking-wide` |

---

## Component Patterns

### Buttons

```tsx
// Primary - with hover shadow glow
"bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-md hover:shadow-zinc-900/25"

// Always include
"cursor-pointer"
```

### Inputs & Form Controls

```tsx
// Base
"border border-zinc-950/10 bg-white text-zinc-950"
"dark:border-white/10 dark:bg-zinc-950 dark:text-white"

// Focus - subtle blue tint
"focus:border-zinc-950/20 focus:bg-sky-50/50"
"dark:focus:border-white/20 dark:focus:bg-sky-950/20"

// Placeholder
"placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
```

### Cards

```tsx
// Base card
"rounded-lg border border-zinc-950/10 bg-white p-6"
"dark:border-white/10 dark:bg-zinc-900"

// With accent border (for status)
"border-sky-300 dark:border-sky-500/50"     // Primary/info
"border-emerald-300 dark:border-emerald-500/50" // Success
"border-amber-300 dark:border-amber-500/50"   // Warning/pinned
"border-rose-300 dark:border-rose-500/50"     // Error
```

### Tables

```tsx
// Container
"overflow-hidden rounded-lg border border-zinc-950/10 bg-white"

// Dividers
"divide-y divide-zinc-950/10"

// Header cells
"text-xs font-medium uppercase tracking-wide text-zinc-500"

// Row hover
"hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
```

### Badges

```tsx
// Base
"inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"

// Variants use bg-{color}-500/10 text-{color}-700 pattern
```

### Dropdowns & Popovers

```tsx
// Content
"border border-zinc-950/10 bg-white shadow-md rounded-md"
"dark:border-white/10 dark:bg-zinc-900"

// Items
"cursor-pointer text-zinc-950 dark:text-white"
"focus:bg-zinc-100 dark:focus:bg-zinc-800"
```

### Focus Rings

```tsx
// Standard focus ring
"focus-visible:ring-2 focus-visible:ring-zinc-950/20"
"dark:focus-visible:ring-white/20"
```

---

## Layout Patterns

### List Views
Use **tables** for better performance:
```tsx
<table className="min-w-full divide-y divide-zinc-950/10">
```

### Detail Views - Related Items
Use **responsive grids**:
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card />)}
</div>
```

### Forms
Use **grid layouts** for field grouping:
```tsx
<div className="grid gap-4 md:grid-cols-2">
  <Field />
  <Field />
</div>
```

---

## Feedback

### Toast Notifications (Sonner)

```tsx
import { toast } from "sonner";

// Usage
toast.success("Client updated");
toast.error("Failed to save");
toast.info("Processing...");
toast.warning("Are you sure?");
```

Toaster is configured in `layout.tsx` with `position="bottom-right"`.

---

## Files Reference

### Core Styling
- `src/app/globals.css` - CSS variables, base styles
- `src/app/layout.tsx` - Font loading (Inter, JetBrains Mono)

### UI Components
All in `src/components/ui/`:
- `button.tsx` - Buttons with hover glow
- `input.tsx`, `textarea.tsx`, `select.tsx` - Form inputs with focus tint
- `card.tsx` - Card containers
- `badge.tsx` - Status badges
- `table.tsx` - Table components
- `dialog.tsx`, `sheet.tsx` - Modals and drawers
- `dropdown-menu.tsx`, `context-menu.tsx` - Menus
- `tabs.tsx` - Tab navigation
- `checkbox.tsx`, `radio-group.tsx`, `switch.tsx` - Toggle controls
- `sonner.tsx` - Toast notifications
- ... and more

---

## Block Preview System (Page Editor)

The page editor uses a visual block preview with scoped CSS to render site blocks inside the admin app.

### Architecture
- **Direct rendering** (not iframe) — immediate state updates, native click handlers
- **Scoped CSS** — all block styles under `.block-preview-scope` in `src/components/preview/block-preview.css`
- **Theme injection** — OKLCH color palettes + design tokens as inline CSS custom properties
- **Navigation-safe** — `preview-link.tsx` wraps `<a>` tags with `e.preventDefault()`

### Key Files
- `src/components/blocks/` — 13 block renderers (copied from web app, Link swapped to preview-link)
- `src/components/preview/block-preview.css` — Scoped design tokens + utility classes
- `src/components/preview/block-preview-renderer.tsx` — Main preview component
- `src/components/preview/block-overlay.tsx` — Per-block hover/select overlay with actions
- `src/components/preview/preview-theme.ts` — Builds CSS vars from site theme data
- `src/components/preview/color-utils.ts` — OKLCH palette generation

### Block Types
`hero`, `text`, `features`, `services`, `testimonials`, `cta`, `contact`, `image`, `stats`, `faq`, `process`, `pricing`, `logos`, `columns`

### CSS Token System
Blocks use CSS custom properties (`var(--color-primary-500)`, `var(--radius-card)`, etc.) and utility classes (`.section-padding`, `.card-base`, `.btn-primary`, `.hero-heading`, etc.). All scoped under `.block-preview-scope` to prevent conflict with admin styles.

---

## Status

### Completed
- [x] All UI components updated to zinc palette
- [x] Dashboard page
- [x] Clients list (table view)
- [x] Client detail page (all tabs)
- [x] Toast notification system
- [x] Dark mode support

### Pending Review
- [ ] Bookings page
- [ ] Invoices page
- [ ] Contracts page
- [ ] Quotes page
- [ ] Chat page
- [ ] Services/Settings pages

---

## Quick Reference

```tsx
// Primary text
"text-zinc-950 dark:text-white"

// Secondary text
"text-zinc-500 dark:text-zinc-400"

// Border
"border-zinc-950/10 dark:border-white/10"

// Background
"bg-white dark:bg-zinc-900"

// Hover background
"hover:bg-zinc-50 dark:hover:bg-zinc-800/50"

// Focus input
"focus:bg-sky-50/50 focus:border-zinc-950/20"
```
