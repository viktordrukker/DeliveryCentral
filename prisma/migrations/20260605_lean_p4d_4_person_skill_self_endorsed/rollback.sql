-- Rollback for LEAN-P4d-4. Drops the `selfEndorsed` column added to
-- `person_skills`. Any values written after the forward migration will
-- be lost; legacy rows are unaffected because the column defaulted to
-- FALSE.

ALTER TABLE "person_skills" DROP COLUMN IF EXISTS "selfEndorsed";
