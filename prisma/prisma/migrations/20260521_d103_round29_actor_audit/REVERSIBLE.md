# F-78 / D-103 round 29 — Reversibility note

**Forward:** `migration.sql` adds `createdByPersonId` + `updatedByPersonId` (nullable, FK to `Person` with `ON DELETE SET NULL`) plus two indexes to `EntityLayoutDefinition` and `HelpTip`.

**Rollback:** `rollback.sql` drops the four indexes, four FK constraints, and four columns. No data loss.

**Why this pair:** EntityLayoutDefinition holds tenant-scoped UI layout JSON (HR/admin can override per-org-unit layout); HelpTip holds inline help fragments admin can author per-tenant. Both edit surfaces need canonical actor-audit observability.
