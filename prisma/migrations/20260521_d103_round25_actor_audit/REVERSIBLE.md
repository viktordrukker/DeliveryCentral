# F-70 / D-103 round 25 — Reversibility note

**Forward:** `migration.sql` adds `createdByPersonId` + `updatedByPersonId` (nullable, FK to `Person` with `ON DELETE SET NULL`) plus two indexes to `PersonOrgMembership` and `ReportingLine`.

**Rollback:** `rollback.sql` drops the four indexes, four FK constraints, and four columns. No data loss — the columns are additive and nullable; pre-existing rows had `NULL`.

**Compatibility:** matches the established D-103 actor-audit pattern from rounds 1-24. Both aggregates already carry full `createdAt`/`updatedAt` timestamps so no temporal-column prep is needed.

**Why this pair:** both are org-graph aggregates that record person↔unit / person↔manager links. Knowing who last reshaped them (e.g., HR-driven org change vs RM-driven matrix reassignment) is the canonical actor-audit question this round closes.
