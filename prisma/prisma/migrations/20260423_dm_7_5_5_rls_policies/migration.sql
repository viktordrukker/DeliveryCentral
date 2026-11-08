-- DM-7.5-5 — tenant-isolation RLS policies.
--
-- Policies are CREATED but RLS is NOT yet enabled on the tables. That
-- way the policy definitions ship in release N; operators enable RLS
-- per-table in release N+1 once the tenant resolver (DM-7.5-4) is
-- live and every session calls `SET LOCAL app.current_tenant_id`.
--
-- Without the resolver, enabling RLS blocks every read because
-- `current_setting('app.current_tenant_id', true)` returns NULL and
-- the USING expression evaluates to `tenantId = NULL` → false.
--
-- Cutover (release N+1, per-table):
--   ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "Person" FORCE ROW LEVEL SECURITY;   -- denies table-owner bypass
--
-- The `app_platform_admin` role has BYPASSRLS; it sees all tenants.
-- All other roles respect the policy.
--
-- Classification: REVERSIBLE.

-- Function to read the current session's tenant scope. Returns NULL
-- if unset — in combination with the policies below, a NULL means
-- "see nothing" (safer than "see everything").
CREATE OR REPLACE FUNCTION "dm_r_current_tenant"() RETURNS uuid
LANGUAGE plpgsql STABLE
AS $fn$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END
$fn$;

-- Install SELECT/INSERT/UPDATE/DELETE tenant-isolation policy on every
-- tenant-bearing table. Policy name is `<table>_tenant_isolation`.
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I
         USING ("tenantId" = "dm_r_current_tenant"())
         WITH CHECK ("tenantId" = "dm_r_current_tenant"())',
      t || '_tenant_isolation', t
    );
  END LOOP;
END
$$;

-- DomainEvent — partitioned; policies attach to the default partition.
DROP POLICY IF EXISTS "DomainEvent_tenant_isolation" ON "DomainEvent";
CREATE POLICY "DomainEvent_tenant_isolation" ON "DomainEvent"
  USING ("tenantId" = "dm_r_current_tenant"())
  WITH CHECK ("tenantId" = "dm_r_current_tenant"());

-- Safety — platform roles see all tenants.
-- app_platform_admin already has BYPASSRLS (DM-8-4). Nothing more to do here.

COMMENT ON FUNCTION "dm_r_current_tenant"() IS
  'DM-7.5-5 — reads app.current_tenant_id session GUC; returns NULL if unset. NULL means "see nothing" in the tenant policies.';
