# Assignment Lifecycle UI

## Purpose

The assignment lifecycle UI gives project managers and resource managers explicit visibility into
assignment workflow transitions without hiding or collapsing lifecycle state.

The page is centered on assignment details so approval, rejection, ending, and history stay tied
to the authoritative assignment record.

Governed assignment override is intentionally not attached to assignment details, because the
current backend override flow applies to assignment creation conflicts rather than lifecycle
mutation of an existing record.

## Route

- `/assignments/{id}`

## Data sources

The UI uses live assignment APIs:

- `GET /assignments/{id}`
- `POST /assignments/{id}/approve`
- `POST /assignments/{id}/reject`
- `POST /assignments/{id}/end`
- `POST /assignments`
- `POST /assignments/override`

## Workflow support

The details page supports:

- explicit approve action
- explicit reject action
- explicit end-assignment action
- reason capture for rejection and ending
- actor capture for workflow transitions

The end-assignment flow does not delete assignments. It preserves the record and adds a lifecycle
history entry.

## Assignment Override Support

The governed override path currently lives on the assignment creation page:

- `/assignments/new`

It is used only when a normal assignment request is blocked by an overlapping person-project
conflict.

Override behavior:

- visible warning and impact messaging
- mandatory reason capture
- confirmation before submit
- director/admin token required for the action button to appear
- success messaging makes audit capture explicit

This keeps override exceptional instead of normalizing it as part of everyday assignment detail
operations.

## Lifecycle history

The `Lifecycle History` section renders server-provided assignment history entries and keeps the
trail readable instead of hiding transitions behind the current status.

History items display:

- lifecycle change type
- occurred timestamp
- actor id when available
- reason when available
- previous/new snapshot summaries when available

This makes created, approved, rejected, and ended transitions visible in one place.

## Components

- `AssignmentWorkflowActions`
  - handles approve and reject actions
- `AssignmentEndActions`
  - handles end-assignment action with end date and reason
- `AssignmentHistoryTimeline`
  - renders the lifecycle trail from the assignment details payload
- `useAssignmentDetails`
  - loads details and revalidates after workflow actions

## Behavior

- lifecycle transitions remain explicit
- ending is confirmed before submission
- end action requires actor and end date
- history reloads after workflow actions so the page stays server-authoritative
- assignment records remain visible after ending

## Tests

Coverage lives in:

- `frontend/src/routes/assignments/AssignmentDetailsPage.test.tsx`

The tests verify:

- the lifecycle/history section renders
- approve and reject flows still work
- the end-assignment action works
- failure states remain visible
- assignment override creation flow is covered in `frontend/src/routes/assignments/CreateAssignmentPage.test.tsx`
