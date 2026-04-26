-- DM-R-31b — switch honeypot guard from RAISE to log-only.
--
-- DM-R-31 originally RAISEd EXCEPTION on tripwire to abort the write.
-- Problem: the RAISE rolls back the transaction AND the honeypot_alerts
-- INSERT, so the forensic trail disappears for the very access we care
-- about.
--
-- DM-R-31b redefines the guard function to record-and-notify without
-- RAISE. The sentinel rows carry no production data; the alert
-- (durable) + pg_notify (real-time) is the product.
--
-- Classification: REVERSIBLE (rollback restores the RAISE behaviour).

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
    PERFORM pg_notify('dm_r_31_honeypot_tripped',
      json_build_object(
        'table', TG_TABLE_NAME,
        'rowId', OLD.id,
        'op', TG_OP,
        'sessionUser', session_user,
        'applicationName', current_setting('application_name', true)
      )::text
    );
    RAISE WARNING 'DM-R-31: % on honeypot row % in % detected — honeypot_alerts row inserted.',
      TG_OP, OLD.id, TG_TABLE_NAME;
  END IF;

  RETURN OLD;
END
$fn$;
