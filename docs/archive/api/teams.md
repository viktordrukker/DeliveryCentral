# Teams API

## Team concept

In the current platform slice, a team is represented by an operational
`ResourcePool`.

This is intentionally separate from:

- org units
- projects

## Endpoints

### `GET /teams`

Lists operational teams.

Response includes:

- `id`
- `code`
- `name`
- `description`
- `orgUnit`
- `memberCount`

### `GET /teams/{id}`

Returns a single operational team summary.

### `GET /teams/{id}/members`

Returns current members for the team.

Optional query:

- `asOf`

Member response includes:

- `id`
- `displayName`
- `primaryEmail`
- `currentOrgUnitName`
- `currentAssignmentCount`

### `GET /teams/{id}/dashboard`

Returns a team-level operational summary.

Optional query:

- `asOf`

Dashboard response includes:

- `teamMemberCount`
- `activeAssignmentsCount`
- `projectsInvolved`
- `peopleWithNoAssignments`

## Notes

- team dashboards reuse assignment and person directory read-side semantics
- teams are not treated as projects or org units
- missing teams return `404`
