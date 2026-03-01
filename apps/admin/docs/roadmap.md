# Servible — Feature Roadmap

> Review and adjust priorities. Mark items with ✅ (do), ❌ (skip), or ❓ (revisit later).
> Cross-referenced with ServiceOS-Backlog.csv + Hylke's personal archive — nothing left behind.
> Last updated: 2026-02-28
>
> **Maintenance rule**: update this doc and the Claude memory backlog whenever a feature is added, completed, or changed.

---

## What's Done

Everything below is live and working.

### Core Features
- [x] Clients (CRUD, contacts, pipeline stages LEAD→PROSPECT→CLIENT→ARCHIVED, tags, activity timeline, archiving)
- [x] Projects (tasks with priority/status, time tracking, budget hours/money, portal visibility)
- [x] Services (fixed/hourly/daily/monthly pricing, tax types, active/inactive)
- [x] Quotes (line items, optional items, finalize → send w/ PDF, portal accept/reject, duplicate, validity dates, AI intro generation)
- [x] Invoices (line items, finalize → send w/ PDF, payments, portal view, time-to-invoice, credit notes, overdue tracking)
- [x] Bookings (public booking page, admin calendar, availability per day, buffer time, confirm/cancel emails, multiple location types, no-show status)
- [x] Time tracking (timer + manual entry, project/service/task linking, hourly rate derivation, billable/billed tracking)
- [x] Contact persons (multiple contacts per client, primary contact, linked to invoices/quotes/bookings)

### Sites & Content
- [x] Sites & page builder (AI block creation, block chat editing, themes, navigation, SEO meta tags)
- [x] Blog (TipTap editor, AI features, categories/tags, multi-site publishing, featured image)
- [x] Files (Cloudinary upload, AI analysis/tagging, semantic search, stock images from Freepik)
- [x] Contact form on sites (creates Lead + Contact + Event in DB, honeypot spam protection)
- [x] Booking widget on sites (public /book page with duration picker)

### Portal
- [x] Client portal (magic link auth, passwordless login)
- [x] Portal: projects with tasks + files
- [x] Portal: invoices (pending/paid, line items, PDF download)
- [x] Portal: quotes (accept/reject, line items, PDF download)
- [x] Portal: files (grouped by project)
- [x] Portal: bookings (upcoming + past, link to /book)

### AI & Automation
- [x] AI Assistant (split-panel chat, 15 tools for CRUD across all entities)
- [x] AI onboarding conversation (services, pricing, business details)
- [x] AI context-awareness (knows clients, services, history, locale)
- [x] AI quote/invoice generation via chat
- [x] AI website generation from onboarding data
- [x] AI site editing via chat ("make the header shorter", "add testimonials")
- [x] AI block creation from natural language description
- [x] AI image search (archive + stock) in block editor

### Team & Auth
- [x] Team management (team page, invite by email, role change, remove member)
- [x] Roles & permissions (OWNER/ADMIN/MEMBER/BOOKKEEPER/VIEWER — enforcement on team actions)
- [x] Invitation flow (7-day expiry, i18n email, accept page, auto-accept in webhook)
- [x] User auth via Clerk (sign up, sign in, profile, password reset, SSO via Google/Microsoft)

### Emails & PDFs
- [x] Invoice email with PDF attachment (i18n: nl/en/de/fr)
- [x] Quote email with PDF attachment (i18n)
- [x] Booking confirmation/cancellation email (i18n)
- [x] Portal magic link email (i18n)
- [x] Team invitation email (i18n)
- [x] PDF generation (@servible/pdf package — invoices + quotes, admin + portal download)

### Platform
- [x] Multi-tenant architecture (org-scoped data)
- [x] Mobile responsiveness (all admin pages)
- [x] Dark mode
- [x] BTW/VAT calculation (21%, 9%, 0%, exempt, reverse charge)
- [x] Invoice numbering (auto-sequential, configurable format)
- [x] Payment terms (configurable per org, default 14 days)
- [x] Tone of voice setting (formal/professional/friendly/casual)
- [x] Business profile (industry, description, tagline, target audience, unique value)
- [x] i18n locale per organization (nl/en/de/fr — AI output + emails respect locale)
- [x] EU hosting (Neon PostgreSQL in eu-central)
- [x] In-app notifications (org-scoped inbox with unread count)

---

## Short-Term — Quick Wins & Polish

Small features that build on what exists. Most are a few hours each.

### Team per-user features
- [ ] Time tracking: "My time" / "All time" toggle + team member filter on timesheet
- [ ] Task assignment: user picker dropdown on project tasks (field ready, needs UI)
- [ ] Blog author: author selector on blog post editor (field ready, needs UI)
- [ ] "Created by" attribution: show who created invoices/quotes/time entries in the UI

### UX polish
- [ ] Global search (Cmd+K) — spotlight search across clients, projects, invoices, quotes, bookings
- [ ] Timesheet: wire Start Timer button to StartTimerDialog
- [ ] Client detail: add Files tab (files linked via clientId, just needs the tab)
- [ ] Task drag-and-drop reordering (action exists, needs DnD UI)
- [ ] Guided tour / tooltips after onboarding (backlog CSV: Fase 2, Should)
- [ ] Onboarding flow review & polish (exists, needs UX pass — e.g. skip for invited users)

### Portal improvements
- [ ] Per-client portal access control (portalEnabled field on Client model)
- [ ] Portal quotes: let client toggle optional items before accepting
- [ ] Rate limiting on magic link requests
- [ ] Client self-service profile editing (update own contact details from portal)
- [ ] Portal: show client details (name, company, contact info) on portal dashboard
- [ ] Portal: inbox / messaging (client side of admin ↔ client chat)

### Reporting basics
- [ ] Revenue overview dashboard (monthly/yearly)
- [ ] Outstanding amounts overview (unpaid invoices summary)
- [ ] Pipeline value (total value of open quotes)
- [ ] Export to CSV/Excel (for accountant)

---

## Medium-Term — Significant Features

Bigger features that add real new capabilities. Days of work each.

### Client chat / messaging (admin ↔ client)
- [ ] Real-time messaging between admin and portal clients
- [ ] Chat UI in admin (per-client conversation)
- [ ] Chat UI in portal (client side)
- [ ] Email notification on new message
- [ ] Unread count in sidebar + portal nav

### Recurring invoices
- [ ] Schedule: weekly / monthly / quarterly / custom
- [ ] Auto-generate draft invoices from template
- [ ] Auto-send option (or draft for review)
- [ ] Retainer client support
- [ ] Deposit / partial invoicing (invoice in installments)

### Booking enhancements
- [ ] Per-member availability calendars (when team has multiple people taking appointments)
- [ ] Booking assignment (assignedToId on Booking model)
- [ ] "My bookings" / "All bookings" filter
- [ ] Send calendar invite email (.ics attachment)
- [ ] Google Calendar sync (externalCalendarId fields exist on Booking model)
- [ ] Microsoft Outlook sync
- [ ] Booking reminders (auto email X hours before appointment)
- [ ] Google Meet / Zoom auto-link on booking creation
- [ ] Paid bookings (pay on booking via payment provider)
- [ ] Recurring bookings (weekly/monthly repeat)
- [ ] Intake form on booking (custom questions per booking type — intakeQuestions JSON field exists)

### Quote enhancements
- [ ] Allow editing sent quotes (revert to DRAFT or edit in SENT status)
- [ ] Quote versioning (track revisions)
- [ ] Auto-reminder for unanswered quotes (X days after send)
- [ ] View notification (notify when client opens quote)

### Invoice enhancements
- [ ] Payment reminders (auto email after due date — escalating tone)
- [ ] View notification (notify when client opens invoice)
- [ ] Credit notes (model field exists: isCreditNote, relatedInvoiceId)

### Role enforcement (beyond team actions)
- [ ] VIEWER: read-only across all features
- [ ] BOOKKEEPER: restrict to financials (invoices, quotes, time)
- [ ] MEMBER: standard access (current default)
- [ ] UI: hide action buttons based on role

### Org switching / multi-brand
- [ ] Org picker dropdown in sidebar (infra ready: active_org cookie)
- [ ] Switch between orgs without re-login

### Invoice & quote enhancements (client-specific)
- [ ] Per-client payment terms (override org default)
- [ ] Per-client special pricing / discount rates
- [ ] Per-client custom terms & conditions on invoices/quotes

### Custom fields
- [ ] Custom fields on clients (user-defined key/value or structured fields)
- [ ] Custom fields on projects
- [ ] Custom fields on invoices / quotes
- [ ] Custom field management UI (settings page)

### Site builder enhancements
- [ ] Legal pages generator (privacy policy, terms of service, cookie policy — AI-generated from business details)
- [ ] Expanded block library (more layout options, testimonial variants, pricing tables, FAQ, team, etc.)
- [ ] Block preview thumbnails in "Add Block" dialog (so user sees how blocks look before adding)
- [ ] Request for proposal / "Ask for Quote" block (form that creates a quote request in admin)
- [ ] Live chat widget on public sites (visitor ↔ admin real-time messaging)
- [ ] Site analytics dashboard (page views, visitors, popular pages — basic stats)
- [ ] Show/hide pricing on services block (per-site toggle — some businesses don't want public pricing)

### Blogging enhancements
- [ ] Multilingual blog posts (same post in multiple languages, language switcher on public blog)
- [ ] AI image generation (generate images from prompts, not just search stock/archive)
- [ ] Publish to social media (LinkedIn, X/Twitter, Facebook — post excerpt + link)
- [ ] Knowledge docs / writing instructions (topics, structure, tone guidelines that AI uses when drafting posts)
- [ ] Freepik integration model decision: shared Servible account vs per-user Freepik accounts

### Multilingual sites
- [ ] Per-site language setting (separate from org locale)
- [ ] Multilingual site content (same site in multiple languages, language switcher)
- [ ] Language-specific SEO meta tags

### Automations
- [ ] Welcome email to new clients (on client creation / booking)
- [ ] Auto-create contract after quote acceptance
- [ ] Follow-up after project completion
- [ ] Inactivity alert ("Client X hasn't been contacted in 90 days")
- [ ] Custom automations via AI ("when a quote is accepted, schedule a kickoff")
- [ ] Personalised onboarding sequences (e.g. new client → personalised email + HeyGen video)
- [ ] Lead follow-up campaigns (multi-step email sequences)

---

## Long-Term — Platform Features

Major capabilities that transform the product.

### AI Assistant — Phase 2 tools
- [ ] `get_inactive_clients` — clients with no activity in X days
- [ ] `get_expiring_quotes` — quotes approaching validUntil
- [ ] `get_overdue_projects` — past endDate, not completed
- [ ] `get_upcoming_deadlines` — cross-entity deadlines this week
- [ ] `send_payment_reminder` — actually send reminder email
- [ ] `get_revenue_comparison` — month-over-month stats
- [ ] `get_conversion_rate` — quote acceptance rate
- [ ] `export_invoices` — CSV/PDF export
- [ ] Proactive suggestions ("You haven't spoken to Client X in 3 months")
- [ ] Daily briefing ("Good morning, here's your schedule...")
- [ ] Bulk actions via chat ("Send reminders to all clients with overdue invoices")
- [ ] AI insights ("Your revenue is up 20% compared to last quarter")
- [ ] AI quote generation from description ("Client wants X, generate a quote" — enriched version of existing tool)

### Virtual team members (AI agents)
- [ ] AI agents as first-class team members alongside humans
- [ ] Workflow engine (trigger → conditions → actions → wait/loop)
- [ ] Approval model (draft → approve → execute)
- [ ] MVP agent: payment reminders (escalating tone, user approval)
- [ ] Agent: lead follow-up sequences
- [ ] Agent: daily research briefings
- [ ] Agent: project status summaries
- [ ] Agent: time logging reminders
- [ ] Agent: invoice auto-generation
- [ ] Agent: cashflow forecasting
- [ ] Agent: lead discovery (find potential clients based on industry/criteria)
- [ ] Agent: file processing (summarize documents, extract key info)
- [ ] Agent: social media publishing (draft + schedule blog posts to socials)
- [ ] Agent: personalised outreach (HeyGen video + custom email on new client signup)

### Per-user notifications
- [ ] Per-user notification inbox (currently org-scoped)
- [ ] Notify assigned team member on booking/task/mention
- [ ] Email digest (daily/weekly summary)
- [ ] Push notifications (PWA)

### Audit log
- [ ] Populate AuditLog model on all mutations (model exists, not used yet)
- [ ] Audit log viewer page (who did what, when)

### E2E tests (Playwright)
- [ ] Auth flow (sign up, sign in, onboarding)
- [ ] Client CRUD
- [ ] Invoice flow (create → add items → finalize → send)
- [ ] Quote flow (create → finalize → send → portal accept)
- [ ] Booking flow (public booking → admin confirm)
- [ ] Portal flow (magic link → view invoices/quotes/projects)
- [ ] Team flow (invite → accept → role change → remove)

### Reporting — Advanced
- [ ] BTW/VAT report per quarter (for tax filing)
- [ ] Client lifetime value
- [ ] Cashflow forecast (expected income from outstanding invoices)
- [ ] Conversion rate (quotes → accepted)

### Integrations
- [ ] Mollie (iDEAL, creditcard, Bancontact — payment processing)
- [ ] Stripe (alternative payment provider, Stripe Connect for portal payments)
- [ ] Moneybird (accounting sync)
- [ ] Exact Online (accounting sync)
- [ ] e-Boekhouden (accounting sync)
- [ ] E-signing (digital contract signatures)
- [ ] VIES (EU VAT number validation)
- [ ] KVK API (Dutch business registry auto-fill)
- [ ] Google Meet / Zoom (auto meeting links on bookings)
- [ ] Zapier (connector to 5000+ apps)
- [ ] Make / Integromat (alternative automation connector)
- [ ] Webhook API (custom webhooks for events)
- [ ] HeyGen (AI video)

### Templates
- [ ] Template editor (customize email/quote/invoice templates)
- [ ] Branding on templates (logo, colors, fonts)
- [ ] Industry-specific templates (consultant, photographer, coach, etc.)

### Localization
- [ ] English admin interface (currently mixed — AI output respects locale, UI is English)
- [ ] Dutch admin interface (full NL translation)
- [ ] German admin interface
- [ ] French admin interface
- [ ] Belgian VAT rules
- [ ] German USt rules
- [ ] Date format per country
- [ ] Multi-currency invoicing (EUR, GBP, USD, CHF)

### Mobile
- [ ] PWA (installable via browser, offline access)
- [ ] Push notifications (booking reminders, new messages)
- [ ] Native iOS app
- [ ] Native Android app

### Platform infrastructure
- [ ] Custom domain SSL provisioning (for customer sites)
- [ ] Rate limiting (Cloudflare Turnstile or IP-based)
- [ ] GDPR compliance (data export, account deletion flow)
- [ ] Public API for developers (REST/GraphQL for 3rd party integrations, embeddable widgets)
- [ ] API key management (generate, revoke, usage tracking)
- [ ] API documentation
- [ ] Platform management UI (❓ internal admin panel for managing all tenants — up for debate)

### Marketing site (servible.ai)
- [ ] Landing page
- [ ] Pricing page
- [ ] Feature pages (for SEO)
- [ ] Blog / content marketing
- [ ] Testimonials / case studies
- [ ] Help center / docs
- [ ] Demo video
- [ ] Industry-specific pages (consultant, photographer, coach)
- [ ] Comparison pages (Servible vs HoneyBook, vs Dubsado)

### Billing (own SaaS billing)
- [ ] Subscription management (Stripe)
- [ ] Free trial (X days)
- [ ] Plan tiers (starter, pro, etc.)
- [ ] Upgrade / downgrade
- [ ] Self-service cancellation

---

## Not Planned / Removed
- Contracts feature (removed — not needed for now; e-signing could bring it back later)
- Per-user client ownership (clients stay org-scoped)
- Voice input for chat (Fase 4, low impact)
- SMS notifications (Fase 4, low impact)
- WhatsApp integration (Fase 4, depends on WhatsApp Business API)
- Waitlist for bookings (Fase 4, low impact)
- Group bookings / workshops (niche use case — revisit if demand)
- Template marketplace (Fase 4, low impact)
- Affiliate / referral program (marketing, not product)
- LinkedIn integration (low impact)
- Sandbox environment for developers (low impact)
