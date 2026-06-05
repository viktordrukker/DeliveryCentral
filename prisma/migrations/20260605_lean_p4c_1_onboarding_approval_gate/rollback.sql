-- LEAN-P4c-1 rollback — drops the onboarding-approval-gate fields.
-- See REVERSIBLE.md for safety contract.

DROP INDEX IF EXISTS "ProjectPosition_onboardingApprovedByPerson_idx";

ALTER TABLE "ProjectPosition"
  DROP CONSTRAINT IF EXISTS "ProjectPosition_onboardingApprovedByPerson_fkey";

ALTER TABLE "ProjectPosition"
  DROP COLUMN IF EXISTS "onboardingApprovedByPersonId";

ALTER TABLE "ProjectPosition"
  DROP COLUMN IF EXISTS "onboardingApprovedAt";

ALTER TABLE "ProjectPosition"
  DROP COLUMN IF EXISTS "requiresOnboardingApproval";
