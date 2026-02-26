# ServicesOS — Task Data Model

Overview of fields stored per task within a project (ProjectTask model).

---

## Core Fields

| Field | Type | Required | Description | Status |
|-------|------|----------|-------------|--------|
| Title | string | Yes | Short description of the task | Implemented |
| Description | text | No | Detailed explanation or context | Implemented |
| Status | enum | Yes | `TODO`, `IN_PROGRESS`, `DONE` | Implemented |
| Due date | date | No | Task deadline | Implemented |
| Priority | enum | No | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | Implemented |

## Relations

| Field | Type | Required | Description | Status |
|-------|------|----------|-------------|--------|
| Project | reference | Yes | The project this task belongs to | Implemented |
| Assigned to | reference (User) | No | User responsible for the task | DB ready, UI pending |

## Time Tracking

| Field | Type | Required | Description | Status |
|-------|------|----------|-------------|--------|
| Estimated hours | decimal(6,2) | No | Estimated time to complete | Implemented |
| Logged hours | — | No | Via TimeEntry linked to project (not task-level yet) | Future |

## Meta

| Field | Type | Required | Description | Status |
|-------|------|----------|-------------|--------|
| Created at | timestamp | Auto | When the task was created | Implemented |
| Updated at | timestamp | Auto | When the task was last modified | Implemented |
| Sort order | integer | Auto | Manual ordering within a project | Implemented |

## Notes

- **Status migration**: `completed` boolean was replaced with `TaskStatus` enum (Feb 2026)
- **assignedToId**: Field and User relation exist in schema, waiting for multi-user UI (user picker dropdown)
- **Time tracking**: TimeEntry model links to projects; linking to individual tasks is a future enhancement
