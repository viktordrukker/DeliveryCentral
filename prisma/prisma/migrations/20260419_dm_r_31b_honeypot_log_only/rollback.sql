-- DM-R-31b rollback — restore the RAISE-EXCEPTION behaviour.

CREATE OR REPLACE FUNCTION "dm_r_31_honeypot_guard"() RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  is_honeypot boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "honeypot"
    WHERE "tableName" = TG_TABLE_NAME
      AND "rowId" = OLD.id
  ) INTO is_honeypot;

  IF is_honeypot THEN
    INSERT INTO "honeypot_alerts" (
      "tableName", "rowId", operation,
      "sessionUser", "currentUser", "applicationName", query
    ) VALUES (
      TG_TABLE_NAME, OLD.id, TG_OP,
      session_user, current_user, current_setting('application_name', true),
      current_query()
    );
    RAISE EXCEPTION 'DM-R-31: % on honeypot row % in % detected. Rolled back.',
      TG_OP, OLD.id, TG_TABLE_NAME USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END
$fn$;
