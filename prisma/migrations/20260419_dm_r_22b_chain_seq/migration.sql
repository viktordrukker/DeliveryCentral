-- DM-R-22b — hash chain sequence fix.
--
-- DM-R-22 ordered the chain by (timestamp, id) but `id uuid DEFAULT
-- gen_random_uuid()` is not monotonic — rows inserted in the same
-- transaction (same timestamp) get random uuids, so the write-order
-- and the (timestamp,id)-order diverge. A verifier reading ascending
-- sees prevHash pointers that don't match because they point to a
-- differently-ordered previous row.
--
-- Fix: add a BIGSERIAL `chainSeq` column per audit table. Sequence
-- advances strictly monotonically regardless of transaction timing.
-- Trigger reads the LATEST prev by max chainSeq; verifier iterates
-- by chainSeq ASC.
--
-- Rebuilds every existing hash using the corrected ordering.
--
-- Classification: REVERSIBLE.

ALTER TABLE "AuditLog"        ADD COLUMN IF NOT EXISTS "chainSeq" BIGSERIAL;
ALTER TABLE "migration_audit" ADD COLUMN IF NOT EXISTS "chainSeq" BIGSERIAL;
ALTER TABLE "ddl_audit"       ADD COLUMN IF NOT EXISTS "chainSeq" BIGSERIAL;

-- Replace the trigger function to use chainSeq.
CREATE OR REPLACE FUNCTION "dm_r_22_audit_hash_chain"() RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  prev text;
  new_json jsonb;
BEGIN
  EXECUTE format(
    'SELECT "rowHash" FROM %I ORDER BY "chainSeq" DESC LIMIT 1',
    TG_TABLE_NAME
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

-- Rebuild hash chains top-to-bottom by chainSeq.
DO $rebuild$
DECLARE
  r record;
  prev text;
  new_json jsonb;
  tname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['AuditLog','migration_audit','ddl_audit']
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER "dm_r_22_hash_chain_trigger"', tname);
    prev := NULL;
    FOR r IN EXECUTE format('SELECT id, "chainSeq" FROM %I ORDER BY "chainSeq" ASC', tname)
    LOOP
      EXECUTE format(
        'SELECT to_jsonb(x) - ''prevHash'' - ''rowHash'' FROM %I x WHERE id = $1',
        tname
      ) INTO new_json USING r.id;
      EXECUTE format(
        'UPDATE %I SET "prevHash" = $1, "rowHash" = $2 WHERE id = $3',
        tname
      ) USING prev, encode(sha256(convert_to(COALESCE(prev,'') || '|' || new_json::text, 'UTF8')), 'hex'), r.id;
      SELECT encode(sha256(convert_to(COALESCE(prev,'') || '|' || new_json::text, 'UTF8')), 'hex') INTO prev;
    END LOOP;
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER "dm_r_22_hash_chain_trigger"', tname);
  END LOOP;
END
$rebuild$;
