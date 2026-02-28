# ServicesOS — Virtual Team Members (AI Agents)

## Vision

ServicesOS includes a Team Management module where users can manage their team. This module supports two types of team members:

- **Real team members** — human colleagues with their own login, roles, and permissions
- **Virtual team members** — AI agents that autonomously perform tasks within the platform

Virtual team members appear alongside real team members in the team overview. They have a name, a role, assigned responsibilities, and a status (active/paused). The goal is to make AI agents feel like natural extensions of the team, not abstract automation tools hidden in a settings menu.

---

## Why This Works in ServicesOS

Unlike a generic automation platform, ServicesOS has full domain context. Every agent has access to:

- The CRM — who are the clients, what stage are they in (Lead, Opportunity, Active)
- Projects — what's running, what's the status, what's behind schedule
- Time tracking — where is time being spent, what's billable
- Invoicing — what's outstanding, what's overdue, what's the revenue trend
- Services — what does the user offer, at what rates, with what VAT configuration
- Communication history — what's been said to whom and when

This context is what makes the agents powerful. They don't need to be told what a lead is or where to find invoice data — it's all native to the platform.

---

## Use Cases

### Lead & Sales

- **Lead scoring** — score leads based on interactions, response time, profile completeness, and engagement
- **Automated follow-up** — send a follow-up email when a lead hasn't responded to a quote within X days
- **Personalized outreach** — generate tailored emails to re-engage inactive leads
- **Warm-up sequences** — multi-touchpoint sequences for new leads
- **Proposal research** — gather background info on a prospect before writing a quote

### Client Communication

- **Personalized emails** — context-aware emails based on project status and client history
- **Onboarding flow** — welcome sequence for new clients
- **Check-in with inactive clients** — reach out to clients with no active project for X months
- **Personalized video messages** — generate videos (via HeyGen) for project kickoffs, quarterly updates, or thank-you messages after project completion
- **Project updates** — compile and send status updates to clients

### Invoicing & Payments

- **Payment reminders** — escalating in tone (friendly → formal → urgent), respecting previous reminders sent
- **Auto-generate invoices** — create invoices based on logged hours or project completion
- **Late payment detection** — flag clients with a pattern of late payments
- **Cashflow forecasting** — predict upcoming cashflow based on open quotes, active projects, and outstanding invoices

### Project & Task Management

- **Daily/weekly summary** — what's on the agenda, what's overdue, what needs attention
- **Smart task suggestions** — suggest next steps based on project phase
- **Deadline warnings** — proactive alerts before deadlines are missed
- **Time logging reminders** — nudge the user when days have no logged hours

### Research & Intelligence

- **Daily must-read briefing** — summarized articles, news, and trends relevant to the user's field of expertise
- **Competitor monitoring** — track what competitors are publishing, new services, pricing changes, social media activity
- **Client intelligence** — news about clients (funding rounds, leadership changes, expansion) as triggers for check-ins or upsell opportunities
- **Market trends** — developments in the industries the user's clients operate in
- **Technology radar** — new tools and developments relevant to the user's services
- **Regulatory updates** — changes in legislation affecting the user or their clients (e.g. VAT rules, GDPR, KOR)
- **Benchmark data** — what are others charging for comparable services
- **Event scanning** — relevant conferences, webinars, and networking opportunities

### Content & Marketing

- **Case study generation** — auto-generate a case study after project completion
- **Social media posts** — create posts based on completed work or milestones
- **Testimonial requests** — automatically request testimonials after positive project completions

### Quality & Compliance

- **Invoice validation** — check if invoices contain all required fields
- **Missing VAT numbers** — flag foreign clients without a valid VAT identification number
- **Budget alerts** — warn when projects are going over budget
- **VAT quarter preparation** — compile VAT overview for quarterly filing

### Insights & Advice

- **Monthly business review** — revenue, trends, comparison with previous periods
- **Time allocation analysis** — "You're spending 40% of your time on client X who accounts for 15% of your revenue"
- **Conversion metrics** — lead-to-active conversion rates and average timelines
- **Revenue forecasting** — projected revenue based on pipeline and active projects

---

## Workflow Engine

Most agent tasks are not single actions but multi-step workflows. Each workflow follows the pattern:

**Trigger → Conditions → Actions → Wait/Loop → Next Step**

### Example: Payment Reminder

1. **Trigger:** Invoice is X days past due
2. **Condition:** Has a reminder already been sent?
3. **Action:** Determine tone based on reminder count (friendly → formal → urgent)
4. **Action:** Generate email
5. **Wait:** User approval (or auto-send if configured)
6. **Action:** Send email
7. **Loop:** Schedule next reminder if payment is not received

### Example: Daily Research Briefing

1. **Trigger:** Every morning at configured time
2. **Action:** Fetch sources based on user's field, competitors, client industries
3. **Action:** Filter by relevance
4. **Action:** Summarize
5. **Action:** Deliver via email, in-app notification, or dashboard

### Example: Lead Follow-Up

1. **Trigger:** Lead has not responded for X days
2. **Condition:** How many previous touchpoints?
3. **Action:** Determine strategy (follow-up, different angle, or let go)
4. **Action:** Generate personalized email
5. **Wait:** User approval
6. **Action:** Send email
7. **Action:** Update lead status

### Workflow Levels

The workflow engine supports three levels of complexity:

1. **Preconfigured workflows** — ready-to-use templates that the user can enable/disable and configure parameters (e.g. "remind after X days"). This is the starting point.
2. **Visual workflow builder** — drag & drop editor for custom workflows with conditions, actions, and branching. Future enhancement.
3. **Advanced mode** — fully programmable flows for power users. Future enhancement.

---

## Approval Model

Agents operate on a trust-based approval model:

- **Draft → Approve → Execute** — the agent prepares, the user approves. This is the default for all actions that involve external communication (emails, invoices, etc.)
- **Auto-execute** — the user can grant specific agents permission to act autonomously for trusted, low-risk tasks (e.g. sending a standard payment reminder)
- **Notify only** — the agent surfaces insights or suggestions without taking action (e.g. research briefings, budget warnings)

Users can adjust the autonomy level per agent and per workflow.

---

## Integrations

Because ServicesOS is a vertical platform for service providers, the integration stack is well-defined and finite:

### Payments & Invoicing

- Mollie (iDEAL, SEPA, credit card)
- Accounting software (Exact, Moneybird, e-Boekhouden)

### Communication

- Email (SMTP / SendGrid / Postmark)
- HeyGen (personalized AI video)
- Scheduling (Calendly or built-in)

### Research & Intelligence

- News / RSS feeds
- Web search APIs
- LinkedIn (competitor monitoring)

### Documents

- E-signing (e.g. DocuSign or lightweight alternative)
- Document generation (quotes, contracts)

### Government & Compliance

- Belastingdienst / VAT filing
- KVK data (business verification)
- VIES (EU VAT number validation)

This is a bounded set of deep integrations — not a thousand connectors a centimeter deep, but twenty integrations a meter deep.

---

## Team Management UI

The team overview shows both real and virtual team members:

| Name | Type | Role | Status |
|------|------|------|--------|
| Jan de Vries | Human | Project Manager | Active |
| Lisa Bakker | Human | Designer | Active |
| Scout | Virtual | Sales Agent | Active |
| Finn | Virtual | Research Agent | Paused |
| Nova | Virtual | Admin Agent | Active |

Each virtual team member has:

- A **name** and **avatar**
- A **role** describing their responsibility
- **Assigned workflows** — which tasks they handle
- **Autonomy level** — draft/approve/auto-execute per workflow
- **Activity log** — what they've done, what's pending approval
- **Status** — active or paused

---

## Architecture Note

The workflow engine and agent runtime powering virtual team members can be derived from the existing Virtalize.ai codebase. The key difference is that in ServicesOS, these components operate within a known domain with predefined data models, a fixed integration stack, and preconfigured workflow templates — rather than requiring the user to build everything from scratch.
