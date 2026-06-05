-- LEAN-P4c-1 — onboarding-stage approval gate.
--
-- Adds three fields to ProjectPosition tracking PM approval before a
-- position can transition ONBOARDING → ASSIGNED:
--
--   requiresOnboardingApproval  — default FALSE; when TRUE, the position's
--                                  paired assignment cannot move
--                                  ONBOARDING → ASSIGNED until approval is
--                                  recorded. Operators (PM) set this when
--                                  creating positions that need a formal
--                                  onboarding gate (security clearance,
--                                  bank client gates, etc).
--   onboardingApprovedAt        — timestamp the gate was approved.
--   onboardingApprovedByPersonId — actor who approved.
--
-- Idempotent — every column add uses IF NOT EXISTS so re-runs are no-ops.
-- Backwards-compatible — defaulting to FALSE preserves the existing
-- direct-to-ASSIGNED behaviour for positions without a gate.

ALTER TABLE "ProjectPosition"
  ADD COLUMN IF NOT EXISTS "requiresOnboardingApproval" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "ProjectPosition"
  ADD COLUMN IF NOT EXISTS "onboardingApprovedAt" TIMESTAMPTZ(3);

ALTER TABLE "ProjectPosition"
  ADD COLUMN IF NOT EXISTS "onboardingApprovedByPersonId" UUID;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_onboardingApprovedByPersonId_fkey"
    FOREIGN KEY ("onboardingApprovedByPersonId")
    REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectPosition_onboardingApprovedByPersonId_idx"
  ON "ProjectPosition" ("onboardingApprovedByPersonId");
