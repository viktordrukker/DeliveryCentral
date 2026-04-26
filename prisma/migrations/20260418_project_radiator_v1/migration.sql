-- Project Radiator v1 migration
-- Adds PMBOK-aligned 16-axis radiator: milestones, change requests, EVM columns, overrides, thresholds.

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'HIT', 'MISSED');
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "ChangeRequestSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ThresholdDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

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
CREATE TABLE "project_change_requests" (
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
CREATE INDEX "project_change_requests_projectId_status_idx" ON "project_change_requests"("projectId", "status");
CREATE INDEX "project_change_requests_projectId_createdAt_idx" ON "project_change_requests"("projectId", "createdAt");
ALTER TABLE "project_change_requests" ADD CONSTRAINT "project_change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Create project_radiator_overrides table
CREATE TABLE "project_radiator_overrides" (
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
CREATE INDEX "project_radiator_overrides_snapshotId_idx" ON "project_radiator_overrides"("snapshotId");
ALTER TABLE "project_radiator_overrides" ADD CONSTRAINT "project_radiator_overrides_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "project_rag_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Create radiator_threshold_configs table
CREATE TABLE "radiator_threshold_configs" (
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
CREATE UNIQUE INDEX "radiator_threshold_configs_subDimensionKey_key" ON "radiator_threshold_configs"("subDimensionKey");
