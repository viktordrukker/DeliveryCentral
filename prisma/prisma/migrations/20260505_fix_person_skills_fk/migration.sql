-- Add FK from person_skills.personId → Person.id, retyping the column to uuid.
-- Historically the column was plain text with no FK, which let orphan rows
-- accumulate (e.g. retired demo-dataset personIds). The matcher then surfaced
-- those orphans as candidates and slate-submit failed at the
-- StaffingRequestProposalCandidate FK with an opaque 500.
--
-- Idempotent per project rule: every migration must use IF EXISTS / IF NOT
-- EXISTS / DO-EXCEPTION wraps so partial reruns are safe.

-- 1) Drop any orphan rows so the cast in step 2 cannot fail.
DELETE FROM person_skills
WHERE "personId" NOT IN (SELECT id::text FROM "Person");

-- 2) Cast column type text → uuid (only if not already uuid).
DO $$
BEGIN
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'person_skills' AND column_name = 'personId'
  ) = 'text' THEN
    ALTER TABLE person_skills
      ALTER COLUMN "personId" TYPE uuid USING "personId"::uuid;
  END IF;
END
$$;

-- 3) Add the FK if it isn't already there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'person_skills_personId_fkey'
      AND conrelid = 'person_skills'::regclass
  ) THEN
    ALTER TABLE person_skills
      ADD CONSTRAINT "person_skills_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
