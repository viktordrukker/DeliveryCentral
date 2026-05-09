-- Reverse of 20260505_fix_person_skills_fk/migration.sql.
--
-- The orphan rows the forward step deleted cannot be restored — they had
-- a personId pointing at a non-existent Person, so even if we re-create
-- the rows the parent record never existed in the first place. The
-- "rollback" here only undoes the schema changes (FK + column type),
-- not the data deletion. Operators who need the orphan rows back must
-- restore from a pre-migration backup (e.g. /opt/backups/<env>-<date>.sql.gz).

-- 1) Drop the FK we added.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'person_skills_personId_fkey'
      AND conrelid = 'person_skills'::regclass
  ) THEN
    ALTER TABLE person_skills DROP CONSTRAINT "person_skills_personId_fkey";
  END IF;
END
$$;

-- 2) Cast column type uuid → text (only if currently uuid).
DO $$
BEGIN
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'person_skills' AND column_name = 'personId'
  ) = 'uuid' THEN
    ALTER TABLE person_skills
      ALTER COLUMN "personId" TYPE text USING "personId"::text;
  END IF;
END
$$;
