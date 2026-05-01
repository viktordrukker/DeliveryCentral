-- Workflow Overhaul Phase 1: assignment slate models, IN_REVIEW state, SLA fields
-- Companion plan: /home/drukker/.claude/plans/this-is-a-pure-idempotent-cray.md (§A, §B)
--
-- DM-R-11 (2026-05-01): every statement made idempotent so that a partial
-- failure (e.g. an earlier prod deploy that left this migration in
-- `_prisma_migrations` with finished_at = NULL) can be unblocked by the
-- workflow's auto-resolve step + a re-run; whatever already landed is
-- skipped, the rest applies.

-- CreateEnum
DO $$ BEGIN CREATE TYPE "AssignmentSlaStage" AS ENUM ('PROPOSAL', 'REVIEW', 'APPROVAL', 'RM_FINALIZE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "AssignmentProposalSlateStatus" AS ENUM ('OPEN', 'DECIDED', 'EXPIRED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "AssignmentProposalCandidateDecision" AS ENUM ('PENDING', 'PICKED', 'DECLINED', 'AUTO_DECLINED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterEnum: insert IN_REVIEW between PROPOSED and REJECTED
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW' AFTER 'PROPOSED';

-- AlterTable: ProjectAssignment additive fields
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "onboardingDate"           TIMESTAMPTZ(3);
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "rejectionReasonCode"      TEXT;
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "requiresDirectorApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "slaStage"                 "AssignmentSlaStage";
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "slaDueAt"                 TIMESTAMPTZ(3);
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "slaBreachedAt"            TIMESTAMPTZ(3);

-- CreateIndex on slaStage / slaDueAt for indexed queue queries
CREATE INDEX IF NOT EXISTS "ProjectAssignment_slaStage_slaDueAt_idx" ON "ProjectAssignment"("slaStage", "slaDueAt");
CREATE INDEX IF NOT EXISTS "ProjectAssignment_status_slaDueAt_idx"   ON "ProjectAssignment"("status", "slaDueAt");

-- CreateTable AssignmentProposalSlate
CREATE TABLE IF NOT EXISTS "AssignmentProposalSlate" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "proposedByPersonId" UUID NOT NULL,
    "status" "AssignmentProposalSlateStatus" NOT NULL DEFAULT 'OPEN',
    "proposedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssignmentProposalSlate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentProposalSlate_assignmentId_key" ON "AssignmentProposalSlate"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssignmentProposalSlate_assignmentId_idx" ON "AssignmentProposalSlate"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssignmentProposalSlate_status_proposedAt_idx" ON "AssignmentProposalSlate"("status", "proposedAt");
CREATE INDEX IF NOT EXISTS "AssignmentProposalSlate_proposedByPersonId_idx" ON "AssignmentProposalSlate"("proposedByPersonId");

-- CreateTable AssignmentProposalCandidate
CREATE TABLE IF NOT EXISTS "AssignmentProposalCandidate" (
    "id" UUID NOT NULL,
    "slateId" UUID NOT NULL,
    "candidatePersonId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "matchScore" DECIMAL(6,3) NOT NULL,
    "availabilityPercent" DECIMAL(5,2),
    "mismatchedSkills" TEXT[],
    "rationale" TEXT,
    "decision" "AssignmentProposalCandidateDecision" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssignmentProposalCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentProposalCandidate_slateId_candidatePersonId_key" ON "AssignmentProposalCandidate"("slateId", "candidatePersonId");
CREATE INDEX IF NOT EXISTS "AssignmentProposalCandidate_slateId_rank_idx" ON "AssignmentProposalCandidate"("slateId", "rank");
CREATE INDEX IF NOT EXISTS "AssignmentProposalCandidate_candidatePersonId_idx" ON "AssignmentProposalCandidate"("candidatePersonId");
CREATE INDEX IF NOT EXISTS "AssignmentProposalCandidate_slateId_decision_idx" ON "AssignmentProposalCandidate"("slateId", "decision");

-- Partial unique index: at most one PICKED candidate per slate
CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentProposalCandidate_slateId_picked_unique"
  ON "AssignmentProposalCandidate"("slateId")
  WHERE "decision" = 'PICKED';

-- AddForeignKey — wrap each in DO duplicate_object so re-runs are quiet.
DO $$ BEGIN
  ALTER TABLE "AssignmentProposalSlate" ADD CONSTRAINT "AssignmentProposalSlate_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AssignmentProposalSlate" ADD CONSTRAINT "AssignmentProposalSlate_proposedByPersonId_fkey"
    FOREIGN KEY ("proposedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AssignmentProposalCandidate" ADD CONSTRAINT "AssignmentProposalCandidate_slateId_fkey"
    FOREIGN KEY ("slateId") REFERENCES "AssignmentProposalSlate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AssignmentProposalCandidate" ADD CONSTRAINT "AssignmentProposalCandidate_candidatePersonId_fkey"
    FOREIGN KEY ("candidatePersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
