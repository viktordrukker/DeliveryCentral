-- DM-R-22 — append-only hash-chain audit.
--
-- Adds prevHash + rowHash to each audit table, plus a BEFORE INSERT
-- trigger that computes rowHash = sha256(prevHash || canonical row
-- payload). DM-R-20 already denies UPDATE/DELETE on these tables from
-- app_runtime; the hash chain makes tampering deterministically
-- detectable — recomputing the chain reveals the first broken link.
--
-- Covered tables: AuditLog, migration_audit, ddl_audit.
-- (Future: DomainEvent from DM-7.)
--
-- BEFORE INSERT keeps the chain in the same transaction as the row.
-- A rolled-back insert rolls back the hash; no orphan links.
--
-- Verification: scripts/verify-audit-hash-chain.cjs walks each table
-- and recomputes each row's hash; fails on the first mismatch.
--
-- Classification: REVERSIBLE.

-- ------------------------------------------------------ add hash columns
ALTER TABLE "AuditLog"        ADD COLUMN IF NOT EXISTS "prevHash" text;
ALTER TABLE "AuditLog"        ADD COLUMN IF NOT EXISTS "rowHash"  text;
ALTER TABLE "migration_audit" ADD COLUMN IF NOT EXISTS "prevHash" text;
ALTER TABLE "migration_audit" ADD COLUMN IF NOT EXISTS "rowHash"  text;
ALTER TABLE "ddl_audit"       ADD COLUMN IF NOT EXISTS "prevHash" text;
ALTER TABLE "ddl_audit"       ADD COLUMN IF NOT EXISTS "rowHash"  text;

-- ----------------------------------------------------- trigger function
-- Accepts one trigger argument — the name of the timestamp column used
-- to order the chain. Per-table so Postgres column resolution stays
-- honest (a COALESCE across non-existent columns plans-errors even via
-- EXECUTE format).
CREATE OR REPLACE FUNCTION "dm_r_22_audit_hash_chain"() RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  ts_col text := TG_ARGV[0];
  prev text;
  new_json jsonb;
BEGIN
  EXECUTE format(
    'SELECT "rowHash" FROM %I ORDER BY %I DESC, id DESC LIMIT 1',
    TG_TABLE_NAME, ts_col
  ) INTO prev;

  new_json := to_jsonb(NEW) - 'prevHash' - 'rowHash';

  NEW."prevHash" := prev;
  NEW."rowHash"  := encode(
    sha256(convert_to(COALESCE(prev, '') || '|' || new_json::text, 'UTF8')),
    'hex'
  );

  RETURN NEW;
END
$fn$;

-- ----------------------------------------------------- install triggers
DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "AuditLog";
CREATE TRIGGER "dm_r_22_hash_chain_trigger"
  BEFORE INSERT ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "dm_r_22_audit_hash_chain"('createdAt');

DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "migration_audit";
CREATE TRIGGER "dm_r_22_hash_chain_trigger"
  BEFORE INSERT ON "migration_audit"
  FOR EACH ROW EXECUTE FUNCTION "dm_r_22_audit_hash_chain"('recorded_at');

DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "ddl_audit";
CREATE TRIGGER "dm_r_22_hash_chain_trigger"
  BEFORE INSERT ON "ddl_audit"
  FOR EACH ROW EXECUTE FUNCTION "dm_r_22_audit_hash_chain"('occurred_at');

-- --------------------------------------------- backfill existing rows
-- For each covered table, walk rows in chronological order and populate
-- the hash chain. Trigger is disabled during backfill so the UPDATE
-- does not re-trigger.
DO $bf$
DECLARE
  r record;
  prev text;
  new_json jsonb;
  cfg record;
BEGIN
  FOR cfg IN
    SELECT unnest(ARRAY['AuditLog','migration_audit','ddl_audit']) AS tname,
           unnest(ARRAY['createdAt','recorded_at','occurred_at']) AS ts
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER "dm_r_22_hash_chain_trigger"', cfg.tname);
    prev := NULL;
    FOR r IN EXECUTE format(
      'SELECT id FROM %I ORDER BY %I ASC, id ASC',
      cfg.tname, cfg.ts
    )
    LOOP
      EXECUTE format(
        'SELECT to_jsonb(x) - ''prevHash'' - ''rowHash'' FROM %I x WHERE id = $1',
        cfg.tname
      ) INTO new_json USING r.id;
      EXECUTE format(
        'UPDATE %I SET "prevHash" = $1, "rowHash" = $2 WHERE id = $3',
        cfg.tname
      ) USING prev, encode(sha256(convert_to(COALESCE(prev,'') || '|' || new_json::text, 'UTF8')), 'hex'), r.id;
      SELECT encode(sha256(convert_to(COALESCE(prev,'') || '|' || new_json::text, 'UTF8')), 'hex') INTO prev;
    END LOOP;
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER "dm_r_22_hash_chain_trigger"', cfg.tname);
  END LOOP;
END
$bf$;

COMMENT ON FUNCTION "dm_r_22_audit_hash_chain"() IS
  'DM-R-22 — BEFORE INSERT hash chain for audit tables. Arg 1 = timestamp column name.';
