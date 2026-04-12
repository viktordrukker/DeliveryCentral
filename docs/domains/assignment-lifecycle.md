# Assignment Lifecycle

## Purpose

Assignments are preserved as auditable staffing records across request, approval, rejection, and end-of-assignment transitions.

The live application runtime now persists assignment state, approvals, and workflow history in PostgreSQL through Prisma-backed repositories. The in-memory assignment repositories remain only for focused unit tests.

## Concurrency safety

Assignment lifecycle mutations now use optimistic concurrency control at the repository boundary.

That protection applies to:

- approve
- reject
- end

Behavior:

- each persisted assignment carries a version
- lifecycle writes compare the loaded version to the stored version
- if another operation has already changed the assignment, the stale write is rejected
- the API returns a conflict response instead of silently overwriting workflow state

This keeps lifecycle mutations auditable without adding hidden locking behavior.

## Explicit override workflow

Normal assignment rules remain primary.

The current explicit override path is intentionally narrow:

- overlapping assignment creation for the same person and project

Normal `POST /assignments` still rejects that conflict. An elevated operator can
use the explicit override path with a mandatory reason when governance allows
controlled deviation.

Override guardrails:

- stronger authorization than ordinary assignment creation
- mandatory reason capture
- authenticated actor capture for audit
- explicit history and business-audit visibility

This does not bypass other assignment validations such as missing people,
missing projects, invalid dates, or invalid allocation values.

## Core lifecycle

Current supported lifecycle transitions:

- `REQUESTED -> APPROVED`
- `REQUESTED -> REJECTED`
- `APPROVED -> ENDED`
- `ACTIVE -> ENDED`

`ENDED` is an explicit lifecycle state. The record is retained for workload history, audit review, and future offboarding linkage.

## End assignment workflow

Endpoint:
- `POST /assignments/{id}/end`

Request fields:
- `actorId`
- `endDate`
- `reason` optional

Behavior:
- assignment must exist
- assignment must not already be ended
- only approved/active assignments can be ended
- end date must be on or after assignment start date
- if the assignment already has a planned end date, the explicit end date cannot be after it

## Auditability

Ending an assignment does not delete it.

The workflow preserves:
- assignment record
- updated lifecycle status
- explicit end date
- lifecycle version progression for safe compare-and-swap writes
- assignment history entry with previous and new snapshot
- assignment approval decisions as separate records
- audit log entry with actor and reason
- explicit override audit/history entries when a governance override is used

## Persistence model

Durable assignment state is split into:

- `ProjectAssignment`: current staffing truth
- `AssignmentApproval`: approval/rejection decision trail
- `AssignmentHistory`: workflow and snapshot trail

This keeps staffing lifecycle explicit and auditable without collapsing it into work evidence or external system state.

## Design notes

This workflow is intentionally separate from:
- assignment rejection before approval
- future offboarding case workflows
- project closure

That separation keeps the lifecycle extensible for later HR/case-management tie-in without collapsing distinct business meanings.
