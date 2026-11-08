-- HD-5: PersonReleaseRequest dual-approval (per J3).
--
-- RM initiates a release → status PENDING_APPROVAL. HR Manager AND
-- Director both approve → status APPROVED. RM finalizes (separate
-- service in a follow-up phase) → status COMPLETED, Person.terminatedAt
-- set, in-flight ProjectAssignments cancelled.
--
-- Adds:
--   * `PersonReleaseStatus` enum.
--   * `ReleaseApprovalDecision` enum (APPROVED / REJECTED).
--   * `person_release_requests` table — one row per release submission.
--   * `person_release_approvals` table — one row per approver decision.
--     Unique on `(requestId, role)` so a single role can't decide twice.
--
-- Idempotent per DM-R-11 norm: every operation guarded with IF NOT EXISTS
-- / DO duplicate_object so a partial earlier run is safe to re-apply.
--
-- Classification: REVERSIBLE.

DO $$ BEGIN
  CREATE TYPE "PersonReleaseStatus" AS ENUM (
    'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReleaseApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "person_release_requests" (
  "id"                    uuid                  NOT NULL DEFAULT gen_random_uuid(),
  "personId"              uuid                  NOT NULL,
  "initiatedByPersonId"   uuid                  NOT NULL,
  "reason"                text                  NOT NULL,
  "reasonCode"            varchar(60),
  "targetTerminationDate" date                  NOT NULL,
  "status"                "PersonReleaseStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "cancelledAt"           timestamptz(3),
  "completedAt"           timestamptz(3),
  "createdAt"             timestamptz(3)        NOT NULL DEFAULT now(),
  "updatedAt"             timestamptz(3)        NOT NULL,
  "version"               integer               NOT NULL DEFAULT 1,
  "tenantId"              uuid,
  CONSTRAINT "person_release_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "person_release_requests_personId_status_idx"
  ON "person_release_requests" ("personId", "status");

CREATE INDEX IF NOT EXISTS "person_release_requests_status_targetTerminationDate_idx"
  ON "person_release_requests" ("status", "targetTerminationDate");

CREATE INDEX IF NOT EXISTS "person_release_requests_tenantId_idx"
  ON "person_release_requests" ("tenantId");

DO $$ BEGIN
  ALTER TABLE "person_release_requests"
    ADD CONSTRAINT "person_release_requests_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests"
    ADD CONSTRAINT "person_release_requests_initiatedByPersonId_fkey"
    FOREIGN KEY ("initiatedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_requests"
    ADD CONSTRAINT "person_release_requests_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null; END $$;


CREATE TABLE IF NOT EXISTS "person_release_approvals" (
  "id"            uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "requestId"     uuid                       NOT NULL,
  "role"          varchar(40)                NOT NULL,
  "actorPersonId" uuid                       NOT NULL,
  "decision"      "ReleaseApprovalDecision"  NOT NULL,
  "reason"        text,
  "decidedAt"     timestamptz(3)             NOT NULL DEFAULT now(),
  CONSTRAINT "person_release_approvals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "person_release_approvals_requestId_role_key"
  ON "person_release_approvals" ("requestId", "role");

CREATE INDEX IF NOT EXISTS "person_release_approvals_requestId_idx"
  ON "person_release_approvals" ("requestId");

CREATE INDEX IF NOT EXISTS "person_release_approvals_actorPersonId_idx"
  ON "person_release_approvals" ("actorPersonId");

DO $$ BEGIN
  ALTER TABLE "person_release_approvals"
    ADD CONSTRAINT "person_release_approvals_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "person_release_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "person_release_approvals"
    ADD CONSTRAINT "person_release_approvals_actorPersonId_fkey"
    FOREIGN KEY ("actorPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null; END $$;
