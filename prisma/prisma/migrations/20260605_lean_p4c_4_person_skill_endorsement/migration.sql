-- LEAN-P4c-4 — PersonSkill endorsement-by-manager fields.
--
-- LEAN-P4d-4 (PR #516) introduced `selfEndorsed=true` for skills an employee
-- self-adds from the /me workspace. Managers (HR/director/admin) now need to
-- confirm/promote those rows from the unified /approvals queue. To track the
-- decision, this migration adds:
--
--   - `endorsedByPersonId` — uuid FK to Person.id. NULL = not yet endorsed.
--   - `endorsedAt`         — timestamptz of the decision. NULL = not yet
--                            endorsed.
--
-- A "pending endorsement" row is therefore:
--   selfEndorsed = TRUE AND endorsedByPersonId IS NULL
--
-- Approve flips `endorsedByPersonId` and `endorsedAt`; reject deletes the row.
-- The columns are additive and nullable so legacy rows keep their semantics
-- (existing manager-recorded rows have selfEndorsed=FALSE and skip the
-- queue entirely).
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent.
-- REVERSIBLE (DM-R-4) — see REVERSIBLE.md.

ALTER TABLE "person_skills"
  ADD COLUMN IF NOT EXISTS "endorsedByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "endorsedAt" TIMESTAMPTZ(3);

-- FK to Person; Prisma long-form name {Table}_{column}_fkey.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'person_skills_endorsedByPersonId_fkey'
  ) THEN
    ALTER TABLE "person_skills"
      ADD CONSTRAINT "person_skills_endorsedByPersonId_fkey"
      FOREIGN KEY ("endorsedByPersonId") REFERENCES "Person"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- Index for the queue lookup: fast filter on pending endorsements.
CREATE INDEX IF NOT EXISTS "person_skills_endorsedByPerson_idx"
  ON "person_skills" ("endorsedByPersonId");
