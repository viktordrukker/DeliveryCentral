-- V2-0 Foundation migration
-- Additive only: new enums, new tables, new nullable columns, safe defaults.

-- 1. New enums
CREATE TYPE "ProjectShape" AS ENUM ('SMALL', 'STANDARD', 'ENTERPRISE', 'PROGRAM');
CREATE TYPE "RiskReviewCadence" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY');

-- 2. Project — shape-awareness columns
ALTER TABLE "Project"
  ADD COLUMN "shape"             "ProjectShape"     NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "programId"         UUID,
  ADD COLUMN "leadPmPersonId"    UUID,
  ADD COLUMN "settingsOverride"  JSONB               NOT NULL DEFAULT '{}',
  ADD COLUMN "hasLiveSpcRates"   BOOLEAN             NOT NULL DEFAULT false;

CREATE INDEX "Project_shape_idx" ON "Project" ("shape");
CREATE INDEX "Project_programId_idx" ON "Project" ("programId");

-- 3. ProjectRolePlan — SPC rate
ALTER TABLE "project_role_plans"
  ADD COLUMN "standardHourlyRate" DECIMAL(10,2);

-- 4. ProjectBudget — vendor budget line + workstream stub
ALTER TABLE "project_budgets"
  ADD COLUMN "workstreamId" UUID,
  ADD COLUMN "vendorBudget" DECIMAL(15,2);

-- 5. ProjectRisk (table name: project_risks via @@map) — review cadence + workstream stub
ALTER TABLE "project_risks"
  ADD COLUMN "workstreamId"    UUID,
  ADD COLUMN "lastReviewedAt"  TIMESTAMP(3),
  ADD COLUMN "reviewCadence"   "RiskReviewCadence";

-- Backfill lastReviewedAt for existing rows so the "overdue" trigger doesn't spam on day one.
UPDATE "project_risks" SET "lastReviewedAt" = "raisedAt" WHERE "lastReviewedAt" IS NULL;

-- 6. ProjectMilestone — progress, deps, workstream stub
ALTER TABLE "project_milestones"
  ADD COLUMN "workstreamId"           UUID,
  ADD COLUMN "progressPct"            INTEGER    NOT NULL DEFAULT 0,
  ADD COLUMN "dependsOnMilestoneIds"  TEXT[]     NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 7. ProjectChangeRequest — workstream stub
ALTER TABLE "project_change_requests"
  ADD COLUMN "workstreamId" UUID;

-- 8. ProjectAssignment — workstream stub
ALTER TABLE "ProjectAssignment"
  ADD COLUMN "workstreamId" UUID;

-- 9. New model: ProjectWorkstream (stub — populated by future PIMS)
CREATE TABLE "project_workstreams" (
  "id"                 UUID             NOT NULL DEFAULT gen_random_uuid(),
  "projectId"          UUID             NOT NULL,
  "name"               TEXT             NOT NULL,
  "streamLeadPersonId" UUID,
  "budgetShare"        DECIMAL(5,4),
  "startDate"          DATE             NOT NULL,
  "endDate"            DATE,
  "status"             TEXT             NOT NULL DEFAULT 'ACTIVE',
  "displayOrder"       INTEGER          NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "project_workstreams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_workstreams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "project_workstreams_projectId_idx" ON "project_workstreams" ("projectId");

-- 10. New model: OrganizationConfig (single row)
CREATE TABLE "organization_configs" (
  "id"                        TEXT             NOT NULL DEFAULT 'default',
  "reportingCadence"          TEXT             NOT NULL DEFAULT 'WEEKLY',
  "tierLabels"                JSONB            NOT NULL DEFAULT '{"A":"General","B":"Quadrant"}',
  "exceptionAxisThreshold"    INTEGER          NOT NULL DEFAULT 1,
  "riskCadenceMap"            JSONB            NOT NULL DEFAULT '{}',
  "crStaleThresholdDays"      INTEGER          NOT NULL DEFAULT 7,
  "milestoneSlippedGraceDays" INTEGER          NOT NULL DEFAULT 0,
  "timesheetGapDays"          INTEGER          NOT NULL DEFAULT 14,
  "pmReassignmentPolicy"      TEXT             NOT NULL DEFAULT 'pm-or-director-or-admin',
  "defaultShapeForNewProject" TEXT             NOT NULL DEFAULT 'STANDARD',
  "defaultHourlyRate"         DECIMAL(10,2),
  "updatedByPersonId"         UUID,
  "updatedAt"                 TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "organization_configs_pkey" PRIMARY KEY ("id")
);

-- Seed the default row
INSERT INTO "organization_configs" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
