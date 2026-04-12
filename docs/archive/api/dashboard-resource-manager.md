# Resource Manager Dashboard API

The resource manager dashboard endpoint provides a capacity-oriented operational view for one internal resource manager. It keeps the output focused on teams, availability, assignment pipeline, and actionable staffing signals rather than project ownership.

## `GET /dashboard/resource-manager/{personId}`

Returns at minimum:

- resource pool or team capacity summary
- people without assignments
- over or under allocation indicators
- future assignment pipeline
- teams involved in multiple active projects
- pending assignment approvals relevant to the managed resource view

### Query parameters

- `asOf` optional ISO timestamp used to evaluate current allocations and future pipeline

### Example

```http
GET /dashboard/resource-manager/11111111-1111-1111-1111-111111111003?asOf=2025-03-15T00:00:00.000Z
```

## Response shape

- `asOf`
- `person`
- `summary`
- `teamCapacitySummary[]`
- `peopleWithoutAssignments[]`
- `allocationIndicators[]`
- `futureAssignmentPipeline[]`
- `teamsInMultipleActiveProjects[]`
- `pendingAssignmentApprovals[]`
- `dataSources[]`

## Design notes

- this dashboard is distinct from the project manager dashboard
- team stewardship is resolved through the org unit attached to each resource pool
- capacity indicators are derived from active internal assignments:
  - `UNASSIGNED`
  - `UNDERALLOCATED`
  - `FULLY_ALLOCATED`
  - `OVERALLOCATED`
- empty pending-approval or future-pipeline lists are returned explicitly when no such items exist
