-- DM-7.5-7 — Skill becomes tenant-scoped.
--
-- The default dev tenant inherits the 25 existing skills. Multi-tenant
-- deployments can then curate per-tenant skill dictionaries without
-- colliding on Skill.name.
--
-- Swap the global unique constraint `(name)` for `(tenantId, name)`.
-- Same uniqueness semantic per-tenant; cross-tenant duplicates allowed.
--
-- Classification: REVERSIBLE.

-- Add tenantId + FK + index.
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "tenantId" uuid;
UPDATE "skills" SET "tenantId" = '00000000-0000-0000-0000-00000000dc01' WHERE "tenantId" IS NULL;
CREATE INDEX IF NOT EXISTS "skills_tenantId_idx" ON "skills" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skills_tenantId_fkey') THEN
    ALTER TABLE "skills" ADD CONSTRAINT "skills_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id)
      ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
    ALTER TABLE "skills" VALIDATE CONSTRAINT "skills_tenantId_fkey";
  END IF;
END
$$;

-- Replace unique(name) → unique(tenantId, name).
DROP INDEX IF EXISTS "skills_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "skills_tenantId_name_key"
  ON "skills" ("tenantId", "name");
