-- Project Radiator v1 migration
-- Adds PMBOK-aligned 16-axis radiator: milestones, change requests, EVM columns, overrides, thresholds.

-- CreateEnum
-- DM-R-11 (2026-05-01): `ChangeRequestStatus` and `ChangeRequestSeverity`
-- are also created idempotently in the `20260330_dm_r_11_orphan_recovery`
-- migration so that the earlier `20260417_dm3_relation_closure` ALTERs
-- can succeed on a fresh DB. Wrapping these in DO blocks here so a fresh
-- replay does not double-create.
DO $$ BEGIN CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'HIT', 'MISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ChangeRequestStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ChangeRequestSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ThresholdDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Rename businessRag -> peopleRag on project_rag_snapshots
ALTER TABLE "project_rag_snapshots" RENAME COLUMN "businessRag" TO "peopleRag";

-- 2. Add score columns to project_rag_snapshots
ALTER TABLE "project_rag_snapshots"
  ADD COLUMN "scopeScore"    INTEGER,
  ADD COLUMN "scheduleScore" INTEGER,
  ADD COLUMN "budgetScore"   INTEGER,
  ADD COLUMN "peopleScore"   INTEGER,
  ADD COLUMN "overallScore"  INTEGER;

-- 3. Add EVM columns to project_budgets
ALTER TABLE "project_budgets"
  ADD COLUMN "earnedValue"     DECIMAL(15,2),
  ADD COLUMN "actualCost"      DECIMAL(15,2),
  ADD COLUMN "plannedToDate"   DECIMAL(15,2),
  ADD COLUMN "eac"             DECIMAL(15,2),
  ADD COLUMN "capexCorrectPct" DECIMAL(5,4);

-- 4. Add scorer-required columns to Project
ALTER TABLE "Project"
  ADD COLUMN "baselineEndsOn"        TIMESTAMP(3),
  ADD COLUMN "forecastEndsOn"        TIMESTAMP(3),
  ADD COLUMN "criticalPathFloatDays" INTEGER,
  ADD COLUMN "baselineRequirements"  INTEGER;

-- Backfill baselineEndsOn = endsOn for existing rows
UPDATE "Project" SET "baselineEndsOn" = "endsOn" WHERE "endsOn" IS NOT NULL;

-- 5. Create project_milestones table
CREATE TABLE "project_milestones" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId"   UUID NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "plannedDate" DATE NOT NULL,
    "actualDate"  DATE,
    "status"      "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_milestones_projectId_plannedDate_idx" ON "project_milestones"("projectId", "plannedDate");
CREATE INDEX "project_milestones_projectId_status_idx" ON "project_milestones"("projectId", "status");
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Create project_change_requests table
-- DM-R-11: idempotent — already created in `20260330_dm_r_11_orphan_recovery`.
CREATE TABLE IF NOT EXISTS "project_change_requests" (
    "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId"         UUID NOT NULL,
    "title"             TEXT NOT NULL,
    "description"       TEXT,
    "status"            "ChangeRequestStatus" NOT NULL DEFAULT 'PROPOSED',
    "severity"          "ChangeRequestSeverity" NOT NULL DEFAULT 'MEDIUM',
    "outOfBaseline"     BOOLEAN NOT NULL DEFAULT false,
    "impactScope"       TEXT,
    "impactSchedule"    TEXT,
    "impactBudget"      TEXT,
    "requesterPersonId" UUID,
    "decidedByPersonId" UUID,
    "decidedAt"         TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_change_requests_pkey" PRIMARY KEY ("id")
);
-- DM-R-11: indexes already created in `20260330_dm_r_11_orphan_recovery`; the FK is unique to this migration.
CREATE INDEX IF NOT EXISTS "project_change_requests_projectId_status_idx" ON "project_change_requests"("projectId", "status");
CREATE INDEX IF NOT EXISTS "project_change_requests_projectId_createdAt_idx" ON "project_change_requests"("projectId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "project_change_requests" ADD CONSTRAINT "project_change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. Create project_radiator_overrides table
-- DM-R-11: idempotent — already created in `20260330_dm_r_11_orphan_recovery`.
CREATE TABLE IF NOT EXISTS "project_radiator_overrides" (
    "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshotId"           UUID NOT NULL,
    "subDimensionKey"      TEXT NOT NULL,
    "autoScore"            INTEGER,
    "overrideScore"        INTEGER NOT NULL CHECK ("overrideScore" BETWEEN 0 AND 4),
    "reason"               TEXT NOT NULL,
    "overriddenByPersonId" UUID NOT NULL,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_radiator_overrides_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_radiator_overrides_snapshotId_idx" ON "project_radiator_overrides"("snapshotId");
DO $$ BEGIN
  ALTER TABLE "project_radiator_overrides" ADD CONSTRAINT "project_radiator_overrides_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "project_rag_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 8. Create radiator_threshold_configs table
-- DM-R-11: idempotent — already created in `20260330_dm_r_11_orphan_recovery`.
CREATE TABLE IF NOT EXISTS "radiator_threshold_configs" (
    "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
    "subDimensionKey"   TEXT NOT NULL,
    "thresholdScore4"   DOUBLE PRECISION NOT NULL,
    "thresholdScore3"   DOUBLE PRECISION NOT NULL,
    "thresholdScore2"   DOUBLE PRECISION NOT NULL,
    "thresholdScore1"   DOUBLE PRECISION NOT NULL,
    "direction"         "ThresholdDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER',
    "updatedByPersonId" UUID,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "radiator_threshold_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "radiator_threshold_configs_subDimensionKey_key" ON "radiator_threshold_configs"("subDimensionKey");
