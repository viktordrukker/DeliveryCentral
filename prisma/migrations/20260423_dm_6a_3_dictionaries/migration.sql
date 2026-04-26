-- DM-6a-3 — dictionary-backed reference data.
--
-- Replace free-form strings on Person (grade, role, location) and
-- Project (domain, projectType) with FK-able dictionary tables. Values
-- remain as scalar strings on the aggregate for one release (per
-- two-release contract in DMD-022); DM-6b drops the scalars after
-- callers switch to the FKs.
--
-- Each dictionary is per-tenant (tenantId FK), code-keyed (stable),
-- with a human-readable label + optional description.
--
-- Classification: REVERSIBLE.

-- ==============================================================
CREATE TABLE IF NOT EXISTS "grades" (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  uuid         NOT NULL,
  code        text         NOT NULL,
  label       text         NOT NULL,
  description text,
  "sortOrder" integer      NOT NULL DEFAULT 0,
  "archivedAt" timestamptz,
  "createdAt" timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", code),
  CONSTRAINT "grades_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "grades_tenantId_archivedAt_idx" ON "grades" ("tenantId", "archivedAt");

CREATE TABLE IF NOT EXISTS "job_roles" (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  uuid         NOT NULL,
  code        text         NOT NULL,
  label       text         NOT NULL,
  description text,
  "archivedAt" timestamptz,
  "createdAt" timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", code),
  CONSTRAINT "job_roles_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "job_roles_tenantId_archivedAt_idx" ON "job_roles" ("tenantId", "archivedAt");

CREATE TABLE IF NOT EXISTS "locations" (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"   uuid         NOT NULL,
  code         text         NOT NULL,
  label        text         NOT NULL,
  "countryCode" varchar(2),
  timezone     text,
  "archivedAt" timestamptz,
  "createdAt"  timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt"  timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", code),
  CONSTRAINT "locations_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "locations_tenantId_archivedAt_idx" ON "locations" ("tenantId", "archivedAt");

CREATE TABLE IF NOT EXISTS "project_domains" (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  uuid         NOT NULL,
  code        text         NOT NULL,
  label       text         NOT NULL,
  description text,
  "archivedAt" timestamptz,
  "createdAt" timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", code),
  CONSTRAINT "project_domains_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "project_domains_tenantId_archivedAt_idx" ON "project_domains" ("tenantId", "archivedAt");

CREATE TABLE IF NOT EXISTS "project_types" (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  uuid         NOT NULL,
  code        text         NOT NULL,
  label       text         NOT NULL,
  description text,
  "archivedAt" timestamptz,
  "createdAt" timestamptz  NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", code),
  CONSTRAINT "project_types_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "project_types_tenantId_archivedAt_idx" ON "project_types" ("tenantId", "archivedAt");

-- ==============================================================
-- Add FK columns on Person + Project. Nullable; string scalars stay
-- for one release per DMD-022.
ALTER TABLE "Person"  ADD COLUMN IF NOT EXISTS "gradeId"    uuid REFERENCES "grades"(id)      ON DELETE SET NULL;
ALTER TABLE "Person"  ADD COLUMN IF NOT EXISTS "jobRoleId"  uuid REFERENCES "job_roles"(id)   ON DELETE SET NULL;
ALTER TABLE "Person"  ADD COLUMN IF NOT EXISTS "locationId" uuid REFERENCES "locations"(id)   ON DELETE SET NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "domainId"   uuid REFERENCES "project_domains"(id) ON DELETE SET NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectTypeId" uuid REFERENCES "project_types"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Person_gradeId_idx"      ON "Person" ("gradeId");
CREATE INDEX IF NOT EXISTS "Person_jobRoleId_idx"    ON "Person" ("jobRoleId");
CREATE INDEX IF NOT EXISTS "Person_locationId_idx"   ON "Person" ("locationId");
CREATE INDEX IF NOT EXISTS "Project_domainId_idx"    ON "Project" ("domainId");
CREATE INDEX IF NOT EXISTS "Project_projectTypeId_idx" ON "Project" ("projectTypeId");
