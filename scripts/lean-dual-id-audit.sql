-- LEAN-P0-3 — dual-ID hazard audit queries.
--
-- Read-only. Surfaces rows that are AT RISK if the four dual-ID hazards
-- documented in docs/planning/lean-dual-id-hazards.md are not resolved
-- before the Phase 3 lean migration drops the legacy ProjectAssignment +
-- StaffingRequest family.
--
-- Each query returns a single row of the shape:
--   (violation_count BIGINT, sample_id TEXT)
--
-- - violation_count = 0 → hazard resolved (or not yet realised)
-- - violation_count > 0 → AT RISK; sample_id is one offending row id
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/lean-dual-id-audit.sql
-- or via the TypeScript wrapper:
--   npx ts-node --transpile-only scripts/lean-dual-id-audit.ts
--
-- Probe order matches buildAudits() in scripts/lean-dual-id-audit.ts.

-- ============================================================================
-- Probe 1 — staffing_request_id_promotion_ready
-- Surfaces StaffingRequest rows missing `id_new`, which would block the
-- Phase 3 swap that promotes `id_new` into the canonical PK slot.
-- ============================================================================
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT id FROM "staffing_requests" WHERE "id_new" IS NULL LIMIT 1) AS sample_id
FROM "staffing_requests"
WHERE "id_new" IS NULL;

-- ============================================================================
-- Probe 2 — staffing_request_fulfilment_id_promotion_ready
-- Surfaces StaffingRequestFulfilment rows missing `id_new`, which would
-- block the Phase 3 swap on the fulfilment table.
-- ============================================================================
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT id FROM "staffing_request_fulfilments" WHERE "id_new" IS NULL LIMIT 1) AS sample_id
FROM "staffing_request_fulfilments"
WHERE "id_new" IS NULL;

-- ============================================================================
-- Probe 3 — timesheet_entry_assignment_orphan_check
-- Surfaces TimesheetEntry rows whose `assignmentId` (TEXT, no FK) points
-- at a ProjectAssignment that has no ProjectPosition mirror. These rows
-- will silently lose their staffing link when `assignmentId` is dropped
-- in favour of `positionId`.
-- ============================================================================
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT te.id
     FROM "timesheet_entries" te
     WHERE te."assignmentId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "ProjectPosition" pp
         WHERE pp."legacyAssignmentId"::text = te."assignmentId"
       )
     LIMIT 1) AS sample_id
FROM "timesheet_entries" te
WHERE te."assignmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectPosition" pp
    WHERE pp."legacyAssignmentId"::text = te."assignmentId"
  );

-- ============================================================================
-- Probe 4 — case_record_assignment_orphan_check
-- Surfaces CaseRecord rows whose `relatedAssignmentId` (UUID, FK with
-- ON DELETE SET NULL) points at a ProjectAssignment that has no
-- ProjectPosition mirror. These cases will lose their staffing link in
-- Phase 3 unless the lean mirror is populated first.
-- ============================================================================
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT cr.id
     FROM "CaseRecord" cr
     WHERE cr."relatedAssignmentId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "ProjectPosition" pp
         WHERE pp."legacyAssignmentId" = cr."relatedAssignmentId"
       )
     LIMIT 1) AS sample_id
FROM "CaseRecord" cr
WHERE cr."relatedAssignmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectPosition" pp
    WHERE pp."legacyAssignmentId" = cr."relatedAssignmentId"
  );
