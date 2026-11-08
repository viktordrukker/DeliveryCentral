-- DM-R-22d rollback — re-rebuild (idempotent).
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
