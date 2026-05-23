-- Sprint 2 / S2-1 — Lean staffing aggregate (expand phase).
--
-- Adds ProjectPosition + ProjectPositionCandidate + ProjectPositionFillHistory
-- alongside existing StaffingRequest / ProjectAssignment / Slate models. The new
-- aggregate collapses the legacy three-model pattern into one model whose
-- `fillStatus` carries the full lifecycle.
--
-- Backfill happens in S2-5; dual-write in S2-6; legacy drops in Sprint 5.
--
-- Idempotent per feedback-migrations-must-be-idempotent rule. FORWARD_ONLY
-- (DM-R-29) — additive only, no destructive changes.

-- =====================================================================
-- ENUMS
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE "ProjectPositionFillStatus" AS ENUM (
    'DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING',
    'ASSIGNED', 'ON_HOLD', 'RELEASED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectPositionCandidateDecision" AS ENUM (
    'PENDING', 'PICKED', 'DECLINED', 'AUTO_DECLINED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectPositionFillChangeType" AS ENUM (
    'DRAFTED', 'OPENED', 'PROPOSED', 'BOOKED', 'ONBOARDED',
    'ASSIGNED', 'HELD', 'RELEASED',
    'CANDIDATES_ADDED', 'CANDIDATE_PICKED', 'CANDIDATE_DECLINED',
    'RATE_PINNED', 'ALLOCATION_CHANGED', 'DATES_CHANGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- TABLE: ProjectPosition
-- =====================================================================

CREATE TABLE IF NOT EXISTS "ProjectPosition" (
  "id"                         UUID                              NOT NULL,
  "publicId"                   VARCHAR(32),
  "projectId"                  UUID                              NOT NULL,
  "workstreamId"               UUID,
  "role"                       TEXT                              NOT NULL,
  "skills"                     TEXT[]                            NOT NULL DEFAULT ARRAY[]::TEXT[],
  "summary"                    TEXT,
  "requiredAllocationPercent"  NUMERIC(5, 2)                     NOT NULL,
  "startDate"                  DATE                              NOT NULL,
  "endDate"                    DATE                              NOT NULL,
  "priority"                   "StaffingRequestPriority"         NOT NULL DEFAULT 'MEDIUM',
  "requestedByPersonId"        UUID,
  "fillStatus"                 "ProjectPositionFillStatus"       NOT NULL DEFAULT 'DRAFT',
  "activePersonId"             UUID,
  "activeAllocationPercent"    NUMERIC(5, 2),
  "activeValidFrom"            TIMESTAMP(3) WITH TIME ZONE,
  "activeValidTo"              TIMESTAMP(3) WITH TIME ZONE,
  "onboardingDate"             TIMESTAMP(3) WITH TIME ZONE,
  "notes"                      TEXT,
  "requiresDirectorApproval"   BOOLEAN                           NOT NULL DEFAULT false,
  "slaStage"                   "AssignmentSlaStage",
  "slaDueAt"                   TIMESTAMP(3) WITH TIME ZONE,
  "slaBreachedAt"              TIMESTAMP(3) WITH TIME ZONE,
  "slaWarnedAt50pct"           TIMESTAMP(3) WITH TIME ZONE,
  "slaWarnedAt75pct"           TIMESTAMP(3) WITH TIME ZONE,
  "appliedRateCardEntryId"     UUID,
  "effectiveBillRate"          NUMERIC(10, 2),
  "effectiveBillCurrency"      VARCHAR(3),
  "rejectionReason"            TEXT,
  "rejectionReasonCode"        TEXT,
  "cancellationReason"         TEXT,
  "onHoldReason"               TEXT,
  "onHoldCaseId"               UUID,
  "releaseReason"              TEXT,
  "version"                    INTEGER                           NOT NULL DEFAULT 1,
  "createdAt"                  TIMESTAMP(3) WITH TIME ZONE       NOT NULL DEFAULT now(),
  "updatedAt"                  TIMESTAMP(3) WITH TIME ZONE       NOT NULL,
  "createdByPersonId"          UUID,
  "updatedByPersonId"          UUID,
  "archivedAt"                 TIMESTAMP(3) WITH TIME ZONE,
  "tenantId"                   UUID,
  "legacyStaffingRequestId"    UUID,
  "legacyAssignmentId"         UUID,
  CONSTRAINT "ProjectPosition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectPosition_publicId_key" ON "ProjectPosition" ("publicId");

CREATE INDEX IF NOT EXISTS "ProjectPosition_projectId_fillStatus_idx" ON "ProjectPosition" ("projectId", "fillStatus");
CREATE INDEX IF NOT EXISTS "ProjectPosition_activePerson_window_idx" ON "ProjectPosition" ("activePersonId", "fillStatus", "activeValidFrom", "activeValidTo");
CREATE INDEX IF NOT EXISTS "ProjectPosition_fillStatus_priority_startDate_idx" ON "ProjectPosition" ("fillStatus", "priority", "startDate");
CREATE INDEX IF NOT EXISTS "ProjectPosition_slaStage_slaDueAt_idx" ON "ProjectPosition" ("slaStage", "slaDueAt");
CREATE INDEX IF NOT EXISTS "ProjectPosition_fillStatus_slaDueAt_idx" ON "ProjectPosition" ("fillStatus", "slaDueAt");
CREATE INDEX IF NOT EXISTS "ProjectPosition_tenantId_idx" ON "ProjectPosition" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProjectPosition_createdByPersonId_idx" ON "ProjectPosition" ("createdByPersonId");
CREATE INDEX IF NOT EXISTS "ProjectPosition_updatedByPersonId_idx" ON "ProjectPosition" ("updatedByPersonId");
CREATE INDEX IF NOT EXISTS "ProjectPosition_requestedByPersonId_idx" ON "ProjectPosition" ("requestedByPersonId");
CREATE INDEX IF NOT EXISTS "ProjectPosition_appliedRateCardEntryId_idx" ON "ProjectPosition" ("appliedRateCardEntryId");
CREATE INDEX IF NOT EXISTS "ProjectPosition_legacyStaffingRequestId_idx" ON "ProjectPosition" ("legacyStaffingRequestId");
CREATE INDEX IF NOT EXISTS "ProjectPosition_legacyAssignmentId_idx" ON "ProjectPosition" ("legacyAssignmentId");

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_activePersonId_fkey"
    FOREIGN KEY ("activePersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_requestedByPersonId_fkey"
    FOREIGN KEY ("requestedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_appliedRateCardEntryId_fkey"
    FOREIGN KEY ("appliedRateCardEntryId") REFERENCES "rate_card_entries"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- TABLE: ProjectPositionCandidate
-- =====================================================================

CREATE TABLE IF NOT EXISTS "ProjectPositionCandidate" (
  "id"                  UUID                                NOT NULL,
  "positionId"          UUID                                NOT NULL,
  "candidatePersonId"   UUID                                NOT NULL,
  "rank"                INTEGER                             NOT NULL,
  "matchScore"          NUMERIC(6, 3)                       NOT NULL,
  "availabilityPercent" NUMERIC(5, 2),
  "mismatchedSkills"    TEXT[]                              NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rationale"           TEXT,
  "decision"            "ProjectPositionCandidateDecision"  NOT NULL DEFAULT 'PENDING',
  "decidedAt"           TIMESTAMP(3) WITH TIME ZONE,
  "createdAt"           TIMESTAMP(3) WITH TIME ZONE         NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMP(3) WITH TIME ZONE         NOT NULL,
  "createdByPersonId"   UUID,
  "updatedByPersonId"   UUID,
  CONSTRAINT "ProjectPositionCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectPositionCandidate_positionId_candidatePersonId_key"
  ON "ProjectPositionCandidate" ("positionId", "candidatePersonId");

CREATE INDEX IF NOT EXISTS "ProjectPositionCandidate_positionId_rank_idx" ON "ProjectPositionCandidate" ("positionId", "rank");
CREATE INDEX IF NOT EXISTS "ProjectPositionCandidate_candidatePersonId_idx" ON "ProjectPositionCandidate" ("candidatePersonId");
CREATE INDEX IF NOT EXISTS "ProjectPositionCandidate_positionId_decision_idx" ON "ProjectPositionCandidate" ("positionId", "decision");
CREATE INDEX IF NOT EXISTS "ProjectPositionCandidate_createdByPersonId_idx" ON "ProjectPositionCandidate" ("createdByPersonId");
CREATE INDEX IF NOT EXISTS "ProjectPositionCandidate_updatedByPersonId_idx" ON "ProjectPositionCandidate" ("updatedByPersonId");

DO $$ BEGIN
  ALTER TABLE "ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "ProjectPosition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_candidatePersonId_fkey"
    FOREIGN KEY ("candidatePersonId") REFERENCES "Person"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- TABLE: ProjectPositionFillHistory
-- =====================================================================

CREATE TABLE IF NOT EXISTS "ProjectPositionFillHistory" (
  "id"                UUID                               NOT NULL,
  "positionId"        UUID                               NOT NULL,
  "changeType"        "ProjectPositionFillChangeType"    NOT NULL,
  "changedByPersonId" UUID,
  "changeReason"      TEXT,
  "previousPersonId"  UUID,
  "newPersonId"       UUID,
  "previousStatus"    "ProjectPositionFillStatus",
  "newStatus"         "ProjectPositionFillStatus",
  "previousSnapshot"  JSONB,
  "newSnapshot"       JSONB,
  "occurredAt"        TIMESTAMP(3) WITH TIME ZONE        NOT NULL DEFAULT now(),
  CONSTRAINT "ProjectPositionFillHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectPositionFillHistory_positionId_occurredAt_idx" ON "ProjectPositionFillHistory" ("positionId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ProjectPositionFillHistory_changedByPersonId_idx" ON "ProjectPositionFillHistory" ("changedByPersonId");
CREATE INDEX IF NOT EXISTS "ProjectPositionFillHistory_changeType_idx" ON "ProjectPositionFillHistory" ("changeType");

DO $$ BEGIN
  ALTER TABLE "ProjectPositionFillHistory"
    ADD CONSTRAINT "ProjectPositionFillHistory_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "ProjectPosition"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectPositionFillHistory"
    ADD CONSTRAINT "ProjectPositionFillHistory_changedByPersonId_fkey"
    FOREIGN KEY ("changedByPersonId") REFERENCES "Person"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
