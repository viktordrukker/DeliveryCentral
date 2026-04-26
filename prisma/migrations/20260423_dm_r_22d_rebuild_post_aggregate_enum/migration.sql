-- DM-R-22d — rebuild hash chains after DM-7-6 aggregate-type enum
-- conversion.
--
-- Same class of drift as DM-R-22c (DM-4-5 timestamptz): converting
-- `aggregateType text → AggregateType enum` changed the `to_jsonb`
-- output for existing AuditLog + DomainEvent rows. Reuse the
-- DM-R-22b/22c rebuild idiom.
--
-- Ongoing discipline: every column type change to a hash-chain table
-- ships a companion chain-rebuild migration. Documented in schema-
-- conventions.md §22.
--
-- Classification: REVERSIBLE.

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
