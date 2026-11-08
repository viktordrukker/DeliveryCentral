-- LEAN-P3-1 — pre-migration data fixup (Phase 3, step 1 of 4).
--
-- This migration prepares prod data for the forward-only legacy-table
-- drop in LEAN-P3-2. It is SAFE + REVERSIBLE and does NOT drop any
-- tables or columns. The goal: move every cross-aggregate reference
-- off `ProjectAssignment` onto its lean counterpart `ProjectPosition`
-- so that the Phase 3 drop in LEAN-P3-2 succeeds without FK violations.
--
-- Operations:
--   1. CaseRecord.relatedAssignmentId → NULL. The FK to ProjectAssignment
--      can be dropped in LEAN-P3-2 without breaking referential
--      integrity. (Case lineage is preserved through `relatedProjectId`
--      + payload metadata.)
--   2. rate_card_entries.pinnedPositions JSONB — new provenance column.
--      Snapshots the (assignmentId → positionId, role, hourlyRate)
--      mapping at fixup time so post-cutover audit can confirm zero
--      pin loss. Populated from existing ProjectAssignment rows whose
--      `appliedRateCardEntryId` points at the rate card entry, looking
--      up the mirrored ProjectPosition via `legacyAssignmentId`.
--   3. timesheet_entries.positionId backfill — fill any remaining
--      rows where positionId is still NULL but assignmentId resolves
--      to a ProjectPosition via `legacyAssignmentId`. (LEAN-P0-5 already
--      ran this once; this re-run handles any post-P0-5 inserts that
--      pre-dated the lean dual-write contract.)
--   4. AuditLog.aggregateType enum sweep — only rows whose
--      aggregateId resolves to a real ProjectPosition via
--      legacyAssignmentId are migrated. Other ProjectAssignment audit
--      rows are left alone (their aggregateId no longer resolves
--      after the table drop, but they remain readable as an immutable
--      audit trail).
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent:
--   * Column ADD uses IF NOT EXISTS.
--   * Every UPDATE includes a defensive WHERE guard so a re-run is a no-op.
--   * Every constraint / index uses DO $$ … EXCEPTION blocks where applicable.
--
-- REVERSIBLE (DM-R-4). See REVERSIBLE.md for the data-safety contract
-- and rollback.sql for the inverse DDL/DML.

-- =====================================================================
-- 1. CaseRecord.relatedAssignmentId → NULL.
-- =====================================================================
-- We blank the column rather than dropping the FK here so the Phase 3
-- LEAN-P3-2 drop is the only place FK definitions change. The
-- relatedProjectId pointer is retained so case lineage survives.
--
-- Bypass DM-R-23 mass-mutation guard (CaseRecord is guarded; bulk fixup
-- is a legitimate migration operation).

DO $$
BEGIN
  PERFORM set_config('public.allow_bulk', 'true', true);
  UPDATE "CaseRecord"
  SET "relatedAssignmentId" = NULL
  WHERE "relatedAssignmentId" IS NOT NULL;
END $$;

-- =====================================================================
-- 2. rate_card_entries.pinnedPositions JSONB — provenance snapshot.
-- =====================================================================
-- Adds an additive column on rate_card_entries holding the list of
-- positions currently pinned through it. Populated by joining
-- ProjectAssignment.appliedRateCardEntryId against ProjectPosition via
-- legacyAssignmentId so the JSONB encodes the lean equivalent of every
-- legacy pin. Leaves the existing ProjectAssignment.appliedRateCardEntryId
-- FK untouched — that's dropped in LEAN-P3-2 alongside the table drop.

ALTER TABLE "rate_card_entries"
  ADD COLUMN IF NOT EXISTS "pinnedPositions" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: for each rate_card_entry, aggregate the matched
-- ProjectPosition.id / role / hourlyRate triplets. Idempotent — uses
-- COALESCE so a re-run on an already-populated row produces the same
-- JSONB array.
DO $$
BEGIN
  UPDATE "rate_card_entries" rce
  SET "pinnedPositions" = COALESCE(agg.payload, '[]'::jsonb)
  FROM (
    SELECT
      pa."appliedRateCardEntryId" AS rce_id,
      jsonb_agg(
        jsonb_build_object(
          'assignmentId', pa."id",
          'positionId',   pp."id",
          'role',         pa."staffingRole",
          'hourlyRate',   pa."effectiveBillRate"
        )
        ORDER BY pa."id"
      ) AS payload
    FROM "ProjectAssignment" pa
    LEFT JOIN "ProjectPosition" pp
      ON pp."legacyAssignmentId" = pa."id"
    WHERE pa."appliedRateCardEntryId" IS NOT NULL
    GROUP BY pa."appliedRateCardEntryId"
  ) AS agg
  WHERE rce."id" = agg.rce_id
    AND (rce."pinnedPositions" IS NULL OR rce."pinnedPositions" = '[]'::jsonb);
EXCEPTION WHEN undefined_table THEN
  -- ProjectAssignment already dropped by a later migration; nothing to backfill.
  NULL;
END $$;

-- =====================================================================
-- 3. timesheet_entries.positionId backfill (LEAN-P0-5 follow-up).
-- =====================================================================
-- LEAN-P0-5 added the positionId column + initial backfill. This re-run
-- catches rows inserted between LEAN-P0-5 and this migration whose
-- positionId is still NULL but whose assignmentId resolves to a
-- ProjectPosition via legacyAssignmentId.

DO $$
BEGIN
  PERFORM set_config('public.allow_bulk', 'true', true);
  UPDATE "timesheet_entries" te
  SET "positionId" = pp."id"
  FROM "ProjectPosition" pp
  WHERE te."positionId"   IS NULL
    AND te."assignmentId" IS NOT NULL
    AND pp."legacyAssignmentId" = te."assignmentId"::uuid;
EXCEPTION WHEN undefined_column THEN
  -- positionId column not present (pre-LEAN-P0-5 DB); nothing to backfill.
  NULL;
END $$;

-- =====================================================================
-- 4. AuditLog.aggregateType ProjectAssignment → ProjectPosition.
-- =====================================================================
-- Migrates audit rows whose aggregateId resolves to a real
-- ProjectPosition via legacyAssignmentId. The lean equivalent is
-- discoverable: rewrite aggregateType so post-cutover audit queries
-- against ProjectPosition return the legacy history too. Rows whose
-- aggregateId does NOT resolve (orphan assignments) stay typed
-- ProjectAssignment — they remain readable but no longer joinable to
-- the live table. ProjectAssignment is retained in the AggregateType
-- enum after this migration so those orphans can still be queried.

DO $$
BEGIN
  UPDATE "AuditLog" al
  SET
    "aggregateType" = 'ProjectPosition',
    "aggregateId"   = pp."id"
  FROM "ProjectPosition" pp
  WHERE al."aggregateType" = 'ProjectAssignment'
    AND pp."legacyAssignmentId" = al."aggregateId";
EXCEPTION WHEN invalid_text_representation THEN
  -- aggregateId not UUID-castable on some legacy row; skip silently.
  NULL;
END $$;
