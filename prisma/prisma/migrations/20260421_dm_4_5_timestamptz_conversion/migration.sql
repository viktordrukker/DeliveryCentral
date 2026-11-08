-- DM-4-5 — convert every `timestamp without time zone` column to
-- `timestamptz`.
--
-- Why: `timestamp without time zone` is a point-in-time that carries NO
-- offset information. Postgres interprets comparisons and arithmetic
-- against it using the session's `timezone` GUC. A single non-UTC
-- client mis-interpreted every row. `timestamptz` records the absolute
-- instant; every client rehydrates to its own local tz on read.
--
-- The conversion itself is the hazard: `ALTER COLUMN ... TYPE
-- timestamptz USING <col>` interprets the existing value against the
-- session timezone. A PST session would shift every historical
-- timestamp by -8 hours. DM-4-4 (runtime UTC gate) is the prerequisite;
-- we additionally SET TIMEZONE='UTC' inside this migration for
-- belt-and-braces.
--
-- Strategy: one DO block that iterates every column with
-- data_type='timestamp without time zone' in the public schema and
-- runs `ALTER COLUMN ... TYPE timestamptz USING <col> AT TIME ZONE
-- 'UTC'`. This makes the migration idempotent + self-cataloging — it
-- works for the concurrent-agent models too, which we don't enumerate
-- by hand.
--
-- `@db.Date` columns are `date` type, not `timestamp`, so they are NOT
-- affected.
--
-- Classification: FORWARD_ONLY. Reverting timestamptz → timestamp
-- without zone cannot preserve the recorded instant without knowing
-- what timezone each row "came from", which is exactly the ambiguity
-- we're eliminating. DM-R-3 snapshot is the recovery path if needed.

SET LOCAL TIMEZONE = 'UTC';

DO $$
DECLARE
  rec record;
  qualified text;
BEGIN
  FOR rec IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
    ORDER BY table_name, column_name
  LOOP
    qualified := format('%I.%I', rec.table_name, rec.column_name);
    RAISE NOTICE 'DM-4-5: converting % → timestamptz(3)', qualified;
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz(3) USING %I AT TIME ZONE ''UTC''',
      rec.table_name, rec.column_name, rec.column_name
    );
  END LOOP;
END
$$;
