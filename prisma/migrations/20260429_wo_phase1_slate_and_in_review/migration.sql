-- Workflow Overhaul Phase 1: assignment slate models, IN_REVIEW state, SLA fields
-- Companion plan: /home/drukker/.claude/plans/this-is-a-pure-idempotent-cray.md (§A, §B)

-- CreateEnum
CREATE TYPE "AssignmentSlaStage" AS ENUM ('PROPOSAL', 'REVIEW', 'APPROVAL', 'RM_FINALIZE');

-- CreateEnum
CREATE TYPE "AssignmentProposalSlateStatus" AS ENUM ('OPEN', 'DECIDED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AssignmentProposalCandidateDecision" AS ENUM ('PENDING', 'PICKED', 'DECLINED', 'AUTO_DECLINED');

-- AlterEnum: insert IN_REVIEW between PROPOSED and REJECTED
ALTER TYPE "AssignmentStatus" ADD VALUE 'IN_REVIEW' AFTER 'PROPOSED';

-- AlterTable: ProjectAssignment additive fields
ALTER TABLE "ProjectAssignment"
  ADD COLUMN "onboardingDate" TIMESTAMPTZ(3),
  ADD COLUMN "rejectionReasonCode" TEXT,
  ADD COLUMN "requiresDirectorApproval" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "slaStage" "AssignmentSlaStage",
  ADD COLUMN "slaDueAt" TIMESTAMPTZ(3),
  ADD COLUMN "slaBreachedAt" TIMESTAMPTZ(3);

-- CreateIndex on slaStage / slaDueAt for indexed queue queries
CREATE INDEX "ProjectAssignment_slaStage_slaDueAt_idx" ON "ProjectAssignment"("slaStage", "slaDueAt");
CREATE INDEX "ProjectAssignment_status_slaDueAt_idx" ON "ProjectAssignment"("status", "slaDueAt");

-- CreateTable AssignmentProposalSlate
CREATE TABLE "AssignmentProposalSlate" (
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
CREATE UNIQUE INDEX "AssignmentProposalSlate_assignmentId_key" ON "AssignmentProposalSlate"("assignmentId");
CREATE INDEX "AssignmentProposalSlate_assignmentId_idx" ON "AssignmentProposalSlate"("assignmentId");
CREATE INDEX "AssignmentProposalSlate_status_proposedAt_idx" ON "AssignmentProposalSlate"("status", "proposedAt");
CREATE INDEX "AssignmentProposalSlate_proposedByPersonId_idx" ON "AssignmentProposalSlate"("proposedByPersonId");

-- CreateTable AssignmentProposalCandidate
CREATE TABLE "AssignmentProposalCandidate" (
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
CREATE UNIQUE INDEX "AssignmentProposalCandidate_slateId_candidatePersonId_key" ON "AssignmentProposalCandidate"("slateId", "candidatePersonId");
CREATE INDEX "AssignmentProposalCandidate_slateId_rank_idx" ON "AssignmentProposalCandidate"("slateId", "rank");
CREATE INDEX "AssignmentProposalCandidate_candidatePersonId_idx" ON "AssignmentProposalCandidate"("candidatePersonId");
CREATE INDEX "AssignmentProposalCandidate_slateId_decision_idx" ON "AssignmentProposalCandidate"("slateId", "decision");

-- Partial unique index: at most one PICKED candidate per slate
CREATE UNIQUE INDEX "AssignmentProposalCandidate_slateId_picked_unique"
  ON "AssignmentProposalCandidate"("slateId")
  WHERE "decision" = 'PICKED';

-- AddForeignKey
ALTER TABLE "AssignmentProposalSlate" ADD CONSTRAINT "AssignmentProposalSlate_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentProposalSlate" ADD CONSTRAINT "AssignmentProposalSlate_proposedByPersonId_fkey"
  FOREIGN KEY ("proposedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentProposalCandidate" ADD CONSTRAINT "AssignmentProposalCandidate_slateId_fkey"
  FOREIGN KEY ("slateId") REFERENCES "AssignmentProposalSlate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentProposalCandidate" ADD CONSTRAINT "AssignmentProposalCandidate_candidatePersonId_fkey"
  FOREIGN KEY ("candidatePersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
