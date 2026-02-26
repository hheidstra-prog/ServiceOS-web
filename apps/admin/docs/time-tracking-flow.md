# ServicesOS — Time Tracking Flow

Overview of time tracking within ServicesOS. Users can track time via a live timer or manual entry, from two different entry points.

---

## Entry Points

### 1. Project Time Tab

The user is already working within a project. The project context is pre-filled.

**Use case:** Tracking time while actively working on a project or logging hours for a specific task.

### 2. Timesheet Page

A personal overview across all projects, typically displayed as a weekly grid. The user selects the project themselves.

**Use case:** Filling in hours at the end of the day or week across multiple projects in one place, spotting gaps, and getting a personal overview of time spent.

Both entry points create the same time entries and support both tracking methods (timer and manual entry).

---

## Tracking Methods

### Method 1: Timer

1. Selects a **task**
2. Selects a **service** (e.g. Project Management, Consultancy)
3. Sets **billable** toggle (default: on)
4. Clicks **Start**
5. Works...
6. Clicks **Stop**
7. Optionally adds a **note**

### Method 2: Manual Entry

1. Selects a **task**
2. Selects a **service** (e.g. Project Management, Consultancy)
3. Sets **billable** toggle (default: on)
4. Selects a **date**
5. Enters **duration** (in hours, e.g. 2.5)
6. Optionally adds a **note**
7. Clicks **Save**

> When entering from the **Timesheet page**, the user first selects a **project** before the steps above. When entering from the **Project Time tab**, the project is already known.

---

## Smart Defaults

To minimize friction, the interface should pre-fill fields where possible:

- If the project has only one service → auto-select that service
- If the selected task is linked to a service → auto-select that service
- Only show services that are linked to the current project
- Billable defaults to on — user can toggle off per entry when needed
- Date defaults to today (manual entry)

---

## Timesheet Page Features

- Weekly grid view: days as columns, projects/tasks as rows
- Quick manual entry directly in the grid
- Ability to start a timer from the grid
- Total hours per day and per week
- Spot unlogged days at a glance
- Filter by project, service, or billable status

---

## Time Entry Data Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Project | reference | Yes | The project this entry belongs to |
| Task | reference | Yes | The task being worked on |
| Service | reference | Yes | The service being delivered (determines hourly rate) |
| Billable | boolean | Yes | Whether this entry is billable (default: true) |
| Type | enum | Yes | `timer` or `manual` |
| Start time | timestamp | Timer only | When the timer was started |
| End time | timestamp | Timer only | When the timer was stopped |
| Date | date | Manual only | The date the work was performed |
| Duration | decimal | Auto / Manual | Calculated from start/end time (timer) or entered by user (manual). Stored in hours. |
| Note | text | No | Optional description of work performed |
| Created at | timestamp | Auto | When the entry was created |
| Updated at | timestamp | Auto | When the entry was last modified |

## Hourly Rate

The hourly rate is derived from the selected service. This keeps rate management centralized on the service level and ensures consistency across invoicing and reporting.
