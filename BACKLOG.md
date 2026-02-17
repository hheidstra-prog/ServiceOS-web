# Backlog

## Email Infrastructure
- **Priority:** High
- **Context:** No email service is configured yet. Both the contact form and client portal magic links need it.
- **Action:** Set up an email service (e.g., Resend) and create a shared `sendEmail()` utility.
- **Blocked features:**
  - Contact form email notifications to business owner
  - Client portal magic link delivery (`apps/web/src/app/api/portal/send-magic-link/route.ts`)

## Contact Form Backend Integration
- **Priority:** High
- **Context:** The contact block (`apps/web/src/components/blocks/contact.tsx`) collects name, email, phone, subject, and message but `handleSubmit` is a stub — data is not saved.
- **Action:**
  1. Create public API route (`/api/contact/submit`) in the web app
  2. On submission: create a Client (status: `LEAD`) + Contact record linked to the site's organization
  3. Optionally log an Event for the submission
  4. Add email notification to business owner (depends on Email Infrastructure above)
- **Database models:** Client and Contact models already exist in the Prisma schema
