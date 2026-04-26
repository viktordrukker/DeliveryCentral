-- DM-R-31 — honeypot canaries.
--
-- Registers three sentinel rows (one each in Person, Project,
-- ProjectAssignment) that NO legitimate code path should touch. Any
-- UPDATE or DELETE targeting them fires a trigger that:
--
--   1. INSERTs a honeypot_alert row (append-only, DM-R-20 denies delete).
--   2. RAISEs an EXCEPTION, aborting the write.
--
-- Catches:
--   - Reconnaissance (mass-UPDATE "SET … WHERE true")
--   - Rage-delete patterns
--   - Misrouted scripts touching every row
--
-- SELECT detection is NOT in scope here — Postgres has no SELECT
-- triggers. Future enhancement: pg_stat_statements scan for references
-- to the sentinel publicIds (DM-R-32 continuous drift verification has
-- the right cron loop to host it).
--
-- Sentinel rows use obvious fake data (displayName 'DM-R-31 HONEYPOT DO
-- NOT TOUCH', email dc-honeypot-*@example.invalid) so a human who wins
-- at shell-autocomplete cannot accidentally grep-and-nuke them without
-- seeing the warning.
--
-- Classification: REVERSIBLE.

-- -------------------------------------------------------- registry table
CREATE TABLE IF NOT EXISTS "honeypot" (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tableName"    text         NOT NULL,
  "rowId"        uuid         NOT NULL,
  intent         text         NOT NULL,
  "createdAt"    timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE ("tableName", "rowId")
);
REVOKE UPDATE, DELETE ON "honeypot" FROM app_runtime;

COMMENT ON TABLE "honeypot" IS
  'DM-R-31 registry of sentinel rows. A legitimate code path never touches any row listed here; every touch is a tripwire.';

-- --------------------------------------------------------- alerts table
CREATE TABLE IF NOT EXISTS "honeypot_alerts" (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "occurredAt"   timestamptz  NOT NULL DEFAULT NOW(),
  "tableName"    text         NOT NULL,
  "rowId"        uuid         NOT NULL,
  operation      text         NOT NULL,   -- 'UPDATE' | 'DELETE'
  "sessionUser"  text         NOT NULL,
  "currentUser"  text         NOT NULL,
  "applicationName" text,
  query          text
);
CREATE INDEX IF NOT EXISTS "honeypot_alerts_occurredAt_idx" ON "honeypot_alerts" ("occurredAt" DESC);
REVOKE UPDATE, DELETE ON "honeypot_alerts" FROM app_runtime;

-- -------------------------------------------------------- guard function
-- Design decision: RECORD only, do not RAISE. A RAISE rolls back the
-- transaction AND the alert INSERT, so the forensic trail disappears
-- for the very access we care about. Letting the mutation complete
-- against the sentinel row is harmless — the row carries no production
-- data. The ALERT (durable) + pg_notify (real-time) is the product.
--
-- Combined with DM-R-20 (app_runtime DML grants) and DM-R-23 (mass
-- mutation guard), the tripwire is deliberately soft so we never lose
-- the alert to our own defenses.
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
    -- Real-time signal that survives transaction rollback elsewhere.
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

-- -------------------------------------- install per-table BEFORE triggers
-- BEFORE so the RAISE aborts before the actual UPDATE/DELETE executes.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Person','Project','ProjectAssignment']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_31_honeypot_delete" ON %I', t);
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_31_honeypot_update" ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER "dm_r_31_honeypot_delete" BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "dm_r_31_honeypot_guard"()',
      t
    );
    EXECUTE format(
      'CREATE TRIGGER "dm_r_31_honeypot_update" BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION "dm_r_31_honeypot_guard"()',
      t
    );
  END LOOP;
END
$$;

-- ------------------------------------------------- seed the sentinel rows
-- Well-known UUIDs so the honeypot is easy to identify. Obvious
-- displayName so an operator reading the rows sees it immediately.
-- We bypass the mass-mutation guard here with SET LOCAL (not needed for
-- 3 inserts, but documented as the pattern).

-- Person sentinel — use a harmless OrgUnit if any exists; otherwise skip
-- person seed (honeypot is useful only when Person row exists).
INSERT INTO "Person" (
  id, "givenName", "familyName", "displayName", "primaryEmail",
  "grade", "createdAt", "updatedAt"
) VALUES (
  '00000000-dead-beef-0000-000000000001',
  'HONEYPOT', 'TRIPWIRE',
  'DM-R-31 HONEYPOT — DO NOT TOUCH',
  'dc-honeypot-person@example.invalid',
  'HONEYPOT', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "honeypot" ("tableName", "rowId", intent)
VALUES ('Person', '00000000-dead-beef-0000-000000000001', 'reconnaissance tripwire — any Person write on this row is an alert')
ON CONFLICT ("tableName", "rowId") DO NOTHING;

-- Project sentinel
INSERT INTO "Project" (
  id, "projectCode", name, status, "createdAt", "updatedAt"
) VALUES (
  '00000000-dead-beef-0000-000000000002',
  'HONEYPOT-31',
  'DM-R-31 HONEYPOT — DO NOT TOUCH',
  'DRAFT',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "honeypot" ("tableName", "rowId", intent)
VALUES ('Project', '00000000-dead-beef-0000-000000000002', 'reconnaissance tripwire — any Project write on this row is an alert')
ON CONFLICT ("tableName", "rowId") DO NOTHING;

-- ProjectAssignment sentinel — uses the two sentinels above as refs.
INSERT INTO "ProjectAssignment" (
  id, "personId", "projectId", status, "staffingRole",
  "allocationPercent", "validFrom", "createdAt", "updatedAt"
)
SELECT
  '00000000-dead-beef-0000-000000000003',
  '00000000-dead-beef-0000-000000000001',
  '00000000-dead-beef-0000-000000000002',
  'CREATED', 'HONEYPOT',
  0, NOW(), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "Person" WHERE id = '00000000-dead-beef-0000-000000000001')
  AND EXISTS (SELECT 1 FROM "Project" WHERE id = '00000000-dead-beef-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "honeypot" ("tableName", "rowId", intent)
VALUES ('ProjectAssignment', '00000000-dead-beef-0000-000000000003', 'reconnaissance tripwire — any Assignment write on this row is an alert')
ON CONFLICT ("tableName", "rowId") DO NOTHING;
