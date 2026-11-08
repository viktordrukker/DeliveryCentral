# F-87 / D-103 round 36 — Reversibility note

**Bundle pattern (new):** 5 aggregates in a single migration. Each gets only `createdByPersonId` + FK + index — NOT the canonical pair. These rows are immutable (`createdAt` but no `updatedAt`), so `updatedByPersonId` would be dead weight.

**Aggregates:**
1. `person_cost_rates` (PersonCostRate) — HR sets person hourly rate
2. `public_holidays` (PublicHoliday) — admin curates per-region holidays
3. `Currency` (no @@map, PascalCase) — admin curates seed list
4. `fx_rates` (FxRate) — integrations import FX; useful actor-or-system attribution
5. `vendor_skill_areas` (VendorSkillArea) — admin curates per-vendor skill registry

**HelpFeedback was validated out of this bundle** — it already carries `actorPersonId` (the canonical "who submitted" actor); adding `createdByPersonId` would duplicate.

**Rollback:** drops 5 indexes, 5 FK constraints, 5 columns. No data loss — columns are additive and nullable.

**Why bundled:** the canonical-pair D-103 work was nearing natural completion (only 3 truly READY aggregates left — Person + 2 enum-blocked). Switching to createdByPersonId-only on immutable rows extends D-103's reach to 13+ more aggregates with meaningful observability value.

**Bundle policy:** subsequent F-XX rounds may bundle multiple aggregates when the migration shape is uniform (same column add, no per-aggregate FK index conflicts).
