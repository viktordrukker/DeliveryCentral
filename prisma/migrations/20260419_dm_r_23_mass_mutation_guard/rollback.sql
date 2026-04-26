-- DM-R-23 rollback — drop guard triggers + function.

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
    EXECUTE format('DROP TRIGGER IF EXISTS "dm_r_23_update_guard" ON %I', t);
  END LOOP;
END
$$;

DROP FUNCTION IF EXISTS "dm_r_23_mass_mutation_guard"();
