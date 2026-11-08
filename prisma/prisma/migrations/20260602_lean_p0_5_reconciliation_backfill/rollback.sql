-- LEAN-P0-5 rollback — undo the additive parts of the reconciliation
-- backfill. Idempotent (IF EXISTS) so re-running is safe.
--
-- See REVERSIBLE.md for the data-safety contract: this rollback drops
-- the new columns added by `migration.sql` but does NOT revert the
-- value-only backfills on pre-existing columns
-- (ProjectPosition.legacyAssignmentId / legacyStaffingRequestId,
-- staffing_requests.id_new, staffing_request_fulfilments.id_new).

-- timesheet_entries — drop positionId + personId.
ALTER TABLE "timesheet_entries"
  DROP CONSTRAINT IF EXISTS "timesheet_entries_positionId_fkey";
ALTER TABLE "timesheet_entries"
  DROP CONSTRAINT IF EXISTS "timesheet_entries_personId_fkey";
DROP INDEX IF EXISTS "timesheet_entries_positionId_date_idx";
DROP INDEX IF EXISTS "timesheet_entries_personId_date_idx";
ALTER TABLE "timesheet_entries"
  DROP COLUMN IF EXISTS "positionId",
  DROP COLUMN IF EXISTS "personId";

-- ProjectPositionCandidate — drop legacyCandidateId.
DROP INDEX IF EXISTS "ProjectPositionCandidate_legacyCandidateId_idx";
ALTER TABLE "ProjectPositionCandidate"
  DROP COLUMN IF EXISTS "legacyCandidateId";
