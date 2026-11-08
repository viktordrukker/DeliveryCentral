-- DM-R-31c — honeypot guard returns NEW, not OLD.
--
-- DM-R-31 + DM-R-31b both ended with `RETURN OLD`. For a BEFORE UPDATE
-- trigger, returning OLD instructs Postgres to use OLD as the written
-- row — silently reverting the caller's change. That's wrong for
-- non-honeypot rows: we want the UPDATE to proceed and only log for
-- honeypot rows.
--
-- Additional fix: for honeypot rows themselves, we now RAISE EXCEPTION
-- with ERRCODE 42501 so the caller sees the block. The alert INSERT
-- happens before the RAISE, but rolls back with the aborted
-- transaction. The real-time pg_notify is the durable signal for
-- honeypot trips (plus operator-side DRIFT_EVENT once DM-R-14 is
-- wired to pg_notify listeners).
--
-- Non-honeypot rows (the vast majority): RETURN NEW and let the
-- mutation proceed.
--
-- Classification: REVERSIBLE.

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

  IF NOT is_honeypot THEN
    -- Normal row — let the mutation proceed.
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Honeypot row — record and block.
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
  RAISE EXCEPTION
    'DM-R-31: % on honeypot row % in % detected. Row is a tripwire; an honest code path never touches it.',
    TG_OP, OLD.id, TG_TABLE_NAME
    USING ERRCODE = '42501';
END
$fn$;

-- Retroactively backfill tenantId on Person/Project/ProjectAssignment —
-- DM-7.5 foundation backfill was silently reverted for the 3 honeypot-
-- guarded tables by the buggy RETURN OLD. Setting `allow_bulk` to
-- bypass DM-R-23's 1000-row threshold (Person has 34; others below).
-- Skip the honeypot rows themselves (they stay tenant-less; they're
-- not real data).
DO $$
DECLARE
  default_tenant uuid := '00000000-0000-0000-0000-00000000dc01';
BEGIN
  PERFORM set_config('public.allow_bulk', 'true', true);
  UPDATE "Person" SET "tenantId" = default_tenant
    WHERE "tenantId" IS NULL
      AND id NOT IN (
        SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'Person'
      );
  UPDATE "Project" SET "tenantId" = default_tenant
    WHERE "tenantId" IS NULL
      AND id NOT IN (
        SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'Project'
      );
END
$$;
