# Project Manager Dashboard API

The project manager dashboard endpoint provides a project-oriented operational view for one internal project manager. It focuses on owned projects, staffing coverage, evidence anomalies, and recent assignment changes.

## `GET /dashboard/project-manager/{personId}`

Returns at minimum:

- owned or managed projects
- staffing counts
- projects with staffing gaps
- projects with evidence anomalies
- recently changed assignments
- attention projects such as nearing closure or inactive evidence patterns

### Query parameters

- `asOf` optional ISO timestamp used to evaluate staffing, anomaly, and attention windows

### Example

```http
GET /dashboard/project-manager/11111111-1111-1111-1111-111111111006?asOf=2025-03-15T00:00:00.000Z
```

## Response shape

- `asOf`
- `person`
- `managedProjects[]`
- `staffingSummary`
- `projectsWithStaffingGaps[]`
- `projectsWithEvidenceAnomalies[]`
- `recentlyChangedAssignments[]`
- `attentionProjects[]`
- `dataSources[]`

## Design notes

- the dashboard is project-oriented, not a generic role card wrapper
- project ownership is resolved from internal `Project.projectManagerId`
- staffing counts come from internal assignments
- anomaly signals reuse the planned-vs-actual comparison read model
- work evidence remains observational and does not rewrite staffing truth
