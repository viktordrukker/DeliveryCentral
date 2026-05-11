# Resource Manager — 1-page Quick Start

You own capacity. This is your weekly operating rhythm.

## Logging in

1. Visit `https://<your-org-host>/login`.
2. After login you land on the **Manager Dashboard** at `/dashboard/manager` (auto-routes to RM content based on your role).

## The four things you do every week

### 1. Watch capacity

Manager Dashboard (RM-scoped) shows:

- **Idle people** — people in your pools with no active assignment. Click to see the list.
- **Overallocated** — people > 100% allocated. Click to find conflicts.
- **Fill rate** — what % of open demand has been proposed/booked.

### 2. Propose candidates for staffing requests

1. **Staffing Desk** in the sidebar (`/staffing-desk`) → **Demand** tab.
2. Each row is a PM's request waiting for proposals.
3. Click into a request → **Add to slate** → search for candidates by skill + availability.
4. Add 1-3 candidates per slot (depending on the request's headcount). Submit slate.
5. PM receives a notification and picks the candidate. Assignment auto-creates in `PLANNED`.

### 3. Manage your pool

- **People** → filter by **Pool** → see everyone in your scope.
- Click a person → **Skills tab** to keep their skill profile current.
- Click a person → **Lifecycle tab** to deactivate or terminate (cascades to assignments).

### 4. Plan future demand

- **Distribution Studio** (flag-gated; enable via `/admin/feature-flags` → `staffingDistributionStudio` when ready) gives a multi-week heatmap with drag-to-plan capability.
- In v1 the read-only timeline view is at `/staffing-desk?view=timeline`.

## Reading the staffing flow

The **single canonical flow** (Sprint F-0.10 Decision-10):

```
PM creates Staffing Request
  → You (RM) add candidates to Slate
  → PM Picks
  → Assignment auto-created in PLANNED
  → PM/RM schedules onboarding (if applicable)
  → Date passes → ACTIVE
  → Person logs hours via /my-time
  → Assignment completes / cancels / ends
```

There is no direct "Make Assignment" path in v1 — it's all SR-driven. (The legacy direct path is still in the codebase but flag-gated OFF; enable via `staffingMakeAssignment` flag only with admin sign-off.)

## Common keyboard shortcuts

- **/** — focus filter bar on lists
- **Cmd+K** — command palette (flag-gated; enable `cmdkPeopleSearch` when ready)
- **?** — show this shortcut list

## Settings you control

`/settings/account` — see Employee quick-start.
