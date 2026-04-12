# Assignment Approval UI

## Purpose
The assignment approval UI exposes explicit workflow actions for formal staffing. It is intentionally attached to the assignment details page so transitions remain visible, reviewable, and auditable.

## Route
- `/assignments/:id`

## Data flow
- `GET /assignments/{id}` loads the current authoritative workflow state
- `POST /assignments/{id}/approve` executes approval
- `POST /assignments/{id}/reject` executes rejection
- after a successful action, the page re-fetches assignment details so the visible state matches backend truth

## UX choices
The current implementation uses the assignment details page rather than row-level inline actions because:
- the transition is important enough to deserve explicit context
- comments and rejection reasons need space
- the UI should stay extensible for future multi-step approvals without forcing a table redesign

## Current controls
- visible approval state summary
- workflow actor input
- approval comment input
- rejection reason input
- approve button
- reject button
- confirmation before mutation
- success banner after mutation
- error banner when the backend rejects the transition

## Boundary notes
- workflow transitions are explicit and not hidden inside generic edits
- this is not a BPM engine; it is a narrow staffing workflow control surface
- visibility and approval authority are still separate concepts even though the UI exposes both review context and actions
