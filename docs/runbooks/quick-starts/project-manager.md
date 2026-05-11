# Project Manager — 1-page Quick Start

This is your weekly operating rhythm.

## Logging in

1. Visit `https://<your-org-host>/login`.
2. After login you land on the **Manager Dashboard** at `/dashboard/manager` (the v1 merged surface; auto-routes to PM content based on your role).

## The five things you do every week

### 1. Plan staffing for your projects (10 min)

1. Open the **Manager Dashboard** → look at "Staffing Gaps".
2. For each gap, click **Create Staffing Request** (the only path in v1; no more "Make Assignment" direct button).
3. Fill: project + role + skill match + start date + headcount + priority.
4. RM/admin sees the request immediately and proposes candidates via the **Slate** flow.
5. You receive a notification when proposals are ready.

### 2. Pick from a proposal slate (5 min per slate)

1. Open the request from your notifications inbox (bell icon).
2. Review the slate of N candidates (skill match + availability + cost).
3. Click **Pick** on the right candidate. An assignment auto-creates in `PLANNED`.

### 3. Approve timesheets (10 min, weekly)

1. **Time Management** in the sidebar → **Approval Queue** tab.
2. Each row is a submitted week from one of your team members. Hover for the per-day breakdown.
3. **Approve** or **Reject (with reason)**. Rejected weeks go back to the employee for revision.

### 4. Activate a new project (5 min, once per project)

1. Project Detail page → **Lifecycle** tab → **Activate**.
2. Confirm. The project moves DRAFT → ACTIVE. Audit log captures the event (Sprint F-0.3 closure).
3. Staffing slate flow is now available for this project.

### 5. Close a project (15 min, once per project)

1. Project Detail → **Lifecycle** → **Close project**.
2. The Closure Readiness panel shows budget variance + open assignments + open cases.
3. If all green, click **Close**. Status moves ACTIVE → CLOSED.
4. The closure-override path is available if there are blockers and you have director authorization.

## Reading your dashboards

- **Manager Dashboard** (`/dashboard/manager`) — staffing gaps, your portfolio status, pending approvals.
- **Project Detail** (`/projects/:id`) — full project view (Overview / Team / Time / Budget / Lifecycle tabs).
- **Planned vs Actual** (`/dashboard/planned-vs-actual`) — variance between planned hours and approved time.

## Common workflow

```
Project DRAFT
  → Activate (Lifecycle tab)
  → ACTIVE
  → Create Staffing Request (per role gap)
  → RM proposes Slate
  → You Pick candidate
  → Assignment PLANNED
  → Start date passes → ACTIVE
  → Team logs hours via /my-time
  → You approve weekly in /time-management
  → Project complete → Close project
  → CLOSED
```

## Settings you control

`/settings/account` — see Employee quick-start.
