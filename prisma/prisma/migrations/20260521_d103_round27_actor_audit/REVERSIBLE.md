# F-74 / D-103 round 27 — Reversibility note

**Forward:** `migration.sql` adds `createdByPersonId` + `updatedByPersonId` (nullable, FK to `Person` with `ON DELETE SET NULL`) plus two indexes to `pulse_reports` (the table-mapped name for `PulseReport`) and `IntegrationSyncState`.

**Rollback:** `rollback.sql` drops the four indexes, four FK constraints, and four columns. No data loss — columns are additive and nullable; pre-existing rows had `NULL`.

**Why this pair:** PulseReport already carries `submittedByPersonId` (the form submitter — semantically distinct from the canonical "who created/last-edited the row"). IntegrationSyncState records sync cursors per provider/resource and lacks any actor-audit today. Both get the canonical pair to bring them into uniform observability shape.
