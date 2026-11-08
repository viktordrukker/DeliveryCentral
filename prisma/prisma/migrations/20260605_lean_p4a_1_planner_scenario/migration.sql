-- LEAN-P4a-1 — PlannerScenario tenancy + status + audit columns.
--
-- Distribution Studio scenarios already exist (FE-#266) as named JSON
-- snapshots keyed by a single creator. This migration grafts on the
-- canonical fields the lean migration requires so the scenario surface
-- can participate in tenant-scoped admin views, status-driven lifecycle
-- (DRAFT → SUBMITTED → APPLIED → CANCELLED), and DM-2.5 publicId egress.
--
-- Scope (additive only):
--   1. Add `PlannerScenarioStatus` enum.
--   2. Add `publicId`, `tenantId`, `status`, `updatedByPersonId` columns
--      to `planner_scenarios`.
--   3. Backfill `status = 'CANCELLED'` for any row that already carries a
--      non-NULL `archivedAt`; everything else stays `DRAFT` (enum default).
--   4. Add FKs + indexes for tenant + updater + composite tenant/status.
--
-- Idempotent (CLAUDE.md memory feedback-migrations-must-be-idempotent):
--   * Every column add uses `ADD COLUMN IF NOT EXISTS`.
--   * Enum creation is wrapped in `DO $$ … EXCEPTION WHEN duplicate_object`.
--   * Every constraint / index add uses `IF NOT EXISTS` (Postgres ≥9.5).
--   * Backfill is `UPDATE … WHERE status = 'DRAFT' AND archivedAt IS NOT NULL`
--     so a re-run produces zero net changes.
--
-- REVERSIBLE (DM-R-4). All adds are reversible by drop; the backfill is
-- value-only and replayable. See REVERSIBLE.md.

-- =====================================================================
-- 1. PlannerScenarioStatus enum
-- =====================================================================

DO $$
BEGIN
  CREATE TYPE "PlannerScenarioStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPLIED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- =====================================================================
-- 2. PlannerScenario new columns
-- =====================================================================

ALTER TABLE "planner_scenarios"
  ADD COLUMN IF NOT EXISTS "publicId" VARCHAR(32);

ALTER TABLE "planner_scenarios"
  ADD COLUMN IF NOT EXISTS "tenantId" UUID;

ALTER TABLE "planner_scenarios"
  ADD COLUMN IF NOT EXISTS "status" "PlannerScenarioStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "planner_scenarios"
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

-- =====================================================================
-- 3. Backfill status from archivedAt
-- =====================================================================

UPDATE "planner_scenarios"
   SET "status" = 'CANCELLED'
 WHERE "archivedAt" IS NOT NULL
   AND "status" = 'DRAFT';

-- =====================================================================
-- 4. Indexes + FKs (idempotent)
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "planner_scenarios_publicId_key"
  ON "planner_scenarios" ("publicId");

CREATE INDEX IF NOT EXISTS "planner_scenarios_tenantId_status_idx"
  ON "planner_scenarios" ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "planner_scenarios_updatedByPersonId_idx"
  ON "planner_scenarios" ("updatedByPersonId");

DO $$
BEGIN
  ALTER TABLE "planner_scenarios"
    ADD CONSTRAINT "planner_scenarios_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE "planner_scenarios"
    ADD CONSTRAINT "planner_scenarios_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;
