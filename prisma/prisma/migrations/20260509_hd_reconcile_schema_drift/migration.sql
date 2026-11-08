-- Reconcile drift between the HD-* migrations and prisma/schema.prisma.
--
-- The HD migrations (20260503_hd_02 through 20260504_hd_10) created the
-- new tables with explicit `gen_random_uuid()` defaults and FK
-- constraints baked into the CREATE TABLE statement. Prisma's introspect
-- normalises FKs out of the CREATE TABLE block and into separate
-- ALTER TABLE statements; it also infers `@default(uuid())` as
-- application-side and so the corresponding column-level DEFAULT in
-- the migration shows as drift versus the schema.
--
-- This migration brings the DB into byte-exact alignment with
-- `prisma migrate diff --from-migrations --to-schema-datamodel` so
-- `npm run migrations:check`, the schema-drift CI gate, and the wizard's
-- preflight branch detector all agree the DB is `MIGRATIONS_OK`.
--
-- Every statement is idempotent (IF EXISTS / IF NOT EXISTS / DO-EXCEPTION
-- wraps) per the project rule. Re-running on a reconciled DB is a no-op.
--
-- Classification: REVERSIBLE (sibling rollback.sql restores the dropped
-- defaults / FKs).

-- ─── Drop FKs that the diff says shouldn't be there ────────────────────
DO $$ BEGIN
  ALTER TABLE "person_release_approvals" DROP CONSTRAINT IF EXISTS "person_release_approvals_actorPersonId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_approvals" DROP CONSTRAINT IF EXISTS "person_release_approvals_requestId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests" DROP CONSTRAINT IF EXISTS "person_release_requests_initiatedByPersonId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests" DROP CONSTRAINT IF EXISTS "person_release_requests_personId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests" DROP CONSTRAINT IF EXISTS "person_release_requests_tenantId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals" DROP CONSTRAINT IF EXISTS "project_activation_approvals_projectId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals" DROP CONSTRAINT IF EXISTS "project_activation_approvals_tenantId_fkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;


-- ─── Drop column-level DEFAULTs that prisma infers as app-generated ────
ALTER TABLE "help_articles"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "help_feedback"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "help_tips"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "idempotency_keys"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "onboarding_tour_progress"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "person_release_approvals"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "person_release_requests"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "project_activation_approvals"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "rate_card_entries"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "rate_cards"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "responsibility_rules"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;


-- ─── Re-add FKs in the canonical "ALTER TABLE ADD CONSTRAINT" form ─────
DO $$ BEGIN
  ALTER TABLE "person_release_requests"
    ADD CONSTRAINT "person_release_requests_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests"
    ADD CONSTRAINT "person_release_requests_initiatedByPersonId_fkey"
    FOREIGN KEY ("initiatedByPersonId") REFERENCES "Person"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests"
    ADD CONSTRAINT "person_release_requests_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_approvals"
    ADD CONSTRAINT "person_release_approvals_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "person_release_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_approvals"
    ADD CONSTRAINT "person_release_approvals_actorPersonId_fkey"
    FOREIGN KEY ("actorPersonId") REFERENCES "Person"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals"
    ADD CONSTRAINT "project_activation_approvals_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals"
    ADD CONSTRAINT "project_activation_approvals_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "Person"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals"
    ADD CONSTRAINT "project_activation_approvals_decidedById_fkey"
    FOREIGN KEY ("decidedById") REFERENCES "Person"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals"
    ADD CONSTRAINT "project_activation_approvals_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── Rename the responsibility_rules index to match Prisma's convention ─
DO $$ BEGIN
  ALTER INDEX "responsibility_rules_action_scope_active_priority_idx"
    RENAME TO "responsibility_rules_actionKind_scopeKind_isActive_priority_idx";
EXCEPTION WHEN undefined_object THEN NULL; END $$;
