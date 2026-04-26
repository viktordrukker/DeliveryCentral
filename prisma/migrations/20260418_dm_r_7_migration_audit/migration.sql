-- DM-R-7 — agent-attributable migration audit.
-- Records who ran each migration: OS user, git author email, git SHA,
-- optional agent id, hostname, mode, applied migration names, success
-- flag. Populated by scripts/db-migrate-safe.sh via scripts/record-
-- migration-audit.sh AFTER every `prisma migrate {deploy,dev,reset}`.
--
-- Append-only by convention; DM-R-20 (Wave 4) will revoke UPDATE/DELETE
-- on this table for the runtime role. Hash-chain coupling lands in
-- DM-R-22.

CREATE TABLE IF NOT EXISTS "migration_audit" (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at    timestamptz  NOT NULL DEFAULT NOW(),
  migration_mode text         NOT NULL,          -- deploy | dev | reset | status
  migrations     text,                           -- comma-sep applied names
  os_user        text,                           -- $USER on the host
  git_email      text,                           -- git config user.email
  git_sha        text,                           -- git rev-parse HEAD
  agent_id       text,                           -- $AGENT_ID (DM-R-12/26)
  hostname       text,
  success        boolean      NOT NULL,
  notes          text
);

CREATE INDEX IF NOT EXISTS "migration_audit_recorded_at_idx"
  ON "migration_audit" (recorded_at DESC);

CREATE INDEX IF NOT EXISTS "migration_audit_agent_id_idx"
  ON "migration_audit" (agent_id)
  WHERE agent_id IS NOT NULL;

COMMENT ON TABLE "migration_audit" IS
  'DM-R-7 — append-only forensic trail: who ran each migration.';
