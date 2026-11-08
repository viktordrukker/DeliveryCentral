# F-72 / D-103 round 26 — Reversibility note

**Forward:** `migration.sql` adds `createdByPersonId` + `updatedByPersonId` (nullable, FK to `Person` with `ON DELETE SET NULL`) plus two indexes to `PersonResourcePoolMembership` and `MetadataEntry`.

**Rollback:** `rollback.sql` drops the four indexes, four FK constraints, and four columns. No data loss — columns are additive and nullable; pre-existing rows had `NULL`.

**Why this pair:** PersonResourcePoolMembership tracks resource-pool assignments (the RM workspace surface); MetadataEntry holds tenant-customizable dictionary values (Engineering / HR / Finance taxonomies). Both want canonical actor-audit columns so observability can answer "who changed this" without scanning AuditLog streams.

**Compatibility:** matches the F-44..F-70 D-103 pattern. Both aggregates already carry full `createdAt`/`updatedAt` — no temporal-column prep needed.
