-- DM-R-22c — rebuild hash chains after DM-4-5 timestamptz conversion.
--
-- DM-4-5 converted every `timestamp without time zone` column to
-- `timestamptz(3)`. Postgres's `to_jsonb` emits a different string
-- for the same instant depending on the column type:
--     timestamp without tz → "2026-04-18T10:51:35.781"
--     timestamptz          → "2026-04-18T10:51:35.781+00:00"
--
-- Every hash computed BEFORE DM-4-5 landed no longer matches the
-- current payload serialization, even though the underlying instant
-- is unchanged. This migration rebuilds the chains for every row,
-- using the DM-R-22b chainSeq ordering and the current trigger
-- function.
--
-- Classification: REVERSIBLE (rollback = recompute again from
-- whatever current state is).

DO $rebuild$
DECLARE
  r record;
  prev text;
  new_json jsonb;
  tname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['AuditLog','migration_audit','ddl_audit','DomainEvent']
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
