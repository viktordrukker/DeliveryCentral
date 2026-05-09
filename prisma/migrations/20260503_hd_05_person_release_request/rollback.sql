-- Rollback for 20260503_hd_05_person_release_request.
-- Drops the two tables + two enums the forward migration adds.

DROP TABLE IF EXISTS "person_release_approvals";
DROP TABLE IF EXISTS "person_release_requests";
DROP TYPE  IF EXISTS "ReleaseApprovalDecision";
DROP TYPE  IF EXISTS "PersonReleaseStatus";
