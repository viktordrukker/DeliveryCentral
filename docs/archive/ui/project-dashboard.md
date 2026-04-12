# Project Dashboard UI

## Purpose

The project dashboard provides an operational project view at:

- `/projects/{id}/dashboard`

It aggregates project details, staffing, work evidence, and planned-vs-actual anomalies
without mixing anomaly signals into the normal staffing and evidence sections.
It now sits alongside the project details lifecycle controls rather than serving as the only meaningful project surface.

## Data sources

The page consumes four existing APIs:

- `GET /projects/{id}`
- `GET /assignments?projectId={id}`
- `GET /work-evidence?projectId={id}`
- `GET /dashboard/workload/planned-vs-actual?projectId={id}`

## UI sections

- Project summary
  - name
  - code
  - status
  - description
- Assigned people
  - assignment roster and allocation details
- Workload
  - planned staffing allocation summary
- Evidence summary
  - total evidence hours and recent evidence snapshot
- Comparison overview
  - matched records
  - assigned but no evidence
  - evidence but no approved match
- Anomalies
  - clearly separated from the normal project dashboard flow

## Components

- `ProjectSummaryCard`
- `AssignmentTable`
- `EvidenceSummary`
- `AnomalyPanel`

## State handling

The page covers:

- loading
- project not found
- API error
- empty assignments/evidence/comparison sections

## Tests

Coverage lives in:

- `frontend/src/routes/projects/ProjectDashboardPage.test.tsx`

The tests verify:

- aggregated project data renders
- empty project sections render clearly
- anomaly records are displayed in a distinct panel
