-- DM-R-21 — DDL event-trigger lockout + ddl_audit table.
--
-- Two event triggers on the live DB:
--
--   1. ddl_command_start — refuses DDL unless session_user is postgres or
--      app_migrator. Defense-in-depth for DM-R-20: even if grants drift
--      (a forgotten GRANT CREATE ON SCHEMA, a superuser-by-accident), a
--      mis-permissioned app_runtime session cannot push DDL through the
--      application layer.
--
--   2. ddl_command_end — logs every ACCEPTED DDL into ddl_audit, one
--      row per object change (commit-scoped: only committed DDL is
--      recorded). Retains session_user, current_user, application_name
--      (DM-R-26 agent provenance hook), command_tag, object_identity,
--      query text, timestamp.
--
-- Denied DDL is not recorded in ddl_audit (same-transaction INSERT would
-- roll back with the failed DDL). Denials surface via Postgres log + the
-- caller's exception.
--
-- Allowed sessions: postgres (break-glass DBA), app_migrator (the
-- migrate container, db-migrate-safe.sh). Anything else hits
-- ERRCODE 42501 insufficient_privilege.
--
-- Classification: REVERSIBLE.

-- -------------------------------------------------------------- table
CREATE TABLE IF NOT EXISTS "ddl_audit" (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at        timestamptz  NOT NULL DEFAULT NOW(),
  "sessionUser"      text         NOT NULL,
  "currentUser"      text         NOT NULL,
  "applicationName"  text,
  "commandTag"       text         NOT NULL,
  "objectType"       text,
  "objectIdentity"   text,
  query              text,
  "inFunction"       text
);

CREATE INDEX IF NOT EXISTS "ddl_audit_occurred_at_idx" ON "ddl_audit" (occurred_at DESC);
CREATE INDEX IF NOT EXISTS "ddl_audit_sessionUser_idx" ON "ddl_audit" ("sessionUser");

-- Append-only: DM-R-20 app_runtime cannot UPDATE/DELETE this table.
REVOKE UPDATE, DELETE ON "ddl_audit" FROM app_runtime;

COMMENT ON TABLE "ddl_audit" IS
  'DM-R-21 — append-only log of every accepted DDL event. Session denied by the lockout trigger is not recorded; Postgres log + caller exception is the forensic trail.';

-- ----------------------------------------------------- lockout function
-- Fires BEFORE each DDL (ddl_command_start). Raises on disallowed
-- session_user. NOT SECURITY DEFINER — we want the audit of the caller.
CREATE OR REPLACE FUNCTION "dm_r_21_ddl_lockout"() RETURNS event_trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_session text := session_user;
BEGIN
  IF v_session NOT IN ('postgres', 'app_migrator') THEN
    RAISE EXCEPTION 'DM-R-21: DDL denied for session_user=% (only app_migrator or postgres may issue DDL). Command=%', v_session, tg_tag
      USING ERRCODE = '42501';
  END IF;
END
$fn$;

-- ------------------------------------------------------ audit function
-- Fires AFTER each DDL (ddl_command_end). One row per command via
-- pg_event_trigger_ddl_commands(). SECURITY DEFINER so app_migrator
-- does not need direct INSERT on ddl_audit (it does, but future roles
-- may not).
CREATE OR REPLACE FUNCTION "dm_r_21_ddl_audit"() RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    INSERT INTO "ddl_audit" (
      "sessionUser", "currentUser", "applicationName",
      "commandTag", "objectType", "objectIdentity", query, "inFunction"
    ) VALUES (
      session_user, current_user, current_setting('application_name', true),
      r.command_tag, r.object_type, r.object_identity,
      current_query(), r.in_extension::text
    );
  END LOOP;
END
$fn$;

-- ------------------------------------------------------ drop-event audit
-- sql_drop is not covered by pg_event_trigger_ddl_commands(); use its
-- dedicated view pg_event_trigger_dropped_objects().
CREATE OR REPLACE FUNCTION "dm_r_21_sql_drop_audit"() RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    INSERT INTO "ddl_audit" (
      "sessionUser", "currentUser", "applicationName",
      "commandTag", "objectType", "objectIdentity", query, "inFunction"
    ) VALUES (
      session_user, current_user, current_setting('application_name', true),
      tg_tag, r.object_type, r.object_identity,
      current_query(), NULL
    );
  END LOOP;
END
$fn$;

-- ------------------------------------------------------- event triggers
DROP EVENT TRIGGER IF EXISTS "dm_r_21_ddl_lockout_trigger";
DROP EVENT TRIGGER IF EXISTS "dm_r_21_ddl_audit_trigger";
DROP EVENT TRIGGER IF EXISTS "dm_r_21_sql_drop_audit_trigger";

CREATE EVENT TRIGGER "dm_r_21_ddl_lockout_trigger"
  ON ddl_command_start
  EXECUTE FUNCTION "dm_r_21_ddl_lockout"();

CREATE EVENT TRIGGER "dm_r_21_ddl_audit_trigger"
  ON ddl_command_end
  EXECUTE FUNCTION "dm_r_21_ddl_audit"();

CREATE EVENT TRIGGER "dm_r_21_sql_drop_audit_trigger"
  ON sql_drop
  EXECUTE FUNCTION "dm_r_21_sql_drop_audit"();
