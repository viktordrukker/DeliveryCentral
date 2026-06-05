-- Rollback for LEAN-P4c-4. Drops the index, the FK, and the
-- endorsement audit columns added to `person_skills`. Approval audit
-- written after the forward migration will be lost; existing
-- `selfEndorsed` flags are unaffected.

DROP INDEX IF EXISTS "person_skills_endorsedByPerson_idx";

ALTER TABLE "person_skills"
  DROP CONSTRAINT IF EXISTS "person_skills_endorsedByPersonId_fkey";

ALTER TABLE "person_skills"
  DROP COLUMN IF EXISTS "endorsedAt",
  DROP COLUMN IF EXISTS "endorsedByPersonId";
