# Virtual Team Members — Technical Design

> Architecture and MVP plan for AI agents as first-class team members.
> Companion to: [virtual-team-members.md](virtual-team-members.md) (vision), [agent-use-cases.md](agent-use-cases.md) (use cases)

---

## Core Principle

**The chat IS the interface. The agent IS the workflow builder.**

No configuration screens. No visual workflow editor. The user talks to their AI colleague, the colleague asks the right questions, confirms the plan, and gets to work. The workflow is created behind the scenes from the conversation.

---

## UX Model

### How It Feels

The team page is your office. Human and AI colleagues sit side by side.

| Name | Type | Role | Status |
|------|------|------|--------|
| Hylke | Human | Owner | Active |
| Jan | Human | Project Manager | Active |
| Nova | Virtual | Finance & Admin | Active |
| Casey | Virtual | Sales & Leads | Paused |

Click on a colleague = walk up to their desk. Opens their chat.

- **Chat** = natural delegation. "Can you do X?" / "Here's what I need."
- **Agent asks questions** = like a real colleague clarifying the brief.
- **Agent confirms the plan** = "Here's what I'll do, sound good?" (workflow shown as confirmation, not for editing)
- **Inbox** = results, approvals, status updates — same place human-originated notifications land.
- **Activity feed** = "Nova sent a payment reminder to Acme Corp" alongside "Jan created an invoice for Acme Corp."

### Wrong-Agent Handling

If someone asks the wrong agent, it can say: "That's more Casey's thing — want me to loop her in?" No need for a dispatcher/manager agent (at least not for MVP).

### Workflow Confirmation

When an agent creates a workflow, it presents the steps in chat as a simple numbered list:

> Nova: "Got it. Here's what I'll do:
> 1. Check for overdue invoices every morning at 9:00
> 2. Draft a reminder email (friendly for 7+ days, formal for 14+, urgent for 21+)
> 3. Show you the draft for approval before sending
> 4. Send if approved, log the reminder, schedule next check
>
> Want me to start?"

The user approves with a simple "yes" or clicks an approve button. The workflow is persisted and scheduled. The user never sees a workflow editor — just the confirmation.

---

## Data Model

### New Models

```prisma
// An AI team member (alongside human OrganizationMembers)
model VirtualTeamMember {
  id               String   @id @default(cuid())
  organizationId   String
  name             String                          // "Nova"
  role             String                          // "Finance & Admin"
  description      String?                         // What this agent does
  avatarUrl        String?                         // Agent avatar
  systemPrompt     String   @db.Text               // Defines personality + expertise + available tools
  status           VirtualMemberStatus @default(ACTIVE)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  organization     Organization          @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  conversations    AgentConversation[]
  workflows        Workflow[]
  activityLogs     AgentActivityLog[]

  @@index([organizationId])
}

enum VirtualMemberStatus {
  ACTIVE
  PAUSED
}

// Chat thread between a user and a virtual team member
model AgentConversation {
  id                   String   @id @default(cuid())
  virtualTeamMemberId  String
  userId               String
  organizationId       String
  messages             Json     @default("[]")     // Array of chat messages (same shape as assistant)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  virtualTeamMember    VirtualTeamMember @relation(fields: [virtualTeamMemberId], references: [id], onDelete: Cascade)
  user                 User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([virtualTeamMemberId, userId])
  @@index([userId])
  @@index([organizationId])
}

// A workflow created by a virtual team member from a conversation
model Workflow {
  id                   String   @id @default(cuid())
  virtualTeamMemberId  String
  organizationId       String
  name                 String                      // "Payment Reminders for Overdue Invoices"
  description          String?                     // Human-readable description
  steps                Json                        // Workflow step definitions (structured)
  trigger              WorkflowTrigger             // How this workflow starts
  schedule             String?                     // Cron expression (for SCHEDULED trigger)
  config               Json     @default("{}")     // Agent-gathered configuration (days, tone, etc.)
  autonomyLevel        AutonomyLevel @default(APPROVE)
  status               WorkflowStatus @default(ACTIVE)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  virtualTeamMember    VirtualTeamMember    @relation(fields: [virtualTeamMemberId], references: [id], onDelete: Cascade)
  executions           WorkflowExecution[]

  @@index([organizationId])
  @@index([virtualTeamMemberId])
}

enum WorkflowTrigger {
  SCHEDULED       // Cron-based (daily check, weekly digest)
  EVENT           // Triggered by platform events (invoice overdue, booking created)
  MANUAL          // User says "do this now"
}

enum AutonomyLevel {
  NOTIFY          // Agent surfaces info, doesn't act
  APPROVE         // Agent drafts, user approves (default)
  AUTO            // Agent acts autonomously (opt-in per workflow)
}

enum WorkflowStatus {
  ACTIVE
  PAUSED
  COMPLETED       // One-shot workflows that finished
}

// A single run of a workflow
model WorkflowExecution {
  id             String   @id @default(cuid())
  workflowId     String
  organizationId String
  inngestRunId   String?                            // Inngest function run ID for tracking
  status         ExecutionStatus @default(RUNNING)
  steps          Json     @default("[]")            // Step results as they complete
  result         Json?                              // Final result/output
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  error          String?

  workflow       Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  approvalRequests ApprovalRequest[]

  @@index([workflowId])
  @@index([organizationId])
  @@index([inngestRunId])
}

enum ExecutionStatus {
  RUNNING
  WAITING_APPROVAL
  COMPLETED
  FAILED
  CANCELLED
}

// When an agent needs user approval before proceeding
model ApprovalRequest {
  id                   String   @id @default(cuid())
  workflowExecutionId  String
  organizationId       String
  title                String                      // "Approve payment reminder for Acme Corp?"
  description          String?  @db.Text           // AI-generated email draft, summary, etc.
  entityType           String?                     // "invoice", "email", etc.
  entityId             String?                     // Link to the entity
  status               ApprovalStatus @default(PENDING)
  respondedAt          DateTime?
  respondedBy          String?                     // userId who approved/rejected
  feedback             String?                     // Optional rejection reason
  createdAt            DateTime @default(now())

  workflowExecution    WorkflowExecution @relation(fields: [workflowExecutionId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([workflowExecutionId])
  @@index([status])
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

// What agents have done (shown in activity feeds)
model AgentActivityLog {
  id                   String   @id @default(cuid())
  virtualTeamMemberId  String
  organizationId       String
  action               String                      // "sent_payment_reminder", "drafted_email", etc.
  description          String                      // "Sent payment reminder to Acme Corp for Invoice #2024-015"
  entityType           String?                     // "invoice", "client", "email"
  entityId             String?
  metadata             Json     @default("{}")
  createdAt            DateTime @default(now())

  virtualTeamMember    VirtualTeamMember @relation(fields: [virtualTeamMemberId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([virtualTeamMemberId])
  @@index([createdAt])
}
```

### Relations on Existing Models

```prisma
// Add to Organization model:
virtualTeamMembers  VirtualTeamMember[]

// Add to User model:
agentConversations  AgentConversation[]
```

---

## Architecture

### Two Layers

```
┌─────────────────────────────────────────────────────────┐
│                   CONVERSATION LAYER                     │
│                                                         │
│  User ←→ Agent Chat (per virtual team member)           │
│  - Same streaming chat infra as AI Assistant             │
│  - Agent-specific system prompt (personality + tools)    │
│  - Agent can create/modify workflows via tool calls      │
│  - Messages persisted in AgentConversation (DB, not      │
│    sessionStorage — these are long-lived relationships)  │
│                                                         │
│  Tools: all existing 15 assistant tools                  │
│       + create_workflow                                  │
│       + list_my_workflows                                │
│       + pause_workflow / resume_workflow                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    EXECUTION LAYER                        │
│                                                         │
│  Inngest (durable workflow runtime)                      │
│  - Cron functions: daily overdue check, weekly digest    │
│  - Event functions: invoice.overdue → reminder flow      │
│  - step.sleep() for delays between reminders             │
│  - step.waitForEvent() for human approval                │
│  - step.ai.infer() for AI-generated content              │
│  - step.run() for side effects (send email, update DB)   │
│                                                         │
│  API route: /api/inngest (serve handler)                 │
│  Events fired from: server actions, cron triggers        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    APPROVAL LAYER                         │
│                                                         │
│  Approval inbox (extension of existing notification      │
│  system)                                                 │
│  - ApprovalRequest shown in inbox with Approve/Reject    │
│  - Approve → inngest.send("workflow/step.approved")      │
│  - Reject → inngest.send("workflow/step.rejected")       │
│  - Inngest function resumes via step.waitForEvent()      │
│                                                         │
│  Also: in-chat approvals (agent asks, user responds      │
│  in chat → same effect)                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Insight: Conversation Layer = Existing AI Assistant

The agent chat is a variation of the existing AI Assistant (`assistant-chat-actions.ts`). Same architecture:
- Claude model with tool definitions
- Tool-use loop (max iterations)
- System prompt with business context + locale

Differences:
- **System prompt** is agent-specific (Nova knows finance, Casey knows sales)
- **Tools** are agent-specific (Nova has payment tools, Casey has lead tools) plus shared tools
- **Persistence** is DB-backed (AgentConversation), not sessionStorage (these are long-lived relationships)
- **Extra tools**: `create_workflow`, `list_my_workflows`, `pause_workflow`

### Inngest Setup

```
apps/admin/
  src/
    inngest/
      client.ts              # Inngest client + typed event schemas
      functions/
        index.ts             # Barrel export for serve()
        payment-reminders.ts # Daily overdue check + per-invoice reminder
        // future: lead-followup.ts, booking-reminders.ts, etc.
    app/
      api/
        inngest/
          route.ts           # serve({ client, functions })
```

**Local dev**: `npx inngest-cli@latest dev -u http://localhost:3001/api/inngest` starts dashboard at `localhost:8288`.

---

## MVP: Nova — Finance & Admin Agent

### What Nova Can Do (MVP)

1. **Answer questions** about invoices, quotes, payments, revenue (using existing assistant tools)
2. **Send payment reminders** — the first real workflow:
   - User asks: "Can you remind clients about overdue invoices?"
   - Nova asks: after how many days? what tone? approval before send?
   - Nova creates a workflow, shows confirmation, user approves
   - Inngest runs daily: check overdue → draft email → request approval → send

### Nova's System Prompt (Sketch)

```
You are Nova, a virtual team member at {orgName}. You handle finance and admin tasks.

Your expertise:
- Invoicing: tracking payments, sending reminders, spotting overdue invoices
- Quotes: checking status, following up on pending quotes
- Revenue: summarizing income, outstanding amounts, trends

Your personality:
- Professional but friendly
- Proactive — suggest improvements, flag issues
- Always confirm before taking action that affects clients

When the user asks you to do something recurring:
1. Ask clarifying questions (timing, preferences, tone)
2. Present a clear numbered plan of what you'll do
3. Wait for the user's approval before activating

You have access to tools for querying and managing invoices, quotes, clients, and more.
You can also create workflows — recurring tasks that run on a schedule.

Language: respond in {locale}.
Currency: {currency}. Date format: {dateFormat}.
```

### Nova's Tools (MVP)

All 15 existing assistant tools, plus:

| Tool | Description |
|------|-------------|
| `create_workflow` | Create a recurring or event-triggered workflow. Input: name, description, steps (structured), trigger type, schedule (cron), config (agent-gathered params). Persists to Workflow model + registers with Inngest. |
| `list_my_workflows` | List workflows created by this agent for this org. Shows status, schedule, last execution. |
| `pause_workflow` | Pause a running workflow. |
| `resume_workflow` | Resume a paused workflow. |
| `get_overdue_invoices` | Get invoices past due date (enhanced version of existing `get_unpaid_invoices` with days-overdue info). |

### Payment Reminder Workflow (Inngest)

```
Trigger: SCHEDULED (cron: "0 9 * * MON-FRI" — 9am weekdays)

Step 1: [find-overdue-invoices]
  Query invoices where status IN (SENT, VIEWED) AND dueDate < today
  Filter out invoices with recent reminders (within configured interval)

Step 2: [for each overdue invoice → fan out]
  Send event "invoice/reminder.needed" per invoice

---

Per-invoice function (triggered by "invoice/reminder.needed"):

Step 1: [determine-tone]
  Check reminder count → friendly (1st), formal (2nd), urgent (3rd+)

Step 2: [draft-email]
  Use step.ai.infer() to generate personalized reminder email
  Context: invoice details, client history, tone, org locale

Step 3: [request-approval]
  Create ApprovalRequest in DB
  Create Notification in inbox ("Nova wants to send a reminder to Acme Corp")
  step.waitForEvent("workflow/step.approved", timeout: "7d")

Step 4: [on-approval]
  If approved → send email via Resend, log in AgentActivityLog
  If rejected → log rejection, respect feedback
  If timeout → log, skip (or auto-escalate if configured)

Step 5: [schedule-next]
  If still unpaid after send, schedule next check in X days
```

---

## UI Components

### 1. Team Page (Enhanced)

Current team page shows human members. Add a section (or mixed list) for virtual members:

```
┌──────────────────────────────────────────────────┐
│ Team                                    [Invite] │
│ 4 members                                        │
├──────────────────────────────────────────────────┤
│ 👤 Hylke (you)          Owner                    │
│ 👤 Jan de Vries          Member            •••   │
│ 🤖 Nova — Finance & Admin    Active        •••   │
│ 🤖 Casey — Sales & Leads     Paused        •••   │
└──────────────────────────────────────────────────┘
```

Virtual members have:
- AI badge/indicator (robot icon or "AI" tag)
- Status: Active / Paused (with toggle)
- Click → opens agent detail page (or chat directly)
- Actions: Chat, View Workflows, Pause/Resume, Configure

### 2. Agent Chat Page

`/team/agents/[agentId]` — Full-page chat with the agent.

```
┌──────────────────────────────────────────────────┐
│ ← Back to Team    Nova — Finance & Admin  Active │
├──────────────┬───────────────────────────────────┤
│              │                                   │
│  Chat        │  Context Panel (optional)         │
│  Messages    │  - Active workflows (count)       │
│              │  - Recent activity log             │
│              │  - Pending approvals               │
│              │                                   │
│              │                                   │
│              │                                   │
│              │                                   │
├──────────────┴───────────────────────────────────┤
│ [Type a message...]                       [Send] │
└──────────────────────────────────────────────────┘
```

Layout mirrors the existing AI Assistant (left chat, right context panel), but:
- Messages are DB-persisted (survive across sessions)
- Context panel shows this agent's workflows and activity
- Agent has its own personality and tool set

### 3. Approval Inbox (Enhanced Notifications)

Extend the existing `/inbox` page with an "Approvals" section or filter:

```
┌──────────────────────────────────────────────────┐
│ Inbox                    [All] [Approvals] [Read]│
├──────────────────────────────────────────────────┤
│ 🤖 Nova — Approve payment reminder               │
│    Send reminder to Acme Corp for Invoice #2024- │
│    015 (€2,400.00, 14 days overdue)              │
│    [View Draft]  [Approve ✓]  [Reject ✗]        │
│                                        2 min ago │
├──────────────────────────────────────────────────┤
│ 📅 New booking: Jan Bakker                       │
│    Intro Call (30 min) — Mar 3 at 10:00          │
│                                       1 hour ago │
├──────────────────────────────────────────────────┤
│ 🤖 Nova — Weekly invoice summary                  │
│    3 invoices overdue, 2 paid this week.         │
│    Total outstanding: €8,200.00                  │
│                                      Yesterday   │
└──────────────────────────────────────────────────┘
```

Approval requests are a special notification type with action buttons.
- Approve → fires Inngest event → workflow resumes → agent acts
- Reject → fires Inngest event → workflow skips → agent logs
- View Draft → expands the AI-generated email for review before approving

### 4. Agent Detail / Settings

Accessible from team page actions menu. Shows:
- Agent info (name, role, description, avatar)
- Active workflows with status (Active/Paused), last run, next run
- Activity log (recent actions taken)
- Settings: default autonomy level (Notify / Approve / Auto)

Not an editor — just visibility into what the agent is doing.

---

## Implementation Phases

### Phase 1: Foundation (the skeleton)

**Schema**: Add all new models (VirtualTeamMember, AgentConversation, Workflow, WorkflowExecution, ApprovalRequest, AgentActivityLog).

**Inngest setup**: Client, serve route, dev tooling.

**Seed data**: Create "Nova" as default virtual team member for each org (or on first enable).

**Team page**: Show virtual members alongside humans. Click opens chat.

**Agent chat**: Per-agent chat page at `/team/agents/[agentId]`. Same chat infra as assistant but with agent-specific system prompt and DB-persisted messages. Start with existing assistant tools only (no workflow tools yet).

**Result**: You can talk to Nova. She can answer questions about your invoices, clients, etc. No workflows yet — just chat.

### Phase 2: Workflow Engine (the brain)

**Inngest functions**: Payment reminder workflow (cron + per-invoice handler).

**Workflow tools**: `create_workflow`, `list_my_workflows`, `pause_workflow`, `resume_workflow` — Nova can now create and manage workflows from conversation.

**Approval flow**: ApprovalRequest model → shows in inbox → Approve/Reject buttons → fires Inngest event → workflow resumes.

**Activity logging**: AgentActivityLog entries for all agent actions.

**Result**: Nova can create payment reminder workflows from chat, run them on schedule, and ask for approval before sending.

### Phase 3: Polish & Expand

**More agents**: Casey (Sales & Leads) with lead follow-up workflows.

**More workflows**: Quote follow-up, booking reminders, weekly digest.

**Agent detail page**: Workflow overview, activity log, settings.

**In-chat approvals**: Approve/reject directly in chat (not just inbox).

**External integrations**: Mollie (payment status), HeyGen (personalised video).

---

## What We're NOT Building (MVP)

- Visual workflow editor (the chat IS the editor)
- Agent marketplace (preconfigured agents only)
- Custom agent creation UI (admin adds agents via settings, not self-serve)
- Multi-agent orchestration / agent-to-agent communication (future)
- Full AgentKit network routing (start with simple per-agent tool-use loop)

---

## Technical Notes

### Why Inngest (Not Cron Jobs or BullMQ)

- **Durable execution**: each step is memoized, retried independently. If step 3 fails, steps 1-2 don't re-run.
- **`step.waitForEvent`**: built-in human-in-the-loop. No polling, no manual event queues.
- **`step.sleep`**: pause for days without holding a connection or consuming compute.
- **Serverless-native**: works with Vercel/Next.js without a separate worker process.
- **Dev dashboard**: local UI at `localhost:8288` shows all events, runs, step execution.
- **Already proven**: Virtalize uses it successfully.

### Chat Persistence: DB vs SessionStorage

The existing AI Assistant uses sessionStorage (ephemeral, per-tab). Virtual team member conversations are long-lived relationships — you want to come back tomorrow and continue where you left off. So AgentConversation stores messages in the DB (JSON column).

Trade-off: slightly slower than sessionStorage, but these conversations are valuable context that shouldn't be lost.

### Agent System Prompts

Each agent's system prompt defines:
1. **Identity**: name, role, personality
2. **Expertise**: what they know about, what tools they prefer
3. **Boundaries**: what they won't do (e.g. Nova won't give sales advice)
4. **Workflow capability**: instructions for creating workflows via the `create_workflow` tool
5. **Business context**: injected at runtime (org name, locale, currency, tone of voice)

This is the main lever for differentiation between agents — same underlying model, different prompts and tool sets.
