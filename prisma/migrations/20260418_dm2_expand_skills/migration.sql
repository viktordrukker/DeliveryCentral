-- ============================================================================
-- DM-2 pilot — skills table · Release N (expand)
-- ============================================================================
-- First table in the DM-2 + DM-2.5 combined expand-contract cycle. Adds:
--   * id_new   uuid        — shadow PK; becomes the real PK in the contract step
--   * publicId varchar(32) — external opaque identifier (DMD-026 / §20)
--
-- Runbook: docs/planning/dm2-expand-contract-runbook.md
--
-- This migration is ADDITIVE ONLY — the existing TEXT `id` PK stays authoritative
-- for release N. The Prisma Client signature gains `idNew` + `publicId` as
-- additive optional fields; existing callers are unaffected.
--
-- Lock discipline:
--   SET LOCAL lock_timeout = '3s';
--   SET LOCAL statement_timeout = '30s';
-- The CREATE INDEX CONCURRENTLY statements are NOT inside this transaction
-- (Postgres forbids it); they run outside and are idempotent via IF NOT EXISTS.
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- 1. Shadow columns. Both populated on every new/updated row by the trigger below.
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "id_new"   uuid         DEFAULT gen_random_uuid();
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

-- 2. Backfill id_new for existing rows.
UPDATE "skills" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

-- 3. Backfill publicId using the fallback pattern (prefix + first 12 hex chars of id_new).
--    DM-2.5-2 will later regenerate these via the Sqids-based PublicIdService; this
--    initial value is valid, unique, and URL-safe. Existing rows never have their
--    publicId changed by the regenerator (publicIds are stable identifiers).
UPDATE "skills"
SET "publicId" = 'skl_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

-- 4. Assert the backfill completed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "skills" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for skills';
  END IF;
END $$;

-- 5. Dual-maintain trigger — keeps id_new + publicId populated for any inserts
--    that arrive via the old TEXT-id path before release N+1 flips callers.
CREATE OR REPLACE FUNCTION "skills_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'skl_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "skills_dm2_dualmaintain" ON "skills";
CREATE TRIGGER "skills_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "skills"
FOR EACH ROW EXECUTE FUNCTION "skills_dm2_dualmaintain"();

-- 6. Migration-self audit.
INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(),
  'Migration',
  gen_random_uuid(),
  'DM-2-Expand-skills',
  jsonb_build_object(
    'migration', '20260418_dm2_expand_skills',
    'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'skills_dm2_dualmaintain'
  ),
  NOW()
);

-- 7. Unique indexes — run OUTSIDE the transaction above because CREATE INDEX
--    CONCURRENTLY cannot be used in a transaction. Prisma applies migrations
--    in a single transaction by default; split into a separate migration file
--    or run via psql after apply. For the pilot and at current skills-table scale
--    (<100 rows in prod) we use plain CREATE UNIQUE INDEX IF NOT EXISTS which
--    briefly holds SHARE lock — acceptable given the row count.

CREATE UNIQUE INDEX IF NOT EXISTS "skills_id_new_key"   ON "skills" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "skills_publicId_key" ON "skills" ("publicId");
