-- DM-R-31 rollback — drop triggers, function, tables, and sentinel rows.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Person','Project','ProjectAssignment']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_31_honeypot_delete" ON %I', t);
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_31_honeypot_update" ON %I', t);
  END LOOP;
END
$$;

DROP FUNCTION IF EXISTS "dm_r_31_honeypot_guard"();

-- Remove sentinel rows; DM-R-31 registry is what marks them untouchable,
-- so once the registry is dropped we can delete. Guard against the
-- DM-R-23 mass-mutation trigger by SET LOCAL.
SET LOCAL public.allow_bulk = 'true';
DELETE FROM "ProjectAssignment" WHERE id = '00000000-dead-beef-0000-000000000003';
DELETE FROM "Project"           WHERE id = '00000000-dead-beef-0000-000000000002';
DELETE FROM "Person"            WHERE id = '00000000-dead-beef-0000-000000000001';

DROP TABLE IF EXISTS "honeypot_alerts";
DROP TABLE IF EXISTS "honeypot";
