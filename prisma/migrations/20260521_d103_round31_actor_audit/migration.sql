-- F-82 / D-103 round 31 — actor-audit columns on OnboardingTourProgress + WorkEvidenceSource
--
-- OnboardingTourProgress tracks per-person tour completion (admin/HR
-- can reset). WorkEvidenceSource registers ingest connectors (Jira,
-- M365, GitHub) — admin-edited per-tenant. Adds canonical actor-audit
-- pair to both for uniform observability.
--
-- REVERSIBLE: see rollback.sql.

-- OnboardingTourProgress ------------------------------------------------

ALTER TABLE "onboarding_tour_progress"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "onboarding_tour_progress"
  ADD CONSTRAINT "onboarding_tour_progress_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "onboarding_tour_progress"
  ADD CONSTRAINT "onboarding_tour_progress_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "onboarding_tour_progress_createdByPersonId_idx"
  ON "onboarding_tour_progress" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "onboarding_tour_progress_updatedByPersonId_idx"
  ON "onboarding_tour_progress" ("updatedByPersonId");

-- WorkEvidenceSource ----------------------------------------------------

ALTER TABLE "WorkEvidenceSource"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "WorkEvidenceSource"
  ADD CONSTRAINT "WorkEvidenceSource_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkEvidenceSource"
  ADD CONSTRAINT "WorkEvidenceSource_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkEvidenceSource_createdByPersonId_idx"
  ON "WorkEvidenceSource" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "WorkEvidenceSource_updatedByPersonId_idx"
  ON "WorkEvidenceSource" ("updatedByPersonId");
