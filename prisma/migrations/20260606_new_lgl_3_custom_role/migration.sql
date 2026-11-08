-- NEW-LGL-3 — tenant-defined custom roles (Squad Lead, Tribe Lead, IT Service Owner, …).
--
-- Schema:
--   custom_roles (id, publicId, roleKey, displayName, description,
--                 inheritedRoles text[], isBuiltIn, deactivatedAt,
--                 createdAt, updatedAt, createdByPersonId, updatedByPersonId)
--
-- Indexes:
--   custom_roles_publicId_key (unique)         — DM-2.5 publicId egress
--   custom_roles_roleKey_key (unique)          — slug uniqueness
--   custom_roles_deactivatedAt_idx             — list active by tenant
--   custom_roles_createdByPersonId_idx         — D-103 actor-audit
--   custom_roles_updatedByPersonId_idx         — D-103 actor-audit
--
-- FKs:
--   custom_roles_createdByPersonId_fkey → Person(id) ON DELETE SET NULL
--   custom_roles_updatedByPersonId_fkey → Person(id) ON DELETE SET NULL
--
-- Idempotent (feedback-migrations-must-be-idempotent):
--   * CREATE TABLE / CREATE INDEX use IF NOT EXISTS.
--   * FK adds are wrapped in DO $$ … EXCEPTION blocks.
--
-- REVERSIBLE (DM-R-4). See REVERSIBLE.md.

CREATE TABLE IF NOT EXISTS "custom_roles" (
  "id"                UUID NOT NULL,
  "publicId"          VARCHAR(32),
  "roleKey"           VARCHAR(64) NOT NULL,
  "displayName"       VARCHAR(120) NOT NULL,
  "description"       TEXT,
  "inheritedRoles"    TEXT[] NOT NULL,
  "isBuiltIn"         BOOLEAN NOT NULL DEFAULT FALSE,
  "deactivatedAt"     TIMESTAMPTZ(3),
  "createdAt"         TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ(3) NOT NULL,
  "createdByPersonId" UUID,
  "updatedByPersonId" UUID,
  CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "custom_roles_publicId_key"
  ON "custom_roles" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "custom_roles_roleKey_key"
  ON "custom_roles" ("roleKey");

CREATE INDEX IF NOT EXISTS "custom_roles_deactivatedAt_idx"
  ON "custom_roles" ("deactivatedAt");

CREATE INDEX IF NOT EXISTS "custom_roles_createdByPersonId_idx"
  ON "custom_roles" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "custom_roles_updatedByPersonId_idx"
  ON "custom_roles" ("updatedByPersonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_roles_createdByPersonId_fkey'
  ) THEN
    ALTER TABLE "custom_roles"
      ADD CONSTRAINT "custom_roles_createdByPersonId_fkey"
      FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_roles_updatedByPersonId_fkey'
  ) THEN
    ALTER TABLE "custom_roles"
      ADD CONSTRAINT "custom_roles_updatedByPersonId_fkey"
      FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
