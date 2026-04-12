# Projects API

## Scope

`/projects` exposes the internal project registry. The project remains the primary business identity even when external systems such as Jira are linked.

## Durable runtime

The live runtime now reads and writes project data through Prisma-backed persistence.

That includes:

- `Project`
- `ProjectExternalLink`
- `ExternalSyncState`
- lifecycle transitions for create, activate, and close

Project data survives process restart and is no longer sourced from seeded in-memory repositories during application runtime.

## Endpoints

### `POST /projects`

Creates a new internal project in `DRAFT`.

Request fields:

- `name`
- `description`
- `startDate`
- `plannedEndDate`
- `projectManagerId`

Rules:

- `projectManagerId` must reference an existing internal person
- external-system identifiers are not accepted here
- response includes `version`

### `POST /projects/{id}/activate`

Activates a `DRAFT` project.

Rules:

- project must exist
- project can only transition `DRAFT -> ACTIVE`
- stale concurrent lifecycle writes return `409 Conflict`

### `POST /projects/{id}/close`

Closes an `ACTIVE` project and returns a workspend summary.

Rules:

- workspend is derived from `WorkEvidence` only
- assignments remain intact for history
- active assignments block normal closure with `409 Conflict`
- project can only transition `ACTIVE -> CLOSED`
- stale concurrent lifecycle writes return `409 Conflict`

### `POST /projects/{id}/close-override`

Closes an `ACTIVE` project through an explicit override when blocking staffing
conditions still exist.

Request fields:

- `reason`
- `expectedProjectVersion` optional

Rules:

- only `director` and `admin` may use the override path
- authenticated principal identity is captured as the override actor
- `reason` is required
- the override does not bypass the core lifecycle rule that only `ACTIVE`
  projects can close
- override activity is recorded in business audit as `project.close_overridden`
- closed projects with active assignments remain visible to the exception queue
  until staffing cleanup is completed

### `POST /projects/{id}/assign-team`

Expands an eligible team roster into individual assignments.

Rules:

- project identity remains unchanged
- created assignments remain person-level records
- duplicate overlapping assignments are skipped explicitly
- team assignment is only allowed for `ACTIVE` projects
- an optional `expectedProjectVersion` can be supplied to reject stale lifecycle views with `409 Conflict`

### `GET /projects`

Returns internal projects with:

- assignment counts
- external link counts
- external link provider summaries
- `version`

Optional query:

- `source`

`source` filters by linked external provider such as `JIRA`.

### `GET /projects/{id}`

Returns project details with:

- project summary
- assignment count
- external links
- external link summary
- `version`

## Identity boundary

- `Project` is the internal truth
- `ProjectExternalLink` is secondary linkage
- Jira sync can enrich and link projects, but it does not become project truth
