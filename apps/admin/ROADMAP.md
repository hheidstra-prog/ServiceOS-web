# ServiceOS Roadmap

## Core Workflow
Client → Project/Assignment → Work (Time Tracking) → Invoice

---

## Completed Modules

### Clients
- Client list with status tracking
- Client detail with tabs: Overview, Details, Contacts, Projects, Notes, Quotes, Invoices, Activity
- Status-based workflow (Lead → Quote Sent → Active → Invoiced → Paid)

### Quotes
- Create quotes for clients
- Line items with services
- Optional items (client can select)
- Status tracking (Draft → Sent → Viewed → Accepted/Rejected)
- Duplicate quotes
- Convert to invoice

### Invoices
- Create invoices for clients
- Line items with services
- Payment tracking (partial/full)
- Status tracking (Draft → Sent → Paid/Overdue)
- Record payments
- Duplicate invoices

### Bookings
- Calendar and list views
- Booking types (configurable duration, price, color)
- Client or guest bookings
- Location types (Online, At Office, At Client)
- Status workflow (Pending → Confirmed → Completed/No-Show/Cancelled)

### Services
- Service catalog for quotes/invoices
- Pricing types (Fixed, Hourly, Daily, Monthly, Custom)
- Tax settings per service
- Usage tracking

### Projects (Enhanced)
- Standalone projects list (all projects across clients)
- Filter by status, client
- Create/edit/delete projects
- Link to clients
- **Project detail page** with tabs:
  - Overview (description, dates, budget, client info)
  - Tasks (add/complete/delete tasks, priority, due dates)
  - Time (view time entries, total hours, billable tracking)
- **Task management**:
  - Create tasks with title, description, priority, due date
  - Toggle completion status
  - Visual progress tracking
- **Budget tracking**:
  - Money budget (€)
  - Hours budget with progress bar
  - Hourly rate per project

### Time Tracking
- Log hours against projects/clients
- Billable vs non-billable hours
- Weekly timesheet view (7-day grid)
- Duration or time range input
- Stats: total, billable, unbilled, billed hours

### Settings
- Business information (name, email, phone, website)
- Business address
- Legal & tax info (registration number, VAT, IBAN)
- Defaults (currency, tax rate, payment terms, timezone, locale)
- Branding (primary color, logo placeholder)
- AI settings (industry, tone of voice)

### Dashboard
- Real-time stats (clients, projects, quotes, time tracked)
- Revenue this month with month-over-month comparison
- Outstanding/unpaid invoices summary
- Overdue invoices alert
- Upcoming bookings widget (next 7 days)
- Recent activity feed
- Quick actions

### AI Chat Assistant
- Conversation management (create, archive, delete)
- Real-time AI responses via Anthropic Claude API
- Organization context awareness (name, industry, tone, locale)
- Suggested prompts based on business data
- Conversation history with message persistence
- Fallback responses if API unavailable

### AI Service Library (`src/lib/ai.ts`)
- Core chat function with streaming support
- Email generation (follow-ups, reminders, confirmations)
- Quote description generation
- Time entry summarization for invoicing
- Meeting notes generation
- Client insights analysis
- **AI Tool Use** - Chat can perform actions:
  - Create/search/list clients
  - Create/list projects
  - Log time and get time summaries
  - Create invoices and quotes
  - Check unpaid invoices
  - View bookings
  - Get business summary

### Project Files
- Upload files to projects (Vercel Blob storage)
- Drag and drop upload
- File previews by type (images, documents, archives, etc.)
- Download files
- Delete files
- File metadata (size, upload date, uploader)

---

### Time to Invoice
- Select unbilled time entries by client
- Group by project, date, or individual entries
- Configure hourly rate
- Preview before creating
- Auto-mark time entries as billed

---

## Planned

(No items currently planned - all features moved to Future Considerations)

---

## Future Considerations

### Expenses
- Track business expenses
- Per-project or general
- Reimbursable expenses (add to invoice)

### Reports & Analytics
- Revenue by client/project/period
- Time utilization
- Quote conversion rate
- Outstanding payments aging

### Team Management (Multi-user)
- Team member management
- Role-based permissions
- Assign work to team members
- Team availability calendar
- Utilization reports

### Integrations
- Calendar sync (Google, Outlook)
- Accounting software (exact, moneybird)
- Payment providers (Mollie, Stripe)
- Email notifications

### Client Portal
- Clients can view their quotes/invoices
- Accept quotes online
- Pay invoices online
- Book appointments

---

## Technical Debt / Improvements
- [ ] Email notifications for quotes/invoices
- [ ] PDF generation for quotes/invoices
- [x] File attachments (implemented via Project Files)
- [ ] Audit logging
- [ ] Data export
- [x] AI-powered quote/invoice generation (implemented via AI Tool Use)
- [ ] Smart scheduling suggestions
