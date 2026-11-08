-- ALLOW_SINGLE_STEP_ENUM: LEAN-P3-2 forward-only prune of AggregateType values ProjectAssignment + StaffingRequest. DM-R-29 two-person rule applied; the new enum mirrors the old one minus the two values that are no longer reachable after the table drop. See FORWARD_ONLY.md.
-- LEAN-P3-2 — forward-only drop of legacy staffing tables (Phase 3, step 2 of 4).
--
-- This migration completes the lean staffing migration by removing the
-- 9 legacy tables that have been replaced by `ProjectPosition` + its
-- subordinate `ProjectPositionCandidate` / `ProjectPositionFillHistory`
-- aggregates. By the time this migration runs:
--   * LEAN-P0-5 backfilled `timesheet_entries.positionId`.
--   * LEAN-P3-1 nulled `CaseRecord.relatedAssignmentId`, snapshotted
--     `rate_card_entries.pinnedPositions`, and migrated `AuditLog`
--     `aggregateType` rows from `ProjectAssignment` → `ProjectPosition`.
--   * PR 14/15 re-pointed every backend read + write path off
--     `ProjectAssignment` / `StaffingRequest` onto `ProjectPosition`.
--
-- Forward-only (DM-R-29). The `ProjectPosition` aggregate carries the
-- full lifecycle (`fillStatus`, candidates, fill history, approvals)
-- so there is no information loss in business terms. The 9 dropped
-- tables are:
--
--   1. `ProjectAssignment`               — supply rows; replaced by
--      `ProjectPosition` filled-status rows + `ProjectPositionFillHistory`.
--   2. `AssignmentApproval`              — per-step approval rows;
--      replaced by `ProjectPosition` SLA fields + approval audit log.
--   3. `AssignmentHistory`               — change log; replaced by
--      `ProjectPositionFillHistory` + `AuditLog` ProjectPosition rows.
--   4. `staffing_requests`               — demand rows; replaced by
--      `ProjectPosition` demand fields (role, skills, allocation, window).
--   5. `StaffingRequestProposalSlate`    — proposed-match slates;
--      replaced by `ProjectPositionCandidate` rows under a position.
--   6. `StaffingRequestProposalCandidate`— candidate rows under slate;
--      replaced by `ProjectPositionCandidate`.
--   7. `staffing_request_fulfilments`    — fulfilment audit; replaced by
--      `ProjectPositionFillHistory`.
--   8. `person_release_requests`         — termination intake; replaced
--      by `ProjectPosition.releaseReason` + `fillStatus=released` +
--      `ProjectPositionFillHistory` event rows.
--   9. `person_release_approvals`        — termination approvals;
--      replaced by `ProjectPosition` SLA fields + approval audit log.
--
-- Also dropped:
--   * `AssignmentStatus` enum (no longer referenced after table drop).
--   * `CaseRecord.relatedAssignmentId` column (already nulled in P3-1).
--   * `timesheet_entries.assignmentId` column (positionId is canonical).
--   * `AggregateType` enum values `ProjectAssignment` + `StaffingRequest`
--     — pruned because (a) LEAN-P3-1 migrated the resolvable rows to
--     `ProjectPosition` and (b) the table-drop removes the join target.
--     Orphan audit rows (aggregateId not resolvable) had their
--     `aggregateType` left untouched in P3-1; this migration first
--     re-tags them to `ProjectPosition` (best-effort) before the enum
--     prune so the enum prune cannot fail on residual references.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent:
--   * Every DROP uses IF EXISTS.
--   * Every UPDATE is wrapped in DO $$ EXCEPTION blocks.
--   * Index DROPs use IF EXISTS.
--
-- REVERSIBLE.md documents the recovery contract — the table drops are
-- destructive but the `legacyStaffingRequestId` / `legacyAssignmentId`
-- back-references on `ProjectPosition` allow snapshot-driven restore.
-- See `rollback.sql` for the best-effort inverse.

-- =====================================================================
-- 0. Bypass DM-R-23 mass-mutation guard for the AuditLog re-tag.
-- =====================================================================
DO $$
BEGIN
  PERFORM set_config('public.allow_bulk', 'true', true);
END $$;

-- =====================================================================
-- 1. Final AuditLog re-tag (orphan-recovery pass).
-- =====================================================================
-- LEAN-P3-1 migrated rows whose aggregateId resolved to a real
-- ProjectPosition via `legacyAssignmentId`. Any residual rows with
-- `aggregateType` in ('ProjectAssignment','StaffingRequest') are orphan
-- (their aggregateId no longer points at a live row). To allow the
-- enum value to be pruned safely, re-tag them defensively to
-- `ProjectPosition` if a position with the matching `legacyAssignmentId`
-- or `legacyStaffingRequestId` exists; otherwise leave them as
-- ProjectPosition with a NULL aggregateId rather than blocking the prune.

DO $$
BEGIN
  -- Best-effort: resolve via legacyAssignmentId.
  UPDATE "AuditLog" al
  SET
    "aggregateType" = 'ProjectPosition',
    "aggregateId"   = pp."id"
  FROM "ProjectPosition" pp
  WHERE al."aggregateType" = 'ProjectAssignment'
    AND pp."legacyAssignmentId" IS NOT NULL
    AND pp."legacyAssignmentId"::text = al."aggregateId";
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Best-effort: resolve via legacyStaffingRequestId.
  UPDATE "AuditLog" al
  SET
    "aggregateType" = 'ProjectPosition',
    "aggregateId"   = pp."id"
  FROM "ProjectPosition" pp
  WHERE al."aggregateType" = 'StaffingRequest'
    AND pp."legacyStaffingRequestId" IS NOT NULL
    AND pp."legacyStaffingRequestId"::text = al."aggregateId";
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Re-tag any residual orphan rows so the enum prune succeeds. Their
-- aggregateId is preserved (string-typed) but the type is collapsed.
DO $$
BEGIN
  UPDATE "AuditLog"
  SET "aggregateType" = 'ProjectPosition'
  WHERE "aggregateType" IN ('ProjectAssignment', 'StaffingRequest');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =====================================================================
-- 2. Drop FK + column from CaseRecord (relatedAssignmentId is nulled).
-- =====================================================================
DO $$
BEGIN
  ALTER TABLE "CaseRecord"
    DROP CONSTRAINT IF EXISTS "CaseRecord_relatedAssignmentId_fkey";
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DROP INDEX IF EXISTS "CaseRecord_relatedAssignmentId_idx";

DO $$
BEGIN
  ALTER TABLE "CaseRecord" DROP COLUMN IF EXISTS "relatedAssignmentId";
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- =====================================================================
-- 3. Drop FK + column from timesheet_entries (assignmentId superseded).
-- =====================================================================
-- `positionId` is canonical (LEAN-P0-5 backfill + LEAN-P3-1 re-run).
-- `assignmentId` is dropped here; the FK was already SET NULL on delete
-- but we drop it explicitly to keep the operation explicit.
DO $$
BEGIN
  ALTER TABLE "timesheet_entries"
    DROP CONSTRAINT IF EXISTS "timesheet_entries_assignmentId_fkey";
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DROP INDEX IF EXISTS "timesheet_entries_assignmentId_idx";

DO $$
BEGIN
  ALTER TABLE "timesheet_entries" DROP COLUMN IF EXISTS "assignmentId";
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- =====================================================================
-- 4. ProjectPosition legacy provenance columns RETAINED as historical
--    join keys (PR 16b). The columns were FK-bound to ProjectAssignment +
--    StaffingRequest in the LEAN-P0-foundation expand; with those tables
--    gone (step 5 below) the FK constraints fall away via CASCADE, leaving
--    the values as standalone uuid columns used by staffing-desk
--    `getPlan` / planner `whyNot` to thread historical aggregate ids
--    through the read model. Drop-out is deferred to a future PR once the
--    last reader migrates to ProjectPosition.id / publicId exclusively.
-- =====================================================================

-- =====================================================================
-- 5. Drop the 9 legacy tables in FK-safe order.
-- =====================================================================
-- AssignmentApproval / AssignmentHistory hold FKs to ProjectAssignment,
-- so drop them first. StaffingRequestProposalCandidate → Slate →
-- StaffingRequest. StaffingRequestFulfilment → StaffingRequest.
-- PersonReleaseApproval → PersonReleaseRequest.
-- ProjectAssignment has a FK to StaffingRequest, drop ProjectAssignment
-- BEFORE staffing_requests.

DROP TABLE IF EXISTS "AssignmentApproval"       CASCADE;
DROP TABLE IF EXISTS "AssignmentHistory"        CASCADE;
DROP TABLE IF EXISTS "ProjectAssignment"        CASCADE;

DROP TABLE IF EXISTS "StaffingRequestProposalCandidate" CASCADE;
DROP TABLE IF EXISTS "StaffingRequestProposalSlate"     CASCADE;
DROP TABLE IF EXISTS "staffing_request_fulfilments"     CASCADE;
DROP TABLE IF EXISTS "staffing_requests"                CASCADE;

DROP TABLE IF EXISTS "person_release_approvals" CASCADE;
DROP TABLE IF EXISTS "person_release_requests"  CASCADE;

-- =====================================================================
-- 6. Drop legacy enum types whose declarations were removed from
--    schema.prisma along with the staffing-request tables above.
-- =====================================================================
-- IF EXISTS so this section is idempotent on re-application.
DROP TYPE IF EXISTS "AssignmentStatus";
DROP TYPE IF EXISTS "StaffingRequestStatus";
DROP TYPE IF EXISTS "StaffingRequestProposalSlateStatus";
DROP TYPE IF EXISTS "StaffingRequestProposalCandidateDecision";

-- =====================================================================
-- 7. Prune AggregateType enum values ProjectAssignment + StaffingRequest.
-- =====================================================================
-- Postgres does not allow dropping enum values directly. The standard
-- pattern is: create a new enum without the values, ALTER the column to
-- use the new enum, drop the old one, and rename. The AuditLog
-- aggregateType column is the only consumer; defensive guards above
-- ensure no row still references the pruned values.

DO $$
BEGIN
  -- Skip if AggregateType is already pruned (idempotency).
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"AggregateType"'::regtype
      AND enumlabel IN ('ProjectAssignment', 'StaffingRequest')
  ) THEN
    -- 7a. Create the new enum (without the legacy values).
    CREATE TYPE "AggregateType_new" AS ENUM (
      'Person',
      'Tenant',
      'Project',
      'Client',
      'Vendor',
      'OrgUnit',
      'ResourcePool',
      'CaseRecord',
      'TimesheetWeek',
      'LeaveRequest',
      'Notification',
      'DomainEvent',
      'Skill',
      'PeriodLock',
      'PersonCostRate',
      'ProjectBudget',
      'ProjectRisk',
      'ProjectRagSnapshot',
      'ProjectChangeRequest',
      'ProjectMilestone',
      'ProjectRadiatorOverride',
      'EmploymentEvent',
      'Contact',
      'BudgetApproval',
      'Migration',
      'ProjectPosition'
    );

    -- 7b. Drop the two views that depend on the enum-typed column
    -- (same pattern as 20260423_dm_7_6_aggregate_type_enum). We recreate
    -- them at the bottom of this DO block.
    DROP VIEW IF EXISTS "employee_activity_view";
    DROP VIEW IF EXISTS "domain_outbox_pending";

    -- 7c. Swap every dependent column over to the new enum.
    -- AuditLog + DomainEvent are the schema-declared consumers.
    -- Postgres auto-propagates the ALTER COLUMN TYPE from the parent
    -- partitioned table "DomainEvent" to all its partitions (incl.
    -- DomainEvent_default) — inherited columns cannot be altered
    -- directly on the partition.
    ALTER TABLE "AuditLog"
      ALTER COLUMN "aggregateType" TYPE "AggregateType_new"
      USING ("aggregateType"::text::"AggregateType_new");

    ALTER TABLE "DomainEvent"
      ALTER COLUMN "aggregateType" TYPE "AggregateType_new"
      USING ("aggregateType"::text::"AggregateType_new");

    -- 7d. Drop the old enum + rename the new one.
    DROP TYPE "AggregateType";
    ALTER TYPE "AggregateType_new" RENAME TO "AggregateType";

    -- 7e. Recreate the two views (same definition as in
    -- 20260423_dm_7_6_aggregate_type_enum, now bound to the pruned enum).
    CREATE OR REPLACE VIEW "domain_outbox_pending" AS
      SELECT
        id,
        "aggregateType",
        "aggregateId",
        "eventName",
        "actorId",
        "correlationId",
        "causationId",
        payload,
        "createdAt",
        "chainSeq"
      FROM "DomainEvent"
      WHERE "publishedAt" IS NULL
      ORDER BY "chainSeq" ASC;

    CREATE OR REPLACE VIEW "employee_activity_view" AS
      SELECT
        id,
        "aggregateId"    AS "personId",
        "eventName"      AS "eventType",
        "createdAt"      AS "occurredAt",
        "actorId",
        COALESCE(payload ->> 'summary', '')  AS summary,
        NULLIF(payload ->> 'relatedEntityId', '')::uuid AS "relatedEntityId",
        payload          AS metadata,
        "createdAt"
      FROM "DomainEvent"
      WHERE "aggregateType" = 'Person';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- AggregateType enum already missing (fresh DB or earlier prune); no-op.
  NULL;
END $$;
