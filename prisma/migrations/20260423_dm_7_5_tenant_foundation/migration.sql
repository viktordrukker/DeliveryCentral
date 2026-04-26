-- DM-7.5-1 + 7.5-2 — Tenant model + `tenantId` on 15 aggregate roots.
--
-- Step 1: create the `Tenant` table + seed a default tenant.
-- Step 2: add `tenantId uuid` (nullable) to every tenant-sensitive
-- aggregate root. Backfill every existing row to the default tenant.
-- FK to Tenant(id) with `onDelete: Restrict` (never silently drop a
-- tenant's data).
--
-- NOT NULL flip + unique-constraint review + RLS policies are
-- separate follow-ups (DM-7.5-3/5/6). The additive column + backfill
-- is safe to ship alone — every row gets the default tenant, and
-- code that doesn't yet know about tenantId keeps working.
--
-- Tenant-sensitive aggregate roots (15): Person, OrgUnit, Project,
-- Client, Vendor, LocalAccount, CaseRecord, InAppNotification,
-- DomainEvent, AuditLog, OutboxEvent, LeaveRequest, StaffingRequest,
-- TimesheetWeek, WorkEvidence.
--
-- Classification: REVERSIBLE.

-- ==================================================== Tenant table
CREATE TABLE IF NOT EXISTS "Tenant" (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text         NOT NULL UNIQUE,
  name         text         NOT NULL,
  "isActive"   boolean      NOT NULL DEFAULT true,
  "suspendedAt" timestamptz,
  "createdAt"  timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt"  timestamptz  NOT NULL DEFAULT NOW()
);

-- Seed the default tenant. Well-known UUID so fixtures + tests can
-- reference it stably.
INSERT INTO "Tenant" (id, code, name)
VALUES ('00000000-0000-0000-0000-00000000dc01', 'default', 'DeliveryCentral (default tenant)')
ON CONFLICT (id) DO NOTHING;

-- ==================================== add tenantId + backfill + FK
DO $$
DECLARE
  tname text;
  default_tenant uuid := '00000000-0000-0000-0000-00000000dc01';
  tenant_tables text[] := ARRAY[
    'Person', 'OrgUnit', 'Project', 'clients', 'vendors',
    'LocalAccount', 'CaseRecord', 'in_app_notifications',
    'DomainEvent', 'AuditLog', 'OutboxEvent',
    'leave_requests', 'staffing_requests', 'timesheet_weeks',
    'WorkEvidence'
  ];
BEGIN
  FOREACH tname IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "tenantId" uuid', tname);
    EXECUTE format('UPDATE %I SET "tenantId" = $1 WHERE "tenantId" IS NULL', tname) USING default_tenant;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("tenantId")', tname || '_tenantId_idx', tname);
  END LOOP;
END
$$;

-- FK constraints. Declared as `NOT VALID` to avoid a blocking scan on
-- large tables; immediately VALIDATED here because dev-scale = fast.
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fkname) THEN
      -- Partitioned tables (DomainEvent) do not support NOT VALID FK
      -- in PG16. Add the FK immediately-valid for partitioned tables,
      -- NOT VALID + VALIDATE for everyone else.
      IF tname = 'DomainEvent' THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
          tname, fkname
        );
      ELSE
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID',
          tname, fkname
        );
        EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', tname, fkname);
      END IF;
    END IF;
  END LOOP;
END
$$;

COMMENT ON TABLE "Tenant" IS
  'DM-7.5 — multi-tenant container. Every tenant-sensitive aggregate root carries tenantId. A NULL tenantId on those tables is a bug; DM-7.5-3 flips NOT NULL once all writers declare it.';
