-- HD-4 — ResponsibilityRule (J4). Configurable matrix governing
-- "who is responsible for action X in scope Y" with 4 resolution
-- modes (ROLE / PERSON / PM_SOLO / SKIP).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResponsibilityActionKind') THEN
    CREATE TYPE "ResponsibilityActionKind" AS ENUM (
      'PROJECT_ACTIVATION_APPROVAL',
      'BUDGET_CHANGE_APPROVAL',
      'ASSIGNMENT_DIRECTOR_APPROVAL',
      'ASSIGNMENT_OVERRIDE_APPROVAL',
      'PERSON_RELEASE_HR_APPROVAL',
      'PERSON_RELEASE_DIRECTOR_APPROVAL',
      'PROJECT_CLOSE_APPROVAL'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResponsibilityScope') THEN
    CREATE TYPE "ResponsibilityScope" AS ENUM (
      'TENANT',
      'ORG_UNIT',
      'CLIENT',
      'PROJECT',
      'PROJECT_TYPE',
      'THRESHOLD_AMOUNT',
      'ROLE_GRADE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResponsibilityResolutionMode') THEN
    CREATE TYPE "ResponsibilityResolutionMode" AS ENUM (
      'ROLE',
      'PERSON',
      'PM_SOLO',
      'SKIP'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "responsibility_rules" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "actionKind"      "ResponsibilityActionKind" NOT NULL,
  "scopeKind"       "ResponsibilityScope" NOT NULL,
  "scopeValue"      TEXT,
  "mode"            "ResponsibilityResolutionMode" NOT NULL,
  "targetRole"      TEXT,
  "targetPersonId"  UUID,
  "priority"        INTEGER NOT NULL DEFAULT 100,
  "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"           TEXT,
  "tenantId"        UUID,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"      TIMESTAMPTZ(3),
  CONSTRAINT "responsibility_rules_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'responsibility_rules_targetPersonId_fkey'
  ) THEN
    ALTER TABLE "responsibility_rules"
      ADD CONSTRAINT "responsibility_rules_targetPersonId_fkey"
      FOREIGN KEY ("targetPersonId") REFERENCES "Person"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'responsibility_rules_tenantId_fkey'
  ) THEN
    ALTER TABLE "responsibility_rules"
      ADD CONSTRAINT "responsibility_rules_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "responsibility_rules_action_scope_active_priority_idx"
  ON "responsibility_rules" ("actionKind", "scopeKind", "isActive", "priority");

CREATE INDEX IF NOT EXISTS "responsibility_rules_targetPersonId_idx"
  ON "responsibility_rules" ("targetPersonId");

CREATE INDEX IF NOT EXISTS "responsibility_rules_tenantId_idx"
  ON "responsibility_rules" ("tenantId");
