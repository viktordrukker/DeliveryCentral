-- F-17 / D-103 + DM-5-5 round 2 — rollback. Idempotent.

-- PersonReleaseRequest reverse
DROP INDEX IF EXISTS "person_release_requests_updatedByPersonId_idx";
DROP INDEX IF EXISTS "person_release_requests_createdByPersonId_idx";
ALTER TABLE "person_release_requests"
  DROP CONSTRAINT IF EXISTS "person_release_requests_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "person_release_requests_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

-- CaseRecord reverse
DROP INDEX IF EXISTS "CaseRecord_updatedByPersonId_idx";
DROP INDEX IF EXISTS "CaseRecord_createdByPersonId_idx";
ALTER TABLE "CaseRecord"
  DROP CONSTRAINT IF EXISTS "CaseRecord_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "CaseRecord_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
