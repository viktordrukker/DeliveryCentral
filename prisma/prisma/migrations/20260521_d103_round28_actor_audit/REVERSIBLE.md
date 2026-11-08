# F-76 / D-103 round 28 — Reversibility note

**Forward:** `migration.sql` adds `createdByPersonId` + `updatedByPersonId` (nullable, FK to `Person` with `ON DELETE SET NULL`) plus two indexes to `LocalAccount` and `WorkEvidence`.

**Rollback:** `rollback.sql` drops the four indexes, four FK constraints, and four columns. No data loss — columns are additive and nullable.

**Why this pair:** LocalAccount holds per-person auth (admin reset flows need actor-audit observability); WorkEvidence is the PMO-facing work-record stream from external systems. Both want canonical "who created/last-edited the row" answerable without audit-log scans.
