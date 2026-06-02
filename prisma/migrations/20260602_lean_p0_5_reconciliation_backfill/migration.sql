-- LEAN-P0-5 — reconciliation backfill (Phase 0 exit gate).
--
-- Closes the four data-shape gaps surfaced by LEAN-P0-1 and the four
-- dual-ID hazards documented in LEAN-P0-3. After this migration runs,
-- `scripts/lean-readiness-check.ts` returns exit code 0 against a
-- well-mirrored database.
--
-- Scope:
--   1. Backfill `ProjectPosition.legacyAssignmentId` from a fingerprint
--      match against `ProjectAssignment` (personId + projectId + validFrom
--      + staffingRole), only where the column is currently NULL.
--   2. Backfill `ProjectPosition.legacyStaffingRequestId` from the
--      fingerprint-matched assignment's own `staffingRequestId`.
--   3. Add `ProjectPositionCandidate.legacyCandidateId` column +
--      backfill from `StaffingRequestProposalCandidate` via the
--      `(positionId via slate → SR → legacyStaffingRequestId,
--      candidatePersonId)` join.
--   4. Backfill `staffing_requests.id_new` / `staffing_request_fulfilments.id_new`
--      where NULL (DM-2 trigger keeps new inserts populated but pre-trigger
--      rows in old backups might be NULL).
--   5. Add `timesheet_entries.positionId` + `timesheet_entries.personId`
--      columns. Backfill `personId` from the parent `TimesheetWeek`.
--      Backfill `positionId` via
--      `timesheet_entries.assignmentId → ProjectPosition.legacyAssignmentId`.
--   6. `CaseRecord.relatedAssignmentId` is intentionally left untouched —
--      Phase 3 will set the FK to NULL when `ProjectAssignment` drops.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent:
--   * Every column add uses `IF NOT EXISTS`.
--   * Every UPDATE includes a `WHERE <target> IS NULL` guard so a re-run
--     produces zero net changes on already-populated rows.
--   * Every constraint / index add uses `DO $$ … EXCEPTION WHEN
--     duplicate_object` / `IF NOT EXISTS`.
--
-- REVERSIBLE (DM-R-4). All changes are additive; the rollback drops the
-- new columns + indexes added here. See REVERSIBLE.md for the data-safety
-- contract; destructive legacy drops live in LEAN-P3-* once Phase 3
-- cutover lands.

-- =====================================================================
-- 1 + 2. ProjectPosition legacy* backfill (NO-OP when mirror already populated)
-- =====================================================================
--
-- The mirror service (LEAN-P0-4) keeps these populated on new writes.
-- This statement only fixes pre-existing rows that pre-dated the mirror
-- inversion. Fingerprint = (activePersonId, projectId, activeValidFrom,
-- role). Matching nulls treated as not-equal.

UPDATE "ProjectPosition" pp
SET
  "legacyAssignmentId"      = pa."id",
  "legacyStaffingRequestId" = CASE
    WHEN pp."legacyStaffingRequestId" IS NOT NULL THEN pp."legacyStaffingRequestId"
    WHEN pa."staffingRequestId" IS NULL THEN NULL
    ELSE (
      SELECT sr."id_new"
        FROM "staffing_requests" sr
        WHERE sr."id" = pa."staffingRequestId"
        LIMIT 1
    )
  END
FROM "ProjectAssignment" pa
WHERE pp."legacyAssignmentId" IS NULL
  AND pp."activePersonId"     = pa."personId"
  AND pp."projectId"          = pa."projectId"
  AND pp."activeValidFrom"    = pa."validFrom"
  AND pp."role"               = pa."staffingRole"
  AND pa."archivedAt" IS NULL;

-- Independent legacyStaffingRequestId fill for rows where the
-- legacyAssignmentId is already populated but the SR link is still NULL.
-- Resolves through the legacy assignment's staffingRequestId pointer.

UPDATE "ProjectPosition" pp
SET "legacyStaffingRequestId" = sr."id_new"
FROM "ProjectAssignment" pa
JOIN "staffing_requests"  sr ON sr."id" = pa."staffingRequestId"
WHERE pp."legacyStaffingRequestId" IS NULL
  AND pp."legacyAssignmentId"     = pa."id"
  AND pa."staffingRequestId" IS NOT NULL;

-- =====================================================================
-- 3. ProjectPositionCandidate.legacyCandidateId column + backfill
-- =====================================================================

ALTER TABLE "ProjectPositionCandidate"
  ADD COLUMN IF NOT EXISTS "legacyCandidateId" UUID;

CREATE INDEX IF NOT EXISTS "ProjectPositionCandidate_legacyCandidateId_idx"
  ON "ProjectPositionCandidate" ("legacyCandidateId");

-- Backfill: each legacy candidate links to the matching
-- (positionId, candidatePersonId) lean row. Resolution path:
--   StaffingRequestProposalCandidate.slateId
--     → StaffingRequestProposalSlate.staffingRequestId
--     → ProjectPosition.legacyStaffingRequestId (UUID, post step 1)
--     → ProjectPositionCandidate (positionId, candidatePersonId)
-- Only updates rows whose legacyCandidateId is NULL.

UPDATE "ProjectPositionCandidate" ppc
SET "legacyCandidateId" = src."id"
FROM "StaffingRequestProposalCandidate" src
JOIN "StaffingRequestProposalSlate"     srs ON srs."id" = src."slateId"
JOIN "staffing_requests"                sr  ON sr."id"  = srs."staffingRequestId"
JOIN "ProjectPosition"                  pp  ON pp."legacyStaffingRequestId" = sr."id_new"
WHERE ppc."legacyCandidateId" IS NULL
  AND ppc."positionId"        = pp."id"
  AND ppc."candidatePersonId" = src."candidatePersonId";

-- =====================================================================
-- 4. Dual-ID hazards 1 + 2 — backfill id_new where NULL.
-- =====================================================================
-- The DM-2 expand trigger keeps id_new populated on new inserts; this
-- only repairs pre-trigger rows (older backups, legacy imports).

UPDATE "staffing_requests"
SET "id_new" = gen_random_uuid()
WHERE "id_new" IS NULL;

UPDATE "staffing_request_fulfilments"
SET "id_new" = gen_random_uuid()
WHERE "id_new" IS NULL;

-- =====================================================================
-- 5. Dual-ID hazard 3 — TimesheetEntry positionId + personId columns.
-- =====================================================================
--
-- positionId resolves via `timesheet_entries.assignmentId → ProjectPosition.legacyAssignmentId`.
-- personId   denormalises `TimesheetWeek.personId` so reports can index
-- without a TimesheetWeek join.

ALTER TABLE "timesheet_entries"
  ADD COLUMN IF NOT EXISTS "positionId" UUID,
  ADD COLUMN IF NOT EXISTS "personId"   UUID;

-- FK constraint for positionId — SET NULL on position delete so timesheet
-- history survives a position retire.

DO $$ BEGIN
  ALTER TABLE "timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "ProjectPosition"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "timesheet_entries_positionId_date_idx"
  ON "timesheet_entries" ("positionId", "date");

CREATE INDEX IF NOT EXISTS "timesheet_entries_personId_date_idx"
  ON "timesheet_entries" ("personId", "date");

-- Backfill personId from the parent TimesheetWeek. Idempotent — only
-- touches rows whose personId is currently NULL.

UPDATE "timesheet_entries" te
SET "personId" = tw."personId"::uuid
FROM "timesheet_weeks" tw
WHERE te."personId"        IS NULL
  AND te."timesheetWeekId" = tw."id";

-- Backfill positionId via ProjectPosition.legacyAssignmentId. The
-- legacy assignmentId is TEXT (no FK); cast to UUID for the comparison.
-- Orphan rows (no matching position) stay NULL — they remain a
-- LEAN-P0-3 audit signal until Phase 3 drops `assignmentId` outright.

UPDATE "timesheet_entries" te
SET "positionId" = pp."id"
FROM "ProjectPosition" pp
WHERE te."positionId"   IS NULL
  AND te."assignmentId" IS NOT NULL
  AND pp."legacyAssignmentId" = te."assignmentId"::uuid;
