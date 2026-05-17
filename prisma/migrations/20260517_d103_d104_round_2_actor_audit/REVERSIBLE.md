# F-17 / D-103 + DM-5-5 round 2 — actor-audit columns on CaseRecord + PersonReleaseRequest

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `case_records` and `person_release_requests`. Continues the F-10.3 pattern (which covered `Project` + `ProjectAssignment`). All columns nullable → existing rows + existing service writers continue unchanged; service-layer adoption follows.

`StaffingRequest` deliberately excluded — its `requestedByPersonId` is a legacy non-UUID `String` column (no `@db.Uuid` annotation) and would need a separate type-correction migration first.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → `\d case_records` / `\d person_release_requests` show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent (`ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).
- Backward again → idempotent (`DROP ... IF EXISTS`).
