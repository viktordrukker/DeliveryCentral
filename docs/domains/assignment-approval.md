# Assignment Approval

## Purpose

Assignment approval is an explicit workflow action on authoritative staffing records.

The workflow is intentionally simple in this slice:

- `REQUESTED -> APPROVED`
- `REQUESTED -> REJECTED`

## Implemented actions

- `ApproveProjectAssignmentService`
- `RejectProjectAssignmentService`

## Persistence behavior

Each workflow action:

- updates the `ProjectAssignment` state
- appends an `AssignmentApproval` record with actor, timestamp, and optional comment/reason
- appends an `AssignmentHistory` record so the transition remains queryable later

## Validation

- missing assignments are rejected
- invalid transitions are blocked
- approval and rejection are explicit commands, not hidden inside generic update behavior

## Extensibility

The current model remains compatible with future multi-step approval because approval decisions are recorded as separate entries with sequence numbers instead of being flattened into a single mutable flag.
