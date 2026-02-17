# Project Instructions

## Screenshots
When the user says "see screenshot" or references a screenshot, always check the `screenshots/` folder in the project root for the latest files. Do not ask for a file path.

## Language
The application supports multiple locales (nl, en, de, fr). AI-powered features must respect the organization's locale setting. Use `getBusinessContext()` or `getOrganizationContext()` to retrieve the locale and include appropriate language instructions in AI system prompts. For static client-side messages (e.g. seed messages in chat), use hardcoded translations keyed by locale with English fallback — don't make an AI roundtrip just for translation.

## Architecture: Chat-Driven Pages

The Blog and Files pages use a **chat-driven architecture** with a consistent pattern:

### Layout
- Left panel: AI chat (380px fixed width)
- Right panel: Results grid (flexible)
- Detail panel: Sheet/drawer for item details

### Data Loading (Hybrid Approach)
Both pages use a hybrid approach for instant loading:
1. **Server page** (`page.tsx`) fetches `organization.locale` and basic counts
2. **Manager component** loads recent items on mount via direct DB action (`getRecentBlogPosts`, `getRecentFiles`) — no AI roundtrip
3. **Chat component** receives `initialResults` prop and injects a **synthetic assistant message** with locale-aware text
4. **sessionStorage** caches chat messages — subsequent visits restore instantly without any server call
5. When user interacts, real AI chat takes over (tool-use loop with Claude)

### Key Files
- Blog: `blog-manager.tsx` → `blog-chat.tsx` → `blog-chat-actions.ts` (server actions + AI tools)
- Files: `file-manager.tsx` → `file-chat.tsx` → `file-chat-actions.ts` (server actions + AI tools)
- Both chats persist to sessionStorage (`blog-chat-messages`, `file-chat-messages`)
- Both managers clear sessionStorage on "new conversation" (reset button)

### Image Optimization
Use `cloudinaryThumb(url, width, height)` from `@/lib/file-utils` for all grid/thumbnail images. This inserts Cloudinary transformation params into the URL. Use full-size URLs only in detail/preview panels. Non-Cloudinary URLs pass through unchanged.

### Hydration Safety
Radix UI Sheet/Dialog components can cause hydration mismatches with auto-generated `aria-controls` IDs. Wrap them in a `{mounted && ...}` guard (with `useState(false)` + `useEffect(() => setMounted(true), [])`) when they start closed. Never read `sessionStorage` in `useState` initializers — defer to `useEffect`.

## Blog Post Editor
- `blog-post-editor.tsx` — TipTap/Novel rich text editor
- AI features: regenerate title/excerpt (`Wand2` button), AI image suggestions for featured image, SEO metadata generation
- Slug protection: locked for published posts (prevents breaking indexed URLs), sync button derives slug from title
- Content chat: `blog-content-chat.tsx` — inline AI assistant with image upload capability
- Status managed via Publish/Unpublish buttons in toolbar (no dropdown)
- **Backlog**: add author selection dropdown (list org members/Users) — `authorId` exists on BlogPost but no UI to set it yet

## Block Editor Chat (Page Builder)
- `block-chat.tsx` — AI chat sidebar for editing blocks in natural language
- **Image search**: detects image-related messages via `isImageRequest()` (multilingual keyword matching)
  - `IMAGE_MODIFY_KEYWORDS` list prevents false positives — messages like "make image smaller" route to block edit, not image search
  - Calls `aiSearchBlockImages()` in `sites/actions.ts` — AI agent with `search_archive` + `search_stock` tools
  - Returns `ImageCandidate[]` rendered as a 2-col clickable image grid with license badges
  - Archive images: click sends follow-up to `aiChatEditBlock` which sets the URL on the correct block field
  - Stock images: click imports via `importStockImage()` (Freepik → Cloudinary), then same follow-up
  - Follow-up messages prefixed with `"Use this URL for the block:"` are hidden from chat UI but sent to AI
  - The AI decides WHERE to place the image (hero.image vs backgroundImage vs columns.items[n].image)
- **Normal chat**: all other messages go through `aiChatEditBlock()` → `chatEditBlockContent()` with tool_use loop
- Same `ImageCandidate` type as blog editor (source, fileId, stockResourceId, url, name, stockLicense)
- Key files: `sites/actions.ts` (server actions), `block-chat.tsx` (UI), `ai-site-generator.ts` (AI layer)

## AI-Assisted Block Creation
- The Add Block dialog (`page-editor.tsx`) has two tabs: **AI Assistant** (default) and **Manual**
- AI tab: textarea where user describes the section they want → calls `aiCreateBlockFromPrompt()` → AI determines block type + generates content in one call
- Manual tab: the original block type grid (14 types) for users who know what they want
- After AI generates a block, it auto-saves to the database so it's immediately visible in the preview site
- AI function chain: `createBlockFromPrompt()` in `ai-site-generator.ts` → `aiCreateBlockFromPrompt()` server action in `sites/actions.ts`
- Uses `BLOCK_TYPE_DOCS` so the AI knows all available types and their schemas

## Columns Block
- Flexible multi-column layout block for custom layouts (image + text side-by-side, multi-column cards, etc.)
- **Per-item styling props**: `imageSize` (sm/md/lg/full), `imageShape` (auto/circle/rounded), `textAlign` (left/center/right)
- **Block-level props**: `verticalAlign` (top/center/bottom) for cross-column alignment
- `text` field supports simple HTML (`<p>`, `<em>`, `<strong>`, `<blockquote>`) — rendered via `dangerouslySetInnerHTML` when HTML detected, plain text otherwise. Never include CSS class attributes.
- Component exists in both apps: `apps/admin/src/components/blocks/columns.tsx` and `apps/web/src/components/blocks/columns.tsx` (web uses `next/link`, admin uses `preview-link`)

## Dual App Architecture
- **Admin app** (`apps/admin`, port 3000) — content management
- **Web app** (`apps/web`, port 3001) — public/preview site rendering
- Both share the database but have **separate Next.js caches**
- Web app pages use `export const dynamic = "force-dynamic"` to always fetch fresh data
- Block components exist in both apps — keep them in sync when making changes
- Admin block components use `./preview-link` for links; web uses `next/link`
- Admin preview scopes CSS under `.block-preview-scope` (in `block-preview.css`); web uses global CSS (`globals.css`)

## Tailwind v4 Arbitrary Values
- When using CSS variables with `text-[]`, always add type hints to avoid ambiguity:
  - `text-[length:var(--subheading-size)]` for font-size
  - `text-[color:var(--color-primary-200)]` for color
- Without hints, Tailwind v4 can't determine if a CSS variable is a length or color, causing inconsistent output between apps

## Contact Form (Web App)
- Public contact block on sites submits to a server action, creating real DB records
- **Server action**: `apps/web/src/lib/actions/contact.ts` → `submitContactForm()`
- **Component**: `apps/web/src/components/blocks/contact.tsx` — uses `useSite()` for `organizationId`
- **Form fields**: name, email (required), phone, company, website, subject (optional), message (required)
- **DB records created on submit**:
  - **Client** (status: `LEAD`, with `companyName`) — deduplicated by `email + organizationId`
  - **Contact** (first/last name parsed from name field, linked to Client)
  - **Event** (type: `OTHER`, message as description, metadata: `{ source: "contact_form", phone, company, website, subject }`)
- Repeat submissions with the same email reuse the existing Client but always create a new Contact + Event
- Server-side validation: required fields + email regex
- **Spam protection**: honeypot field (`_hp`) — hidden input positioned off-screen, bots fill it, server silently returns success without saving. The field uses a decoy `name="company_url"` to attract bots.
- **Not yet implemented**: email notifications to the organization on new submissions
- **Backlog**: add proper rate limiting (e.g. Cloudflare Turnstile or IP-based middleware) for stronger bot protection

## Public Booking System
- Site visitors book appointments via `/book` (rendered when `bookingEnabled === true`)
- **Header integration**: "Book Now" button in `SiteHeader` links to `/book`, label is locale-aware (nl/en/de/fr)
- **Server actions**: `apps/web/src/lib/actions/booking.ts` — `getBookingConfig()`, `getAvailableSlots()`, `getAvailableDays()`, `createPublicBooking()`
- **Slot calculation**: availability rules (per day-of-week) minus existing PENDING/CONFIRMED bookings, respecting buffer times, filtering past slots for today
- **Multi-step form**: `booking-form.tsx` — select type → date → time → details → confirmation
- **DB records created on submit**:
  - **Client** (status: `LEAD`) — deduplicated by `email + organizationId` (same pattern as contact form)
  - **Contact** (first/last name parsed from name field, linked to Client)
  - **Booking** (status: PENDING or CONFIRMED based on `requiresConfirmation`)
  - **Event** (type: `APPOINTMENT`, linked to client for activity timeline)
  - **Notification** (type: `new_booking`, shows in admin inbox with Calendar icon)
- **Spam protection**: honeypot field (same pattern as contact form)
- **All UI text** uses hardcoded translations keyed by locale (nl/en/de/fr) — no AI roundtrip
- **BookingType.isPublic**: distinguishes public-facing booking types (shown on `/book`) from portal-only types
- **Admin availability**: `availability-dialog.tsx` in bookings — 7-day weekly hours grid (Mon-Sun toggle + start/end times)
- **Admin booking sheet**: clicking a calendar booking opens a Sheet info panel (not navigation), with booking details and action buttons
- **Backlog**: Google Calendar / MS Outlook sync (fields `externalCalendarId` and `externalCalendarEventId` already exist on Booking model)

## Public Blog (Web App)
- Blog listing at `/blog`, individual posts at `/blog/[slug]`
- Routes live under `apps/web/src/app/sites/[domain]/(blog)/` route group
- **Listing page** (`blog/page.tsx`): category filter pills, paginated 3-column grid, `max-w-7xl` container
- **Detail page** (`blog/[slug]/page.tsx`): two-column layout at `max-w-7xl`:
  - **Left column**: hero image → title/meta → article body
  - **Right sidebar** (320px, sticky): table of contents, author/org card, booking CTA, related posts, categories
  - Sidebar hidden on mobile (`hidden lg:block`), related posts shown as full-width grid instead
- **BlogContent** (`components/blog/blog-content.tsx`): renders TipTap JSON → JSX with explicit color classes (`text-on-surface` for headings, `text-on-surface-secondary` for body/lists) to ensure dark mode readability. Links use CSS variables (`--color-link` / `--color-link-hover`). Headings get slugified `id` attributes for TOC anchor links.
- **Blog utilities** (`components/blog/blog-utils.ts`): `extractHeadings()` extracts h1-h3 from TipTap JSON, `slugify()` generates IDs. Separate file (no `"use client"`) so it can be imported by server components.
- **Publications**: posts are linked to sites via `BlogPostPublication` (many-to-many with per-site slug)
- **Related posts**: shown in sidebar (desktop) and as full-width grid (mobile), filtered by shared categories

## Client Portal (Web App)
- Authenticated client-facing dashboard at `/portal` on public sites
- Enabled per-site via `portalEnabled` toggle in Site Settings (admin)
- **Auth flow**: passwordless magic link login
  - Client enters email at `/portal/login` → server generates 32-byte token (24h expiry) → magic link sent
  - Token stored in `PortalSession` model, cookie set as `portal_token` (httpOnly, secure, sameSite lax)
  - Every protected page validates token + org match, redirects to login if invalid
  - Sign out deletes session from DB + clears cookie
- **Portal pages** (all read-only):
  - **Dashboard** (`/portal`): stat cards (projects, invoices, files, bookings) + recent items
  - **Projects** (`/portal/projects`): list with status, task progress bar; detail view with tasks + files
  - **Invoices** (`/portal/invoices`): pending/paid sections; detail view with full line items (drafts excluded)
  - **Files** (`/portal/files`): grouped by project, download links
  - **Bookings** (`/portal/bookings`): upcoming cards + past table, "Book Appointment" link to `/book`
- **Portal context**: `usePortal()` hook provides client info + organization + site name
- **Key files**:
  - Login: `apps/web/src/app/sites/[domain]/portal/login/page.tsx`
  - Magic link API: `apps/web/src/app/api/portal/send-magic-link/route.ts`
  - Logout API: `apps/web/src/app/api/portal/logout/route.ts`
  - Dashboard layout: `apps/web/src/app/sites/[domain]/portal/(dashboard)/layout.tsx`
  - Portal nav: `apps/web/src/components/portal/portal-nav.tsx`
  - Portal context: `apps/web/src/lib/portal/portal-context.tsx`
- **Access control**: site-level only — all clients of an org can access if portal is enabled (no per-client toggle)
- **Backlog**:
  - Email delivery for magic links (currently `console.log` only — needs Resend/SendGrid integration)
  - Admin "Send portal invite" button on client detail page
  - Per-client portal access control (`portalEnabled` field on Client model)
  - Invoice PDF download (button exists, generation not implemented)
  - Rate limiting on magic link requests

## File Management
- AI-powered semantic search via `smartSearch()` in `actions.ts` (uses Claude to expand query concepts)
- File upload: `/api/media/upload` → Cloudinary storage + async AI analysis (description + tags)
- Stock images: Freepik integration via `@/lib/freepik.ts`
- Media picker: `@/components/media-picker.tsx` — Library/Upload/Stock tabs
