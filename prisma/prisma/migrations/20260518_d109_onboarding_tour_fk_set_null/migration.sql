-- F-20 / D-109 — onboarding_tour_progress.personId FK action
-- Cascade → SetNull. Audit-adjacent analytics (which tours each
-- person completed) should survive person deletion; the cascade
-- destroys the signal needed to evaluate onboarding effectiveness.
--
-- Reversible: rollback restores ON DELETE CASCADE + sets the
-- column back to NOT NULL after deleting any orphan rows.

-- 1. Allow the column to hold NULL (required for SET NULL semantics).
ALTER TABLE "onboarding_tour_progress"
  ALTER COLUMN "personId" DROP NOT NULL;

-- 2. Drop the existing FK (CASCADE) and recreate it as SET NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'onboarding_tour_progress_personId_fkey'
  ) THEN
    ALTER TABLE "onboarding_tour_progress"
      DROP CONSTRAINT "onboarding_tour_progress_personId_fkey";
  END IF;
END $$;

ALTER TABLE "onboarding_tour_progress"
  ADD CONSTRAINT "onboarding_tour_progress_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
