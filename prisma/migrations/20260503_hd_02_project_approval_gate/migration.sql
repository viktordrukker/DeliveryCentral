-- HD-2: Project Director-approval gate.
--
-- Adds:
--   * `PENDING_APPROVAL` value to the `ProjectStatus` enum so a project
--     submitted for approval can carry a distinct status between DRAFT
--     and ACTIVE.
--   * `ProjectActivationDecision` enum (APPROVED / REJECTED) for the
--     decision row on every activation request.
--   * `project_activation_approvals` table — one row per submission;
--     populated when a PM submits a DRAFT for approval, mutated when a
--     Director approves or rejects. Mirrors the shape of `BudgetApproval`.
--
-- Idempotent per DM-R-11 norm: every operation guarded with IF NOT EXISTS
-- / DO duplicate_object so a partial earlier run is safe to re-apply.
--
-- Classification: REVERSIBLE.

-- ─── ProjectStatus.PENDING_APPROVAL ────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE "ProjectStatus" ADD VALUE 'PENDING_APPROVAL';
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ─── ProjectActivationDecision enum ───────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ProjectActivationDecision" AS ENUM (
    'APPROVED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ─── project_activation_approvals ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "project_activation_approvals" (
  "id"            uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "projectId"     uuid                       NOT NULL,
  "requestedAt"   timestamptz(3)             NOT NULL DEFAULT now(),
  "requestedById" uuid                       NOT NULL,
  "decidedAt"     timestamptz(3),
  "decidedById"   uuid,
  "decision"      "ProjectActivationDecision",
  "reason"        text,
  "tenantId"      uuid,
  CONSTRAINT "project_activation_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "project_activation_approvals_projectId_requestedAt_idx"
  ON "project_activation_approvals" ("projectId", "requestedAt");

CREATE INDEX IF NOT EXISTS "project_activation_approvals_decidedAt_idx"
  ON "project_activation_approvals" ("decidedAt");

CREATE INDEX IF NOT EXISTS "project_activation_approvals_tenantId_idx"
  ON "project_activation_approvals" ("tenantId");

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals"
    ADD CONSTRAINT "project_activation_approvals_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "project_activation_approvals"
    ADD CONSTRAINT "project_activation_approvals_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null; END $$;
