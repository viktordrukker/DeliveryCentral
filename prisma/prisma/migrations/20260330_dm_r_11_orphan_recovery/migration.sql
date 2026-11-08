-- DM-R-11 — orphan-recovery migration.
--
-- Six tables and four enums exist in every live DB (dev, staging, prod) and
-- in `prisma/migrations/.baseline-schema.sql` but had **no CREATE statement
-- anywhere in `prisma/migrations/`**. A fresh `prisma migrate deploy` could
-- therefore not reproduce the live schema — the first later migration that
-- ALTERed any of these objects would error with "relation does not exist".
--
-- This migration is dated `20260330_…` so it sorts *before* the first
-- migration that references an orphan (`20260417_dm3_relation_closure`).
-- It therefore runs **first** on a fresh DB. On any DB that already
-- contains the orphans (every existing DB), every statement is a no-op:
--
--   * enum CREATEs are wrapped in `DO $$ … duplicate_object …` blocks;
--   * table CREATEs use `IF NOT EXISTS`;
--   * unique / non-unique indexes use `IF NOT EXISTS`.
--
-- The recovery installs each table in its **original** shape — i.e. minus
-- columns added by later migrations (`scopeRag`/`peopleRag`/`*Score` on
-- `project_rag_snapshots`, `standardHourlyRate` on `project_role_plans`,
-- `currencyCode` on `project_vendor_engagements`, `tenantId` on `clients`
-- and `vendors`) — so the existing later migrations apply cleanly on a
-- fresh DB. Existing DBs already have those columns; the later migrations
-- have already been recorded against them.
--
-- Classification: REVERSIBLE.

-- ─── Enums (4) ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "RagRating" AS ENUM ('GREEN', 'AMBER', 'RED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "RolePlanSource" AS ENUM ('INTERNAL', 'VENDOR', 'EITHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VendorContractType" AS ENUM ('STAFF_AUGMENTATION', 'FIXED_DELIVERABLE', 'MANAGED_SERVICE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VendorEngagementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- These two enums + the `project_change_requests` table immediately
-- below are *also* missing from the original migration history at the
-- time DM-R-11 was first triaged: `20260417_dm3_relation_closure` adds
-- FKs to `project_change_requests`, but the table itself is created by
-- `20260418_project_radiator_v1` — the alphabetical-order failure that
-- prevents `prisma migrate deploy` from working on a fresh DB. Creating
-- them here (idempotently) fixes the out-of-order reference. Existing
-- DBs already have the table from `radiator_v1`; the matching CREATEs
-- there must be `IF NOT EXISTS` (see edit in that file).
DO $$ BEGIN
  CREATE TYPE "ChangeRequestStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ChangeRequestSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ThresholdDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- The next two enums + the matching `engagementModel` / `priority` columns
-- on `Project` (added below) are also DM-R-11 orphans: they live in every
-- live DB but no migration creates them.
DO $$ BEGIN
  CREATE TYPE "EngagementModel" AS ENUM ('TIME_AND_MATERIAL', 'FIXED_PRICE', 'MANAGED_SERVICE', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ─── EmployeeActivityEvent ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmployeeActivityEvent" (
  "id"              uuid                       NOT NULL,
  "personId"        uuid                       NOT NULL,
  "eventType"       text                       NOT NULL,
  "occurredAt"      timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "actorId"         uuid,
  "summary"         text                       NOT NULL,
  "relatedEntityId" uuid,
  "metadata"        jsonb,
  "createdAt"       timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "EmployeeActivityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmployeeActivityEvent_personId_occurredAt_idx"
  ON "EmployeeActivityEvent" ("personId", "occurredAt");
CREATE INDEX IF NOT EXISTS "EmployeeActivityEvent_eventType_idx"
  ON "EmployeeActivityEvent" ("eventType");


-- ─── clients ──────────────────────────────────────────────────────────────
-- `tenantId` is added later by `20260423_dm_7_5_tenant_foundation`.
CREATE TABLE IF NOT EXISTS "clients" (
  "id"                     uuid                       NOT NULL,
  "name"                   text                       NOT NULL,
  "industry"               text,
  "accountManagerPersonId" uuid,
  "notes"                  text,
  "isActive"               boolean                    DEFAULT true NOT NULL,
  "createdAt"              timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"              timestamp(3) with time zone NOT NULL,
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "clients_name_key" ON "clients" ("name");
CREATE INDEX IF NOT EXISTS "clients_isActive_idx" ON "clients" ("isActive");


-- ─── vendors ──────────────────────────────────────────────────────────────
-- `tenantId` is added later by `20260423_dm_7_5_tenant_foundation`.
CREATE TABLE IF NOT EXISTS "vendors" (
  "id"            uuid                       NOT NULL,
  "name"          text                       NOT NULL,
  "contactName"   text,
  "contactEmail"  text,
  "contractType"  "VendorContractType"       DEFAULT 'STAFF_AUGMENTATION'::"VendorContractType" NOT NULL,
  "skillAreas"    text[]                     DEFAULT ARRAY[]::text[],
  "notes"         text,
  "isActive"      boolean                    DEFAULT true NOT NULL,
  "createdAt"     timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"     timestamp(3) with time zone NOT NULL,
  CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "vendors_name_key" ON "vendors" ("name");
CREATE INDEX IF NOT EXISTS "vendors_isActive_idx" ON "vendors" ("isActive");


-- ─── project_rag_snapshots ────────────────────────────────────────────────
-- `scopeRag` / `peopleRag` (originally `businessRag`) / `dimensionDetails`
-- / `riskSummary` are added by `20260417_add_project_risks_enhanced_rag`;
-- `*Score` columns are added by `20260418_project_radiator_v1`.
CREATE TABLE IF NOT EXISTS "project_rag_snapshots" (
  "id"                  uuid                       NOT NULL,
  "projectId"           uuid                       NOT NULL,
  "weekStarting"        date                       NOT NULL,
  "staffingRag"         "RagRating"                NOT NULL,
  "scheduleRag"         "RagRating"                NOT NULL,
  "budgetRag"           "RagRating"                NOT NULL,
  "clientRag"           "RagRating",
  "overallRag"          "RagRating"                NOT NULL,
  "autoComputedOverall" "RagRating",
  "isOverridden"        boolean                    DEFAULT false NOT NULL,
  "overrideReason"      text,
  "narrative"           text,
  "accomplishments"     text,
  "nextSteps"           text,
  "recordedByPersonId"  uuid                       NOT NULL,
  "createdAt"           timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"           timestamp(3) with time zone NOT NULL,
  CONSTRAINT "project_rag_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_rag_snapshots_projectId_weekStarting_key"
  ON "project_rag_snapshots" ("projectId", "weekStarting");
CREATE INDEX IF NOT EXISTS "project_rag_snapshots_projectId_weekStarting_idx"
  ON "project_rag_snapshots" ("projectId", "weekStarting");
CREATE INDEX IF NOT EXISTS "project_rag_snapshots_recordedByPersonId_idx"
  ON "project_rag_snapshots" ("recordedByPersonId");


-- ─── project_role_plans ───────────────────────────────────────────────────
-- `standardHourlyRate` is added by `20260419_pulse_v2_foundation`;
-- the two CHECK constraints are added by `20260418_dm4_check_constraints`.
CREATE TABLE IF NOT EXISTS "project_role_plans" (
  "id"                uuid                       NOT NULL,
  "projectId"         uuid                       NOT NULL,
  "roleName"          text                       NOT NULL,
  "seniorityLevel"    text,
  "headcount"         integer                    DEFAULT 1 NOT NULL,
  "allocationPercent" numeric(5,2),
  "plannedStartDate"  timestamp(3) with time zone,
  "plannedEndDate"    timestamp(3) with time zone,
  "requiredSkillIds"  text[]                     DEFAULT ARRAY[]::text[],
  "source"            "RolePlanSource"           DEFAULT 'INTERNAL'::"RolePlanSource" NOT NULL,
  "notes"             text,
  "createdAt"         timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"         timestamp(3) with time zone NOT NULL,
  CONSTRAINT "project_role_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_role_plans_projectId_roleName_seniorityLevel_key"
  ON "project_role_plans" ("projectId", "roleName", "seniorityLevel");
CREATE INDEX IF NOT EXISTS "project_role_plans_projectId_idx"
  ON "project_role_plans" ("projectId");


-- ─── project_vendor_engagements ───────────────────────────────────────────
-- `currencyCode` is added by `20260423_dm_6a_1_currency`;
-- the two CHECK constraints are added by `20260418_dm4_check_constraints`.
CREATE TABLE IF NOT EXISTS "project_vendor_engagements" (
  "id"             uuid                       NOT NULL,
  "projectId"      uuid                       NOT NULL,
  "vendorId"       uuid                       NOT NULL,
  "roleSummary"    text                       NOT NULL,
  "headcount"      integer                    DEFAULT 1 NOT NULL,
  "monthlyRate"    numeric(12,2),
  "blendedDayRate" numeric(10,2),
  "startDate"      timestamp(3) with time zone,
  "endDate"        timestamp(3) with time zone,
  "status"         "VendorEngagementStatus"   DEFAULT 'ACTIVE'::"VendorEngagementStatus" NOT NULL,
  "notes"          text,
  "createdAt"      timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"      timestamp(3) with time zone NOT NULL,
  CONSTRAINT "project_vendor_engagements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_vendor_engagements_projectId_vendorId_key"
  ON "project_vendor_engagements" ("projectId", "vendorId");
CREATE INDEX IF NOT EXISTS "project_vendor_engagements_projectId_status_idx"
  ON "project_vendor_engagements" ("projectId", "status");
CREATE INDEX IF NOT EXISTS "project_vendor_engagements_vendorId_idx"
  ON "project_vendor_engagements" ("vendorId");


-- ─── project_change_requests ─────────────────────────────────────────────
-- Out-of-order FK fix: `20260417_dm3_relation_closure` ALTERs this table
-- to add FKs but `20260418_project_radiator_v1` is what creates it.
-- Creating it idempotently here breaks the cycle.
CREATE TABLE IF NOT EXISTS "project_change_requests" (
  "id"                uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "projectId"         uuid                       NOT NULL,
  "title"             text                       NOT NULL,
  "description"       text,
  "status"            "ChangeRequestStatus"      NOT NULL DEFAULT 'PROPOSED',
  "severity"          "ChangeRequestSeverity"    NOT NULL DEFAULT 'MEDIUM',
  "outOfBaseline"     boolean                    NOT NULL DEFAULT false,
  "impactScope"       text,
  "impactSchedule"    text,
  "impactBudget"      text,
  "requesterPersonId" uuid,
  "decidedByPersonId" uuid,
  "decidedAt"         timestamp(3) with time zone,
  "createdAt"         timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"         timestamp(3) with time zone NOT NULL,
  CONSTRAINT "project_change_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_change_requests_projectId_status_idx"
  ON "project_change_requests" ("projectId", "status");
CREATE INDEX IF NOT EXISTS "project_change_requests_projectId_createdAt_idx"
  ON "project_change_requests" ("projectId", "createdAt");


-- ─── project_radiator_overrides ──────────────────────────────────────────
-- Same out-of-order pattern: `dm3_relation_closure` ALTERs this for the
-- `overriddenByPersonId` FK before `radiator_v1` creates the table.
CREATE TABLE IF NOT EXISTS "project_radiator_overrides" (
  "id"                   uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "snapshotId"           uuid                       NOT NULL,
  "subDimensionKey"      text                       NOT NULL,
  "autoScore"            integer,
  "overrideScore"        integer                    NOT NULL CHECK ("overrideScore" BETWEEN 0 AND 4),
  "reason"               text                       NOT NULL,
  "overriddenByPersonId" uuid                       NOT NULL,
  "createdAt"            timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "project_radiator_overrides_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_radiator_overrides_snapshotId_idx"
  ON "project_radiator_overrides" ("snapshotId");


-- ─── radiator_threshold_configs ──────────────────────────────────────────
-- Same out-of-order pattern.
CREATE TABLE IF NOT EXISTS "radiator_threshold_configs" (
  "id"                uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "subDimensionKey"   text                       NOT NULL,
  "thresholdScore4"   double precision           NOT NULL,
  "thresholdScore3"   double precision           NOT NULL,
  "thresholdScore2"   double precision           NOT NULL,
  "thresholdScore1"   double precision           NOT NULL,
  "direction"         "ThresholdDirection"       NOT NULL DEFAULT 'HIGHER_IS_BETTER',
  "updatedByPersonId" uuid,
  "updatedAt"         timestamp(3) with time zone NOT NULL,
  CONSTRAINT "radiator_threshold_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "radiator_threshold_configs_subDimensionKey_key"
  ON "radiator_threshold_configs" ("subDimensionKey");


-- ─── Tenant ──────────────────────────────────────────────────────────────
-- `20260423_dm_6a_3_dictionaries` adds FK columns referencing `Tenant(id)`,
-- but the table itself is created later by `20260423_dm_7_5_tenant_foundation`
-- (`6a_3` < `7_5`). Create the table + the well-known default tenant row
-- here so all subsequent FKs apply cleanly. Idempotent on existing DBs;
-- the dm_7_5 migration uses `CREATE TABLE IF NOT EXISTS` and the same
-- `INSERT … ON CONFLICT DO NOTHING`, so this is a no-op there.
CREATE TABLE IF NOT EXISTS "Tenant" (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text         NOT NULL UNIQUE,
  name          text         NOT NULL,
  "isActive"    boolean      NOT NULL DEFAULT true,
  "suspendedAt" timestamptz,
  "createdAt"   timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt"   timestamptz  NOT NULL DEFAULT NOW()
);
INSERT INTO "Tenant" (id, code, name)
VALUES ('00000000-0000-0000-0000-00000000dc01', 'default', 'DeliveryCentral (default tenant)')
ON CONFLICT (id) DO NOTHING;


-- ─── Orphan columns on Person ────────────────────────────────────────────
-- These five columns exist in `.baseline-schema.sql` and in every live
-- DB but were never added by a committed migration (originally added via
-- `prisma db push`). `dm_8_6_pii_markers` (`COMMENT ON COLUMN "Person"."location"`)
-- assumes they exist; without this block fresh-DB migrate fails on it.
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "grade"     text;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "role"      text;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "skillsets" text[] DEFAULT ARRAY[]::text[] NOT NULL;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "location"  text;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "timezone"  text;


-- ─── Orphan columns on Project ───────────────────────────────────────────
-- Same story as Person: these columns exist in every live DB and in
-- `.baseline-schema.sql` but have no committed CREATE / ALTER ADD COLUMN.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "clientId"           uuid;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deliveryManagerId"  uuid;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "engagementModel"    "EngagementModel";
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectType"        text;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "priority"           "ProjectPriority" DEFAULT 'MEDIUM';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "domain"             text;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "techStack"          text[] DEFAULT ARRAY[]::text[];
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "tags"               text[] DEFAULT ARRAY[]::text[];
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "outcomeRating"      text;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lessonsLearned"     text;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "wouldStaffSameWay"  boolean;
CREATE INDEX IF NOT EXISTS "Project_deliveryManagerId_idx" ON "Project" ("deliveryManagerId");
CREATE INDEX IF NOT EXISTS "Project_clientId_idx"          ON "Project" ("clientId");
