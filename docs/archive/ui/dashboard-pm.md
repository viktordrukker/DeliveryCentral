# Project Manager Dashboard UI

## Route

- `/dashboard/project-manager`

## Purpose

This page gives project managers a project-oriented operational view over:

- managed projects
- staffing gaps
- evidence anomalies
- recent assignment changes

It uses the dedicated backend API at `GET /dashboard/project-manager/{id}` rather than reusing the generic role summary route.

## Data flow

- project manager selector source:
  - `GET /org/people`
- dashboard source:
  - `GET /dashboard/project-manager/{id}`

The route supports `?personId=` and defaults to the seeded demo project manager in local/demo environments.

## UI sections

### Projects

Shows the PM-owned project list with basic staffing and status context.

### Staffing gaps

Keeps staffing issues explicit and separate from delivery anomalies.

### Recently changed assignments

Surfaces recent assignment movement relevant to the PM’s portfolio.

### Anomalies

Reuses the anomaly presentation pattern so planned-vs-actual issues stay visibly separate from staffing summaries.

## Test coverage

- `frontend/src/routes/dashboard/ProjectManagerDashboardPage.test.tsx`
  - verifies managed projects, staffing gaps, and anomaly render paths
