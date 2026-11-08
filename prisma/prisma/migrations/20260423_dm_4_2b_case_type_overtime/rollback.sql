-- DM-4-2b rollback — remove OVERTIME_EXCEPTION from CaseTypeKey.
--
-- Postgres cannot DROP a single enum value directly. The canonical
-- dance: rename old type away → create new type with the reduced
-- values → convert column → drop old type.
--
-- Guarded: refuses to run if any row uses OVERTIME_EXCEPTION.

DO $$
DECLARE
  usage_count int;
BEGIN
  SELECT count(*) INTO usage_count FROM "CaseType" WHERE "key"::text = 'OVERTIME_EXCEPTION';
  IF usage_count > 0 THEN
    RAISE EXCEPTION 'DM-4-2b rollback refused: % CaseType row(s) still use OVERTIME_EXCEPTION. Reassign first.', usage_count;
  END IF;
END
$$;

-- ALLOW_SINGLE_STEP_ENUM: rollback path — not a forward rename, does
-- not trigger DM-R-6's single-step-rename concern (the rollback runs
-- manually only when explicitly needed).
ALTER TYPE "CaseTypeKey" RENAME TO "CaseTypeKey_old";
CREATE TYPE "CaseTypeKey" AS ENUM ('OFFBOARDING', 'ONBOARDING', 'PERFORMANCE', 'TRANSFER');
ALTER TABLE "CaseType"
  ALTER COLUMN "key" TYPE "CaseTypeKey"
  USING "key"::text::"CaseTypeKey";
DROP TYPE "CaseTypeKey_old";
