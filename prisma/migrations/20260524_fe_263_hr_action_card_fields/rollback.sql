-- FE-#263 rollback — drop the 4 HR action-card columns. Idempotent.

ALTER TABLE "Person"
  DROP COLUMN IF EXISTS "probationEndsAt",
  DROP COLUMN IF EXISTS "contractEndsAt",
  DROP COLUMN IF EXISTS "lastHrReviewAt";

ALTER TABLE "person_skills"
  DROP COLUMN IF EXISTS "certificationExpiresAt";
