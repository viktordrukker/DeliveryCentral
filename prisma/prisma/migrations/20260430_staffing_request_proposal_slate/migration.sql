-- Realign slate aggregate from ProjectAssignment to StaffingRequest.
-- The previous AssignmentProposalSlate / AssignmentProposalCandidate tables
-- have always been empty (the workflow forced placeholder personIds, so they
-- were never used in production data); drop them and rebuild against
-- staffing_requests where the slate semantically belongs.

-- Drop old slate tables (cascades the old FKs to ProjectAssignment + Person).
DROP TABLE IF EXISTS "AssignmentProposalCandidate";
DROP TABLE IF EXISTS "AssignmentProposalSlate";

-- Drop old enums.
DROP TYPE IF EXISTS "AssignmentProposalCandidateDecision";
DROP TYPE IF EXISTS "AssignmentProposalSlateStatus";

-- New enums.
CREATE TYPE "StaffingRequestProposalSlateStatus" AS ENUM ('OPEN', 'DECIDED', 'EXPIRED', 'WITHDRAWN');
CREATE TYPE "StaffingRequestProposalCandidateDecision" AS ENUM ('PENDING', 'PICKED', 'DECLINED', 'AUTO_DECLINED');

-- Optional candidatePersonId on the request: PM may flag "candidate is known"
-- at create time, which seeds rank #1 in the RM-built slate.
ALTER TABLE "staffing_requests"
  ADD COLUMN "candidatePersonId" UUID;

-- StaffingRequestProposalSlate: one open slate per request.
-- staffingRequestId is TEXT because staffing_requests.id is TEXT (legacy String pk).
CREATE TABLE "StaffingRequestProposalSlate" (
    "id" UUID NOT NULL,
    "staffingRequestId" TEXT NOT NULL,
    "proposedByPersonId" UUID NOT NULL,
    "status" "StaffingRequestProposalSlateStatus" NOT NULL DEFAULT 'OPEN',
    "proposedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "StaffingRequestProposalSlate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffingRequestProposalSlate_staffingRequestId_key"
  ON "StaffingRequestProposalSlate"("staffingRequestId");
CREATE INDEX "StaffingRequestProposalSlate_staffingRequestId_idx"
  ON "StaffingRequestProposalSlate"("staffingRequestId");
CREATE INDEX "StaffingRequestProposalSlate_status_proposedAt_idx"
  ON "StaffingRequestProposalSlate"(status, "proposedAt");
CREATE INDEX "StaffingRequestProposalSlate_proposedByPersonId_idx"
  ON "StaffingRequestProposalSlate"("proposedByPersonId");

-- StaffingRequestProposalCandidate.
CREATE TABLE "StaffingRequestProposalCandidate" (
    "id" UUID NOT NULL,
    "slateId" UUID NOT NULL,
    "candidatePersonId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "matchScore" DECIMAL(6,3) NOT NULL,
    "availabilityPercent" DECIMAL(5,2),
    "mismatchedSkills" TEXT[],
    "rationale" TEXT,
    "decision" "StaffingRequestProposalCandidateDecision" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "StaffingRequestProposalCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffingRequestProposalCandidate_slateId_candidatePersonId_key"
  ON "StaffingRequestProposalCandidate"("slateId", "candidatePersonId");
CREATE INDEX "StaffingRequestProposalCandidate_slateId_rank_idx"
  ON "StaffingRequestProposalCandidate"("slateId", "rank");
CREATE INDEX "StaffingRequestProposalCandidate_candidatePersonId_idx"
  ON "StaffingRequestProposalCandidate"("candidatePersonId");
CREATE INDEX "StaffingRequestProposalCandidate_slateId_decision_idx"
  ON "StaffingRequestProposalCandidate"("slateId", decision);

-- Single-pick guard: at most one PICKED candidate per slate.
CREATE UNIQUE INDEX "StaffingRequestProposalCandidate_slateId_picked_unique"
  ON "StaffingRequestProposalCandidate"("slateId")
  WHERE decision = 'PICKED';

-- Foreign keys.
ALTER TABLE "StaffingRequestProposalSlate"
  ADD CONSTRAINT "StaffingRequestProposalSlate_staffingRequestId_fkey"
    FOREIGN KEY ("staffingRequestId") REFERENCES "staffing_requests"(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffingRequestProposalSlate"
  ADD CONSTRAINT "StaffingRequestProposalSlate_proposedByPersonId_fkey"
    FOREIGN KEY ("proposedByPersonId") REFERENCES "Person"(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffingRequestProposalCandidate"
  ADD CONSTRAINT "StaffingRequestProposalCandidate_slateId_fkey"
    FOREIGN KEY ("slateId") REFERENCES "StaffingRequestProposalSlate"(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffingRequestProposalCandidate"
  ADD CONSTRAINT "StaffingRequestProposalCandidate_candidatePersonId_fkey"
    FOREIGN KEY ("candidatePersonId") REFERENCES "Person"(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
