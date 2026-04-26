-- DM-R-22b rollback — drop chainSeq columns and restore prior trigger behavior.

-- Restore the prior (timestamp-ordered) trigger body. Note: this re-
-- introduces the ordering fragility that DM-R-22b exists to fix.
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

ALTER TABLE "ddl_audit"       DROP COLUMN IF EXISTS "chainSeq";
ALTER TABLE "migration_audit" DROP COLUMN IF EXISTS "chainSeq";
ALTER TABLE "AuditLog"        DROP COLUMN IF EXISTS "chainSeq";
