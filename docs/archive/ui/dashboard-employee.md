# Employee Dashboard UI

## Route

- `/dashboard/employee`

## Purpose

This page gives one employee-focused dashboard view over:

- current assignments
- future assignments
- workload summary
- recent work evidence

The route uses the dedicated backend API at `GET /dashboard/employee/{id}` and keeps the view self-oriented instead of blending in broader staffing or project-management concerns.

## Data flow

- employee selector source:
  - `GET /org/people`
- dashboard source:
  - `GET /dashboard/employee/{id}`

The UI supports `?personId=` in the route and falls back to the seeded demo employee when no selection is present so the page is immediately visible in local/demo environments.

## Components

- `WorkloadCard`
- `AssignmentList`

## Sections

### Assignments

Shows current assignments with:

- project
- staffing role
- allocation
- approval state

### Future Assignments

Shows upcoming assignment pipeline for the selected employee.

### Workload

Shows compact metrics from the backend workload summary, including:

- active assignment count
- future assignment count
- pending self workflow item count
- overallocated indicator

### Evidence

Shows recent work evidence summaries as observational data only.

## Test coverage

- `frontend/src/routes/dashboard/EmployeeDashboardPage.test.tsx`
  - verifies dashboard render with assignment, workload, and evidence data
