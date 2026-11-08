-- Rollback for 20260518_d109_onboarding_tour_fk_set_null.
--
-- Restores ON DELETE CASCADE + the NOT NULL constraint. Any rows
-- that became orphan (personId = NULL) after the forward migration
-- are deleted before the column is set back to NOT NULL — they have
-- no `Person` to belong to anyway.

DELETE FROM "onboarding_tour_progress" WHERE "personId" IS NULL;

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
  ALTER COLUMN "personId" SET NOT NULL;

ALTER TABLE "onboarding_tour_progress"
  ADD CONSTRAINT "onboarding_tour_progress_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
