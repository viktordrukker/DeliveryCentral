-- NEW-LGL-3 rollback — drop the custom_roles table.

ALTER TABLE IF EXISTS "custom_roles"
  DROP CONSTRAINT IF EXISTS "custom_roles_createdByPersonId_fkey";

ALTER TABLE IF EXISTS "custom_roles"
  DROP CONSTRAINT IF EXISTS "custom_roles_updatedByPersonId_fkey";

DROP INDEX IF EXISTS "custom_roles_publicId_key";
DROP INDEX IF EXISTS "custom_roles_roleKey_key";
DROP INDEX IF EXISTS "custom_roles_deactivatedAt_idx";
DROP INDEX IF EXISTS "custom_roles_createdByPersonId_idx";
DROP INDEX IF EXISTS "custom_roles_updatedByPersonId_idx";

DROP TABLE IF EXISTS "custom_roles";
