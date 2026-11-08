-- Rollback for F-82 / D-103 round 31 — OnboardingTourProgress + WorkEvidenceSource actor-audit

DROP INDEX IF EXISTS "WorkEvidenceSource_updatedByPersonId_idx";
DROP INDEX IF EXISTS "WorkEvidenceSource_createdByPersonId_idx";
DROP INDEX IF EXISTS "onboarding_tour_progress_updatedByPersonId_idx";
DROP INDEX IF EXISTS "onboarding_tour_progress_createdByPersonId_idx";

ALTER TABLE "WorkEvidenceSource"
  DROP CONSTRAINT IF EXISTS "WorkEvidenceSource_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "WorkEvidenceSource_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "onboarding_tour_progress"
  DROP CONSTRAINT IF EXISTS "onboarding_tour_progress_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "onboarding_tour_progress_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
