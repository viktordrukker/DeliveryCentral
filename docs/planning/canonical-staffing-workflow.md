# Canonical Staffing Workflow

Authoritative reference for the 9-status lifecycle that governs
`ProjectAssignment` records in DeliveryCentral.

## Statuses

| Status | Intent | Setters |
|---|---|---|
| `CREATED` | Slot opened, no candidate yet | PM, DM, Admin, Director |
| `PROPOSED` | A candidate is named on the slot | RM, DM |
| `REJECTED` (terminal) | Candidate rejected with reason | PM, DM, Director |
| `BOOKED` | Workload validated, details locked | PM, DM, Director |
| `ONBOARDING` | Confirmed but not yet started | PM, DM, Director |
| `ASSIGNED` | Person actively working | PM, DM, Director |
| `ON_HOLD` | Work paused (incident / case / escalation) | PM, RM, HR, Director |
| `COMPLETED` (terminal) | Natural end of the allocated work | PM, DM, Director |
| `CANCELLED` (terminal) | Withdrawn before completion | PM, DM, Director, RM |

Admin role can perform every transition for break-glass scenarios.

## State machine

```
            ┌────────── Cancelled (terminal) ──────────┐
            │                                          │
 (new) ─► Created ─► Proposed ─► Rejected (terminal)
                        │
                        └─► Booked ─► Onboarding ─► Assigned ─► Completed (terminal)
                                        │  ▲           │  ▲
                                        │  └─► On-hold ┘  │
                                        └──────────────►──┘

Cancelled is reachable from every non-terminal state.
```

## Reason requirements

These transitions require a non-empty `reason`:

- any → `REJECTED`
- any → `CANCELLED`
- `ONBOARDING | ASSIGNED` → `ON_HOLD`

## Single source of truth

The state machine, role matrix, and reason requirements live in
[src/modules/assignments/domain/value-objects/assignment-status.ts](../../src/modules/assignments/domain/value-objects/assignment-status.ts)
as the `ASSIGNMENT_STATUS_TRANSITIONS` table.

Both the domain entity (`ProjectAssignment.transitionTo()`) and the
application-layer `TransitionProjectAssignmentService` consult this table;
controller endpoints also gate by `@RequireRoles(...)` as defense in depth.

## HTTP API

Per-transition endpoints on `/assignments/:id/...`:

| Method | Path | Target |
|---|---|---|
| POST | `/assignments/:id/propose` | `PROPOSED` |
| POST | `/assignments/:id/reject` | `REJECTED` (reason required) |
| POST | `/assignments/:id/book` | `BOOKED` |
| POST | `/assignments/:id/onboarding` | `ONBOARDING` |
| POST | `/assignments/:id/assign` | `ASSIGNED` |
| POST | `/assignments/:id/hold` | `ON_HOLD` (reason required) |
| POST | `/assignments/:id/release` | `ASSIGNED` (from `ON_HOLD`) |
| POST | `/assignments/:id/complete` | `COMPLETED` |
| POST | `/assignments/:id/cancel` | `CANCELLED` (reason required) |

Request body: `{ reason?: string, caseId?: string }`.

## Audit trail

Every successful transition writes a row to `AssignmentHistory` with
`changeType = STATUS_<TARGET>` (e.g. `STATUS_PROPOSED`, `STATUS_ON_HOLD`).

Reason values are persisted both on the `AssignmentHistory.changeReason`
column and denormalised onto the `ProjectAssignment` row
(`rejectionReason`, `cancellationReason`, `onHoldReason`, `onHoldCaseId`)
for quick list-view rendering.

## Tests

Transition correctness is exercised in
[test/assignments/assignment-transition-matrix.spec.ts](../../test/assignments/assignment-transition-matrix.spec.ts)
— a table-driven spec that asserts every allowed/disallowed combination
plus reason enforcement.
