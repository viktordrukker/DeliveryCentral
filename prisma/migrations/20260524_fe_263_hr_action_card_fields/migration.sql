-- FE-#263 — HR action-cards source fields on Person + PersonSkill.
--
-- All nullable; existing rows backfill to NULL (no data movement). The
-- HR action-cards service treats NULL as "no card raised" so the absence
-- of a value is the safe default.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent.

ALTER TABLE "Person"
  ADD COLUMN IF NOT EXISTS "probationEndsAt" DATE NULL,
  ADD COLUMN IF NOT EXISTS "contractEndsAt"  DATE NULL,
  ADD COLUMN IF NOT EXISTS "lastHrReviewAt"  DATE NULL;

ALTER TABLE "person_skills"
  ADD COLUMN IF NOT EXISTS "certificationExpiresAt" DATE NULL;
