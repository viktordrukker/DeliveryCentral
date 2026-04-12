# Dashboard Workload API

## Purpose

This query slice exposes a stable workload summary suitable for dashboard cards and simple portal views.

It aggregates existing project, assignment, people, and work-evidence signals without mutating any domain state.

## Endpoint

### `GET /dashboard/workload/summary`

Returns:

- `totalActiveProjects`
- `totalActiveAssignments`
- `unassignedActivePeopleCount`
- `projectsWithNoStaffCount`
- `peopleWithNoActiveAssignmentsCount`
- `projectsWithEvidenceButNoApprovedAssignmentCount`
- summary lists for:
  - projects with no staff
  - people with no active assignments
  - projects with evidence but no approved assignment match

Optional query:

- `asOf`: ISO timestamp for deterministic historical-style summaries

Example:

```text
GET /dashboard/workload/summary?asOf=2025-03-15T00:00:00.000Z
```

## Notes

- This is a read-only aggregation.
- It does not change assignments, projects, people, or evidence.
- "Evidence but no approved assignment match" means work evidence exists for a project/person combination where no approved or active assignment covers that same project/person at the evidence timestamp.
