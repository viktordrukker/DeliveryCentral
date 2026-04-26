-- DM-R-23 — mass-mutation circuit breaker.
--
-- A single UPDATE or DELETE statement touching more than a threshold
-- number of rows on a guarded table raises and rolls back. Catches:
--
--   - `DELETE FROM "Person"` with forgotten WHERE → 3 deletes instead
--      of 3 million
--   - Runaway migration that does bulk updates by accident
--   - Hostile agent riding the backend
--
-- Threshold: 1000 rows per statement, per guarded table.
--
-- Bypass (legitimate bulk work in a migration):
--   BEGIN;
--   SET LOCAL public.allow_bulk = 'true';
--   DELETE FROM "Person" WHERE …;  -- 50k rows, allowed
--   COMMIT;
-- (or SET inside a Prisma $transaction callback)
--
-- Implementation: AFTER UPDATE/DELETE statement trigger with OLD TABLE
-- transition reference. RAISE EXCEPTION rolls back the transaction,
-- undoing the mutation. (BEFORE triggers cannot use OLD TABLE in PG.)
--
-- Guarded tables: core runtime aggregates. Audit tables already have
-- DELETE/UPDATE revoked from app_runtime via DM-R-20.
--
-- Classification: REVERSIBLE.

CREATE OR REPLACE FUNCTION "dm_r_23_mass_mutation_guard"() RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  affected bigint;
  threshold int := COALESCE(NULLIF(current_setting('public.mass_mutation_threshold', true), '')::int, 1000);
  allow_bulk text;
BEGIN
  allow_bulk := current_setting('public.allow_bulk', true);
  IF allow_bulk = 'true' THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    EXECUTE 'SELECT count(*) FROM dm_r_23_deleted' INTO affected;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE 'SELECT count(*) FROM dm_r_23_updated' INTO affected;
  ELSE
    RETURN NULL;
  END IF;

  IF affected > threshold THEN
    RAISE EXCEPTION
      'DM-R-23: % on % would affect % rows (threshold %). Bypass: SET LOCAL public.allow_bulk = ''true''',
      TG_OP, TG_TABLE_NAME, affected, threshold
      USING ERRCODE = '42501';
  END IF;

  RETURN NULL;
END
$fn$;

-- Install on the core runtime aggregates. One pair of triggers per
-- table (one DELETE, one UPDATE) because transition tables require
-- event-specific REFERENCING clauses.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'Person', 'Project', 'ProjectAssignment', 'CaseRecord',
    'timesheet_weeks', 'timesheet_entries',
    'WorkEvidence', 'LocalAccount', 'staffing_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_23_delete_guard" ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER "dm_r_23_delete_guard"
         AFTER DELETE ON %I
         REFERENCING OLD TABLE AS dm_r_23_deleted
         FOR EACH STATEMENT EXECUTE FUNCTION "dm_r_23_mass_mutation_guard"()',
      t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_23_update_guard" ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER "dm_r_23_update_guard"
         AFTER UPDATE ON %I
         REFERENCING OLD TABLE AS dm_r_23_updated
         FOR EACH STATEMENT EXECUTE FUNCTION "dm_r_23_mass_mutation_guard"()',
      t
    );
  END LOOP;
END
$$;

COMMENT ON FUNCTION "dm_r_23_mass_mutation_guard"() IS
  'DM-R-23 — rolls back any UPDATE/DELETE touching more than public.mass_mutation_threshold (default 1000) rows. Bypass via SET LOCAL public.allow_bulk = ''true''.';
