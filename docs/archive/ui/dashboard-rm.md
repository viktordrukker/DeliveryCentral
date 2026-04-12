# Resource Manager Dashboard UI

## Route

- `/dashboard/resource-manager`

## Purpose

This page provides a capacity-oriented dashboard for resource managers, focused on:

- team capacity
- idle resources
- future assignment pipeline
- allocation indicators

It uses the dedicated backend endpoint `GET /dashboard/resource-manager/{id}` instead of relying on the generic role-summary dashboard.

## Data flow

- resource manager selector source:
  - `GET /org/people`
- dashboard source:
  - `GET /dashboard/resource-manager/{id}`

The route supports `?personId=` and defaults to the seeded demo resource manager in local/demo environments.

## UI sections

### Capacity

Shows team-level capacity summaries including member counts, active assignments, and active project involvement.

### Idle Resources

Surfaces managed people with no active assignment coverage.

### Pipeline

Shows future assignments that are queued for managed resources.

### Allocation Indicators

Shows actionable allocation states such as:

- `UNASSIGNED`
- `UNDERALLOCATED`
- `FULLY_ALLOCATED`
- `OVERALLOCATED`

## Test coverage

- `frontend/src/routes/dashboard/ResourceManagerDashboardPage.test.tsx`
  - verifies capacity, idle-resource, pipeline, and allocation-indicator rendering
