# F-26 / D-103 + DM-5-5 round 3 — actor-audit columns on LeaveRequest + AssignmentApproval

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `leave_requests` and `AssignmentApproval`.

Both aggregates already carry a "decision actor" column (`LeaveRequest.reviewedBy`, `AssignmentApproval.decidedByPersonId`). The new columns capture the creation + last-modification actor — the full audit trail now sits on the row rather than being reconstructed from AuditLog joins.

Continues the F-10.3 + F-17 pattern (Project + ProjectAssignment; then CaseRecord + PersonReleaseRequest). After this batch, 6 high-audit aggregates carry full actor-audit columns.

All columns nullable → existing rows + existing service writers continue unchanged. Service-layer adoption follows per-aggregate.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → `\d leave_requests` / `\d "AssignmentApproval"` show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent (`ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).
- Backward again → idempotent (`DROP ... IF EXISTS`).
