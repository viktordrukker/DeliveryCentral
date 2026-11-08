-- Reverse of 20260509_hd_reconcile_schema_drift/migration.sql.
--
-- Restores the column-level DEFAULTs and reverts the index rename.
-- The FK drop+re-add cycle was a normalisation; we don't reverse it
-- because Prisma will issue the canonical CREATE form on the next
-- migrate-deploy from this point.
--
-- Idempotent: every statement uses IF EXISTS / DO-EXCEPTION wraps.

-- Re-instate dropped DEFAULTs.
ALTER TABLE "help_articles"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

ALTER TABLE "help_feedback"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "help_tips"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

ALTER TABLE "idempotency_keys"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "onboarding_tour_progress"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

ALTER TABLE "person_release_approvals"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "person_release_requests"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "project_activation_approvals"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "rate_card_entries"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

ALTER TABLE "rate_cards"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

ALTER TABLE "responsibility_rules"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- Drop the new requestedBy/decidedBy FKs on project_activation_approvals.
DO $$ BEGIN
  ALTER TABLE "project_activation_approvals" DROP CONSTRAINT IF EXISTS "project_activation_approvals_requestedById_fkey";
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals" DROP CONSTRAINT IF EXISTS "project_activation_approvals_decidedById_fkey";
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Reverse the index rename.
DO $$ BEGIN
  ALTER INDEX "responsibility_rules_actionKind_scopeKind_isActive_priority_idx"
    RENAME TO "responsibility_rules_action_scope_active_priority_idx";
EXCEPTION WHEN undefined_object THEN NULL; END $$;
