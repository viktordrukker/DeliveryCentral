-- LEAN-P3-1 rollback — best-effort revert of the Phase 3 data fixup.
-- Idempotent (IF EXISTS / WHERE guards) so re-running is safe.
--
-- See REVERSIBLE.md for the data-safety contract: rolling back this
-- migration is bit-for-bit clean ONLY if LEAN-P3-2 has not yet run.

-- =====================================================================
-- 4. Revert AuditLog aggregateType ProjectPosition → ProjectAssignment
--     for rows that were migrated by this migration (legacy assignmentId
--     still resolvable via ProjectPosition.legacyAssignmentId).
-- =====================================================================
DO $$
BEGIN
  UPDATE "AuditLog" al
  SET
    "aggregateType" = 'ProjectAssignment',
    "aggregateId"   = pp."legacyAssignmentId"
  FROM "ProjectPosition" pp
  WHERE al."aggregateType" = 'ProjectPosition'
    AND pp."id" = al."aggregateId"
    AND pp."legacyAssignmentId" IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =====================================================================
-- 3. Revert timesheet_entries.positionId for rows whose assignmentId
--     still resolves to the same ProjectPosition. Cannot distinguish
--     LEAN-P3-1 fills from LEAN-P0-5 fills, so the rollback is
--     intentionally conservative — only blanks rows where the
--     positionId/legacyAssignmentId mapping still matches.
-- =====================================================================
DO $$
BEGIN
  PERFORM set_config('public.allow_bulk', 'true', true);
  UPDATE "timesheet_entries" te
  SET "positionId" = NULL
  FROM "ProjectPosition" pp
  WHERE te."positionId" = pp."id"
    AND te."assignmentId" IS NOT NULL
    AND pp."legacyAssignmentId" = te."assignmentId"::uuid;
EXCEPTION WHEN undefined_column THEN
  NULL;
END $$;

-- =====================================================================
-- 2. Drop the pinnedPositions JSONB provenance column.
-- =====================================================================
ALTER TABLE "rate_card_entries"
  DROP COLUMN IF EXISTS "pinnedPositions";

-- =====================================================================
-- 1. Re-resolve CaseRecord.relatedAssignmentId.
--     Best-effort restore from the rate_card_entries provenance snapshot
--     is not possible — cases were not part of the snapshot. The pointer
--     stays NULL after rollback; this is a known information-loss path.
-- =====================================================================
-- (no-op intentionally — see REVERSIBLE.md operation 1)
