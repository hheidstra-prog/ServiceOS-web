# ServiceOS — "Shopify for Services"

## What We're Building

ServiceOS is an **all-in-one AI-first platform for European service providers** (Dutch ZZP'ers, freelancers, small agencies). It replaces 5-10 separate tools (Calendly, Word, Excel, Mollie, email marketing, etc.) with one platform.

**Primary competitor/inspiration:** HoneBook ($140M ARR, $2.4B valuation, US-focused). We differentiate with:
1. **AI-native** — AI is the core, not bolted on. Chat-first interface.
2. **Europe/Netherlands focus** — Mollie/iDEAL, Dutch VAT, KvK, Dutch language
3. **Website generation** — AI generates client-facing sites (unique in market)
4. **Zero learning curve** — AI handles complexity, not the user

**Core workflow:** Client → Project/Assignment → Work (Time Tracking) → Invoice

**Target users:** Dutch consultants, designers, developers, coaches, photographers, marketers. Non-technical, time-sensitive, web-first.

**Design reference files:**
- `web/docs/HoneBook screens.docx` — HoneBook UI screenshots
- `screenshots/` — Vitalize.ai design examples
- `apps/admin/DESIGN_SYSTEM.md` — Admin design system reference
- `apps/admin/docs/shopify-for-services-briefing.md` — Full product briefing (Dutch)

## Two Apps

### 1. Admin App (`apps/admin/` → http://localhost:3000)
The **main platform** where service providers manage their business. Chat-first, AI-powered.

**Completed modules:**
- **Dashboard** — Stats, revenue, bookings, activity, quick actions
- **AI Chat** — Claude-powered assistant with 13 tools (create clients, invoices, quotes, log time, etc.)
- **Clients** — List + detail with 8 tabs (Overview, Details, Contacts, Projects, Notes, Quotes, Invoices, Activity). Status pipeline: Lead → Quote Sent → Active → Invoiced → Paid
- **Projects** — With tasks, time tracking, file uploads, budget tracking
- **Quotes** — Line items, optional items, status tracking, convert to invoice
- **Invoices** — Line items, payment tracking (partial/full), record payments
- **Bookings** — Calendar + list views, booking types, location types
- **Services** — Catalog with flexible pricing (Fixed, Hourly, Daily, Monthly, Custom)
- **Time Tracking** — Weekly timesheet, billable/non-billable, time-to-invoice conversion
- **Settings** — Business info, legal/tax, defaults, branding, AI settings
- **Sites** — Website builder with AI generation
- **Onboarding** — AI-guided setup flow

**Tech:** Next.js 16, React 19, Tailwind v4, Clerk auth, Shadcn/Radix UI, Anthropic Claude API, Vercel Blob, Sonner toasts, next-themes (dark mode)

**Design system:** Catalyst-inspired, zinc-based palette. Inter + JetBrains Mono fonts. Sky/emerald/amber/rose for status colors. See `DESIGN_SYSTEM.md`.

### 2. Web App (`apps/web/` → http://localhost:3001)
**Public-facing multi-tenant sites** that service providers offer to their clients. Each provider gets a subdomain (e.g., `virtalize.localhost:3001`).

**Goal: Premium, high-class looking sites** — think HoneBook / Squarespace quality.

**Features:**
- Multi-tenant routing via subdomains (middleware.ts)
- Dynamic theming (primary/secondary colors auto-generated from hex)
- Page builder with 8 block types (hero, text, services, features, CTA, contact, testimonials, image)
- Blog system (posts, categories, tags)
- Client portal (magic link auth → dashboard, projects, invoices, bookings, files)
- Light/dark mode, custom fonts per site

**Current test site in DB:** `virtalize` (subdomain) → http://virtalize.localhost:3001

## Monorepo Structure

```
C:\code\launchminds\ServiceOS\
├── apps/
│   ├── admin/        ← Main platform (port 3000, Clerk auth)
│   └── web/          ← Public sites (port 3001, subdomain routing)
├── packages/
│   ├── database/     ← Prisma schema + client (@serviceos/database)
│   ├── ui/           ← Shared library (@serviceos/ui) — only cn() utility so far
│   ├── tailwind-config/  ← Empty
│   ├── typescript-config/ ← Shared TS configs (base, nextjs, react-library)
│   └── eslint-config/    ← Empty
├── web/              ← THIS directory: Claude Code workspace + docs
│   ├── CLAUDE.md     ← This file
│   ├── docs/         ← HoneBook screens.docx (design reference)
│   └── .claude/      ← Claude Code settings
└── screenshots/      ← Design reference screenshots
```

**Important:** The actual web app source is at `apps/web/`, NOT `web/`. The `web/` root is the Claude Code workspace.

## Tech Stack

- **Framework:** Next.js 16.1.6 with Turbopack
- **React:** 19.2.3
- **Styling:** Tailwind CSS v4 (PostCSS, `@theme` directive, CSS custom properties)
- **UI (admin):** Shadcn/Radix components (25+), Sonner toasts, next-themes
- **Icons:** lucide-react
- **Dates:** date-fns
- **Database:** PostgreSQL on Neon, Prisma ORM
- **Auth (admin):** Clerk (email/password + magic links)
- **Auth (portal):** Custom magic link sessions
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Storage:** Vercel Blob
- **Payments:** Mollie (planned), Stripe (integrated)
- **Package manager:** npm with workspaces
- **Build:** Turborepo

## Running Dev Servers

```bash
# Admin app (main platform)
cd C:\code\launchminds\ServiceOS\apps\admin
npm run dev
# → http://localhost:3000

# Web app (public sites)
cd C:\code\launchminds\ServiceOS\apps\web
npm run dev
# → http://localhost:3001 (access via http://{subdomain}.localhost:3001)

# Both at once (from root)
cd C:\code\launchminds\ServiceOS
npx turbo dev
```

## Environment Variables

**`packages/database/.env`** — Has the Neon DATABASE_URL (shared)

**`apps/admin/.env` + `.env.local`** — DATABASE_URL, Clerk keys, Stripe keys, Anthropic API key, Vercel Blob token

**`apps/web/.env.local`** — DATABASE_URL only (same Neon connection string)

## Database Schema (Key Models)

**Organization & Users:** Organization, User, OrganizationMember (roles: OWNER, ADMIN, MEMBER, BOOKKEEPER, VIEWER)

**CRM:** Client (with status pipeline), Contact, Tag, Note, Event (activity timeline)

**Projects:** Project (status, budget, hourly rate), ProjectTask (priority, due date), File (Vercel Blob)

**Financial:** Quote + QuoteItem, Invoice + InvoiceItem, Payment, Service (catalog)

**Booking:** BookingType, Availability, Booking (status, location, reminders)

**Time:** TimeEntry (billable, billed, hourly rate)

**AI:** Conversation, Message (with tool call metadata)

**Sites:** Site (subdomain, features, colors), SiteTheme (template, fonts, CSS), Navigation, Page (JSON block content)

**Blog:** BlogPost, BlogCategory, BlogTag

**Auth:** PortalSession (magic link tokens), Template (document templates)

## Web App Architecture (apps/web/)

### Multi-Tenant Routing
- `middleware.ts` parses subdomains → rewrites to `/sites/[domain]/`
- Reserved subdomains: www, app, admin, api
- Supports custom domains too

### Theme System
- `globals.css`: CSS vars + Tailwind v4 `@theme` (primary/secondary 50-950, semantic surface tokens)
- `[domain]/layout.tsx`: `generatePalette()` converts hex → HSL 11-shade palette, injected as inline CSS vars
- Color mode via `data-color-mode="light|dark"`, template via `data-template`
- Fonts: `--font-sans` (body), `--font-heading` (headings), injected per-site

### Page Builder Blocks (`src/components/blocks/`)
- `hero.tsx` — 4 variants: centered, split, minimal, background
- `text.tsx` — Rich text with alignment
- `services.tsx` — Service cards (2-4 columns)
- `features.tsx` — 3 variants: cards, list, icons
- `cta.tsx` — 3 variants: default, dark, gradient
- `contact.tsx` — Contact form + info (TODO: form submission)
- `testimonials.tsx` — Testimonial cards
- `image.tsx` — Full-width or contained

### Routes
```
/sites/[domain]/                    ← Homepage (page builder)
/sites/[domain]/[slug]              ← CMS pages
/sites/[domain]/blog                ← Blog listing
/sites/[domain]/blog/[slug]         ← Blog post
/sites/[domain]/portal/login        ← Client portal login
/sites/[domain]/portal/             ← Portal dashboard
/sites/[domain]/portal/projects     ← Client projects
/sites/[domain]/portal/invoices     ← Client invoices
/sites/[domain]/portal/bookings     ← Client bookings
/sites/[domain]/portal/files        ← Client files
```

## Admin App Architecture (apps/admin/)

### Routes
```
/sign-in, /sign-up                  ← Clerk auth
/onboarding                         ← AI-guided setup
/dashboard                          ← Stats, revenue, activity
/chat                               ← AI assistant
/clients, /clients/[id]             ← CRM (8 tabs)
/projects, /projects/[id]           ← Projects (4 tabs: overview, tasks, time, files)
/quotes, /quotes/[id]               ← Quote management
/invoices, /invoices/[id]           ← Invoice management
/bookings, /bookings/[id]           ← Scheduling
/services                           ← Service catalog
/time                               ← Weekly timesheet
/time/invoice                       ← Time-to-invoice conversion
/sites, /sites/[id]                 ← Website builder (4 tabs)
/settings                           ← Business settings
/contracts                          ← Placeholder (future)
```

### AI Chat (13 Tools)
Claude can: create/search/list clients, create/list projects, log time, get time summaries, create invoices/quotes, check unpaid invoices, list bookings, get business summary. Model: claude-sonnet-4, max 5 tool iterations, temp 0.7.

### Layout
Sidebar (10 nav items) + sticky header (search, theme toggle, user button). Responsive with mobile sheet menu.

## Design Goals

### Admin App
- Catalyst-inspired, zinc-based palette
- Clean, professional, minimal
- Tables for lists, cards for data
- Dark mode throughout

### Web App (Public Sites)
- **Premium, high-class** — HoneBook / Squarespace quality
- Clean typography (Inter default, customizable per site)
- Dynamic brand colors with zinc neutrals
- Smooth transitions and hover states
- Card-based layouts with subtle shadows
- Mobile-first responsive
- Dark mode support

## Session Continuity Rules

**CRITICAL: Always persist plans and progress to files so work survives session loss.**

1. **When creating a plan:** Save it to `web/.claude/current-plan.md` immediately. Include all steps, status (pending/in-progress/done), and context needed to resume.
2. **As you complete steps:** Update `web/.claude/current-plan.md` with progress — mark steps done, add notes on decisions made, and flag what's next.
3. **Before long operations:** Update the plan file first, so if the session dies mid-task, the next session knows exactly where to pick up.
4. **When the plan is complete:** Either delete the file or rename it to `web/.claude/completed-plans/YYYY-MM-DD-description.md` for reference.

## Known Issues / TODOs
- Contact form submission not implemented (web)
- Email sending not implemented (magic link, notifications)
- Map embed in contact block not implemented (web)
- PDF generation for quotes/invoices not implemented (admin)
- Next.js 16 middleware deprecation warning (should migrate to `proxy`)
- `@serviceos/ui` only exports `cn()` — no shared components yet
- Some admin pages pending design system review (bookings, invoices, quotes, chat, services)
- Dutch language support partially implemented (AI responds in Dutch based on locale)
