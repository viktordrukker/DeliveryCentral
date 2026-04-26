DROP POLICY IF EXISTS "DomainEvent_tenant_isolation" ON "DomainEvent";
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'Person', 'OrgUnit', 'Project', 'clients', 'vendors',
    'LocalAccount', 'CaseRecord', 'in_app_notifications',
    'AuditLog', 'OutboxEvent',
    'leave_requests', 'staffing_requests', 'timesheet_weeks',
    'WorkEvidence', 'ProjectAssignment', 'skills'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_tenant_isolation" ON %I', t, t);
  END LOOP;
END
$$;
DROP FUNCTION IF EXISTS "dm_r_current_tenant"();
