-- DM-7.5-1/2 rollback.

DO $$
DECLARE
  tname text;
  tenant_tables text[] := ARRAY[
    'Person', 'OrgUnit', 'Project', 'clients', 'vendors',
    'LocalAccount', 'CaseRecord', 'in_app_notifications',
    'DomainEvent', 'AuditLog', 'OutboxEvent',
    'leave_requests', 'staffing_requests', 'timesheet_weeks',
    'WorkEvidence'
  ];
  fkname text;
BEGIN
  FOREACH tname IN ARRAY tenant_tables LOOP
    fkname := tname || '_tenantId_fkey';
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fkname) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tname, fkname);
    END IF;
    EXECUTE format('DROP INDEX IF EXISTS %I', tname || '_tenantId_idx');
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS "tenantId"', tname);
  END LOOP;
END
$$;

DROP TABLE IF EXISTS "Tenant";
