-- F-89 / D-103 round 38 — OrganizationConfig final actor-audit closure
--
-- OrganizationConfig is the singleton tenant config row. It already
-- has `updatedByPersonId` + `updatedAt` (canonical edit tracking).
-- Adding `createdByPersonId` so the canonical actor-audit pair is
-- complete for this aggregate.
--
-- This closes the last "small win" of the D-103 sweep. Remaining 25
-- aggregates are explicitly deferred in MASTER_TRACKER with per-row
-- rationale (already-actored / auth-internal / NO_TS / DB-trigger / Person-deferred).
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "organization_configs"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "organization_configs"
  ADD CONSTRAINT "organization_configs_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "organization_configs_createdByPersonId_idx"
  ON "organization_configs" ("createdByPersonId");
