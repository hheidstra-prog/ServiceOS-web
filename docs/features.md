# Servible — Feature List

## CRM & Client Management

| Feature | Status |
|---|---|
| Client database with company details, address, VAT | Done |
| Pipeline status tracking (Lead → Active → Paid → Archived) | Done |
| Multiple contacts per client (with roles) | Done |
| Client tagging system | Done |
| Notes (with pinning) | Done |
| Activity timeline (events: calls, emails, meetings, documents) | Done |
| Client detail page (projects, quotes, invoices, files, activity) | Done |
| Lead capture from contact form & booking form | Done |
| Email deduplication (reuse client by email + org) | Done |
| Per-client portal access control | Roadmap |
| Admin "Send portal invite" button | Roadmap |
| Client import/export (CSV) | Vision |
| Client merge (dedup) | Vision |
| Pipeline board view (kanban) | Vision |

---

## Projects & Tasks

| Feature | Status |
|---|---|
| Project management linked to clients | Done |
| Project status tracking (Not Started → Completed) | Done |
| Budget management (monetary + hour budgets, hourly rate) | Done |
| Task lists with priorities (Low/Medium/High/Urgent) | Done |
| Task due dates and completion tracking | Done |
| Task progress bar | Done |
| File attachments per project | Done |
| Time entry association | Done |
| Portal visibility toggle | Done |
| Task assignments (to team members) | Vision |
| Task comments / discussion | Vision |
| Project templates | Vision |
| Gantt / timeline view | Vision |

---

## Booking & Scheduling

| Feature | Status |
|---|---|
| Configurable booking types (duration, pricing, color) | Done |
| Public vs portal-only booking types (`isPublic`) | Done |
| Per-day availability rules (Mon-Sun, start/end times) | Done |
| Buffer times (before/after) | Done |
| Custom intake questions per booking type | Done |
| Public booking page (`/book`) with multi-step form | Done |
| Portal booking flow (authenticated clients) | Done |
| Slot calculation (availability - existing bookings) | Done |
| Calendar view in admin | Done |
| Booking detail sheet with status actions | Done |
| Confirmation required toggle | Done |
| Location types (Online, At Provider, At Client) | Done |
| Honeypot spam protection | Done |
| Auto-creates Client + Contact + Booking + Event + Notification | Done |
| Locale-aware UI text (nl/en/de/fr) | Done |
| Google Calendar sync | Roadmap |
| MS Outlook sync | Roadmap |
| Booking reminders (email/SMS) | Vision |
| Recurring bookings | Vision |
| Group bookings | Vision |
| Waitlist | Vision |

---

## Time Tracking

| Feature | Status |
|---|---|
| Log time entries with description | Done |
| Client + project association | Done |
| Billable / non-billable split | Done |
| Per-entry hourly rate override | Done |
| Weekly view with day breakdown | Done |
| Period summaries (today, week, month) | Done |
| Convert time to invoice items | Done |
| Timer (live stopwatch) | Vision |
| Team time overview | Vision |
| Timesheet approval workflow | Vision |

---

## Quotes

| Feature | Status |
|---|---|
| Auto-numbered quotes (QUO-YYYY-NNNN) | Done |
| Line items with quantity, unit price, tax | Done |
| Optional items (client can select/deselect) | Done |
| Status lifecycle (Draft → Sent → Viewed → Accepted/Rejected/Expired) | Done |
| Public access via unique URL (access token) | Done |
| Reminder tracking | Done |
| Convert quote to contract | Done |
| Quote templates | Vision |
| E-signature on acceptance | Vision |
| Quote versioning | Vision |

---

## Contracts

| Feature | Status |
|---|---|
| Digital contracts with rich text content | Done |
| Auto-numbered (C-YYYY-NNNN) | Done |
| Status lifecycle (Draft → Sent → Viewed → Signed) | Done |
| Electronic signature capture (name, timestamp, IP) | Done |
| Public signing page via access token | Done |
| Link to originating quote | Done |
| Contract templates | Vision |
| Multi-party signing | Vision |

---

## Invoices & Payments

| Feature | Status |
|---|---|
| Auto-numbered invoices (INV-YYYY-NNNN) | Done |
| Line items with EU tax types (standard, reduced, zero, exempt, reverse charge) | Done |
| Partial payments | Done |
| Credit notes | Done |
| Status lifecycle (Draft → Sent → Viewed → Paid/Overdue) | Done |
| Public invoice view via access token | Done |
| Stripe payment integration | Done |
| Payment methods: iDEAL, card, SEPA, Bancontact, bank transfer, cash | Done |
| Overdue detection with dashboard alerts | Done |
| Reminder tracking | Done |
| Record manual payments | Done |
| Invoice PDF generation & download | Roadmap |
| Recurring invoices | Vision |
| Multi-currency support | Vision |
| Accounting export (CSV/MT940) | Vision |
| Automatic payment reminders (email) | Vision |

---

## Services Catalog

| Feature | Status |
|---|---|
| Reusable service definitions | Done |
| Flexible pricing (fixed, hourly, daily, monthly, custom) | Done |
| Tax rate per service | Done |
| Active/inactive toggle | Done |
| Used as templates in quotes & invoices | Done |
| Service packages / bundles | Vision |

---

## Website Builder (AI-Powered)

| Feature | Status |
|---|---|
| AI site generation from business description | Done |
| 14 block types (hero, features, services, testimonials, CTA, contact, FAQ, pricing, stats, process, logos, columns, text, image) | Done |
| Natural language block editing via chat | Done |
| AI-assisted block creation (describe section → auto-generated) | Done |
| Design token system (colors, typography, spacing) | Done |
| Templates (starter, agency, consultant) | Done |
| Light/dark color modes | Done |
| Custom domains + subdomains | Done |
| Navigation management | Done |
| Per-page SEO (meta title, description, OG image) | Done |
| Site publish/draft/maintenance status | Done |
| AI image search (archive + Freepik stock) | Done |
| Columns block with per-item styling | Done |
| Contact form block with spam protection | Done |
| Responsive design | Done |
| Google Analytics integration | Done |
| Multi-page support with custom slugs | Done |
| Header/footer style variants | Done |
| Custom CSS overrides | Vision |
| Form builder block | Vision |
| Blog integration block | Vision |
| A/B testing | Vision |
| Analytics dashboard (traffic, conversions) | Vision |

---

## Blog / CMS (AI-Powered)

| Feature | Status |
|---|---|
| Chat-driven blog management | Done |
| AI content generation from prompts | Done |
| Rich text editor (TipTap/Novel) | Done |
| AI title/excerpt regeneration | Done |
| AI SEO metadata generation | Done |
| Inline AI content editing with image upload | Done |
| Featured images with AI suggestions | Done |
| Category & tag taxonomy | Done |
| Multi-site publication (one post, multiple sites) | Done |
| Scheduling (publish date) | Done |
| Public blog with category filters | Done |
| Table of contents (auto-generated from headings) | Done |
| Related posts | Done |
| Booking CTA in blog sidebar | Done |
| Author selection dropdown | Roadmap |
| Blog comments | Vision |
| RSS feed | Vision |
| Newsletter integration | Vision |
| Social media auto-publish | Vision |

---

## File Management (AI-Powered)

| Feature | Status |
|---|---|
| Cloudinary-backed media library | Done |
| AI analysis on upload (image description + tags via Claude vision) | Done |
| Document text extraction & summarization (PDF, DOCX, TXT, CSV) | Done |
| Semantic search (AI query expansion) | Done |
| Chat-driven interface | Done |
| Freepik stock image integration | Done |
| File association (client, project) | Done |
| Portal visibility toggle | Done |
| Folder organization | Done |
| Media picker (Library/Upload/Stock tabs) | Done |
| File versioning | Vision |
| Bulk operations | Vision |

---

## Client Portal

| Feature | Status |
|---|---|
| Passwordless magic link login (32-byte token, 24h expiry) | Done |
| Dashboard with stat cards (projects, invoices, files, bookings) | Done |
| Projects list with task progress bars | Done |
| Project detail with tasks + files | Done |
| Invoices (pending/paid sections, full line item detail) | Done |
| Files grouped by project with download | Done |
| Bookings (upcoming cards + past table) | Done |
| Portal booking flow (all booking types incl. non-public) | Done |
| Dark/light theme toggle | Done |
| Locale-aware UI | Done |
| Portal nav with sign out | Done |
| Email delivery for magic links (currently console.log) | Roadmap |
| Per-client portal access control | Roadmap |
| Invoice PDF download | Roadmap |
| Rate limiting on magic link requests | Roadmap |
| Client-to-admin messaging (Chat) | Next Up |
| Document signing in portal | Vision |
| Payment from portal | Vision |
| Portal onboarding wizard | Vision |

---

## AI Assistant

| Feature | Status |
|---|---|
| Conversational chat powered by Claude | Done |
| Tool-use: create clients, log time, generate invoices, search data | Done |
| Business context injection (industry, audience, brand voice) | Done |
| Locale-aware responses | Done |
| Up to 5 tool-use iterations per request | Done |
| Persistent conversation history | Done |
| Suggested prompts | Done |
| Multi-entity actions in one conversation | Vision |
| Scheduled/automated AI tasks | Vision |
| Voice input | Vision |

---

## Chat / Messaging

| Feature | Status |
|---|---|
| Client-facing chat (admin ↔ client real-time messaging) | Next Up |
| Chat in client portal | Next Up |
| Chat notifications | Vision |
| File sharing in chat | Vision |
| Chat history / search | Vision |
| Chatbot (AI auto-reply for common questions) | Vision |
| WhatsApp / email channel integration | Vision |

---

## Inbox & Notifications

| Feature | Status |
|---|---|
| Internal notification center | Done |
| New booking notifications | Done |
| Contact form submission notifications | Done |
| Read/unread filtering | Done |
| Link to source entity | Done |
| Email notifications to org on form submissions | Roadmap |
| Push notifications (browser/mobile) | Vision |
| Notification preferences / mute | Vision |

---

## Organization & Settings

| Feature | Status |
|---|---|
| Multi-tenant architecture (all data scoped to org) | Done |
| Business profile (industry, audience, brand voice, pain points) | Done |
| Branding (logo, primary color) | Done |
| Legal/tax info (VAT, KvK, IBAN) | Done |
| Role-based access (Owner, Admin, Member, Bookkeeper, Viewer) | Done |
| Default currency, tax rate, payment terms | Done |
| Timezone & locale settings (nl/en/de/fr) | Done |
| Clerk auth integration | Done |
| Stripe connected accounts | Done |
| Onboarding flow | Done |
| Audit log (model exists, not fully surfaced) | Roadmap |
| Team management UI | Vision |
| White-label / custom branding | Vision |
| API access / webhooks | Vision |
| Mobile app | Vision |

---

## Legend

| Label | Meaning |
|---|---|
| **Done** | Shipped and working |
| **Roadmap** | Planned, partially built or fields exist |
| **Next Up** | Next major feature to build |
| **Vision** | Future idea, not yet started |
