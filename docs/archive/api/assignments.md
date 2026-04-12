# Assignments API

## Endpoint

### `POST /assignments`

Creates a formal internal project assignment.

### `POST /assignments/bulk`

Creates multiple formal internal project assignments in one request using an
explicit partial-success result model.

Request body:

- `actorId`
- `entries[]`
  - `projectId`
  - `personId`
  - `staffingRole`
  - `allocationPercent`
  - `startDate`
  - `endDate` optional
  - `note` optional

Response:

- `strategy = PARTIAL_SUCCESS`
- `totalCount`
- `createdCount`
- `failedCount`
- `createdItems[]`
  - `index`
  - `assignment`
- `failedItems[]`
  - `index`
  - `personId`
  - `projectId`
  - `staffingRole`
  - `code`
  - `message`

## Request fields

- `projectId`
- `personId`
- `staffingRole`
- `allocationPercent`
- `startDate`
- `endDate` optional
- `actorId`
- `note` optional

### `POST /projects/{id}/assign-team`

Expands a team into individual project assignments for the target project.

Request body:

- `teamOrgUnitId`
- `staffingRole`
- `allocationPercent`
- `startDate`
- `endDate` optional
- `actorId`
- `note` optional

Response:

- `projectId`
- `teamOrgUnitId`
- `teamName`
- `createdCount`
- `skippedDuplicateCount`
- `createdAssignments[]` with per-person `assignmentId`, `personId`, and `personName`
- `skippedDuplicates[]` with per-person duplicate reasons

Current team source model:

- this slice expands the active primary members of the referenced org unit
- each created assignment remains an individual `ProjectAssignment`
- duplicate overlapping person-to-project assignments are skipped and reported, not collapsed into a single bulk record

## Response

Returns the created assignment summary including:

- internal assignment id
- project id
- person id
- staffing role
- allocation percent
- start/end dates
- explicit initial status
- `version`

### `POST /assignments/{id}/approve`

Approves a requested assignment.

Request body:

- `actorId`
- `comment` optional

### `POST /assignments/{id}/reject`

Rejects a requested assignment.

Request body:

- `actorId`
- `reason` optional
- `comment` optional

### `POST /assignments/{id}/end`

Ends an approved or active assignment without deleting it.

Request body:

- `actorId`
- `endDate`
- `reason` optional

### `POST /assignments/override`

Creates an assignment through an explicit governance override for selected
staffing conflicts.

Current supported override case:

- overlapping assignment for the same person and project

Request body:

- `projectId`
- `personId`
- `staffingRole`
- `allocationPercent`
- `startDate`
- `endDate` optional
- `note` optional
- `reason`

Rules:

- only `director` and `admin` may use the override path
- authenticated principal identity is captured as the override actor
- `reason` is required
- the override does not bypass other validation rules
- the override records explicit assignment history and business audit

### `GET /assignments/{id}`

Returns assignment details including lifecycle visibility fields used by the details UI.

Detail response includes:

- assignment summary fields
- `version`
- `canApprove`
- `canReject`
- `canEnd`
- `history[]`
  - `changeType`
  - `changeReason` optional
  - `changedByPersonId` optional
  - `occurredAt`
  - `previousSnapshot` optional
  - `newSnapshot` optional

## Rules

- assignment is person-to-project, not person-to-issue
- project must be an internal `Project`
- live assignment runtime is persisted through Prisma-backed storage
- assignment approvals and history are stored separately from the current assignment row
- Jira evidence cannot create assignment
- bulk assignment reuses the same per-item domain validation as single assignment creation
- bulk assignment uses explicit partial success instead of all-or-nothing rollback
- invalid bulk items are reported clearly and do not disappear behind a generic batch failure
- team assignment is an expansion convenience, not a separate assignment type
- team expansion must preserve individual assignment traceability for each person created
- clear validation failures should reject invalid requests rather than silently accepting them
- approval and rejection are explicit workflow actions
- ending an assignment is an explicit lifecycle action and preserves the assignment record plus history
- ended assignments cannot be ended again
- end date must be consistent with the assignment start date and current planned end date
- lifecycle mutations use optimistic concurrency control and return `409 Conflict` if a stale concurrent write is detected
- explicit override exists only for selected assignment exceptions and requires a reason plus elevated authority

## Durability note

Assignment create, approve, reject, end, list, and get flows now run against durable database-backed persistence in the live application runtime. Assignment lifecycle state survives application restart.
