/**
 * Sprint 2 / S2-5 — backfill ProjectPosition + ProjectPositionCandidate +
 * ProjectPositionFillHistory from the legacy StaffingRequest +
 * ProjectAssignment + StaffingRequestProposalSlate +
 * StaffingRequestProposalCandidate tables.
 *
 * Idempotent: a second run is a no-op (skips ProjectPositions that already
 * have a legacy id set as provenance).
 *
 * Strategy:
 *  1) For every StaffingRequest → create one ProjectPosition.
 *     - Copy demand fields (role, skills, summary, allocation, dates, priority,
 *       requestedByPersonId).
 *     - Determine activeFill from ProjectAssignments linked via
 *       `staffingRequestId`. Pick the latest non-released assignment as the
 *       active fill (status BOOKED/ONBOARDING/ASSIGNED/ON_HOLD).
 *     - For each ProjectAssignment on this StaffingRequest, write a
 *       ProjectPositionFillHistory entry capturing the transition.
 *     - Copy proposalSlate candidates → ProjectPositionCandidate.
 *     - Set legacyStaffingRequestId for provenance.
 *
 *  2) For every ProjectAssignment WITHOUT a staffingRequestId → synthesize a
 *     ProjectPosition from the assignment's own fields.
 *     - Set legacyAssignmentId for provenance.
 *
 *  3) Report counts.
 *
 * Run:
 *   docker compose exec backend npx ts-node prisma/scripts/backfill-project-positions.ts
 *
 * Or against the it-company seed locally:
 *   DATABASE_URL=... npx ts-node prisma/scripts/backfill-project-positions.ts
 *
 * Environment:
 *   BACKFILL_DRY_RUN=true    — report what would happen, write nothing.
 *   BACKFILL_BATCH_SIZE=N    — default 100; max 500.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { mapLegacyAssignmentStatus } from '../../src/modules/project-positions/domain/value-objects/position-fill-status';

const prisma = new PrismaClient();
const DRY_RUN = process.env.BACKFILL_DRY_RUN === 'true';
const BATCH_SIZE = Math.min(
  Math.max(Number.parseInt(process.env.BACKFILL_BATCH_SIZE ?? '100', 10), 1),
  500,
);

interface BackfillCounters {
  staffingRequestsScanned: number;
  positionsCreated: number;
  positionsSkipped: number;
  orphanAssignmentsScanned: number;
  orphanPositionsCreated: number;
  candidatesCopied: number;
  fillHistoryRowsWritten: number;
}

function makeCounters(): BackfillCounters {
  return {
    staffingRequestsScanned: 0,
    positionsCreated: 0,
    positionsSkipped: 0,
    orphanAssignmentsScanned: 0,
    orphanPositionsCreated: 0,
    candidatesCopied: 0,
    fillHistoryRowsWritten: 0,
  };
}

const ACTIVE_LEGACY_STATUSES = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'];

function pickActiveAssignment(
  assignments: Array<{
    id: string;
    status: string;
    validFrom: Date;
    validTo: Date | null;
    requestedAt: Date;
  }>,
): typeof assignments[number] | undefined {
  // Prefer assignments in active legacy statuses, latest by validFrom.
  const active = assignments
    .filter((a) => ACTIVE_LEGACY_STATUSES.includes(a.status))
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
  if (active.length > 0) return active[0];
  // Otherwise pick the latest assignment overall (for history continuity).
  if (assignments.length > 0) {
    return [...assignments].sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())[0];
  }
  return undefined;
}

async function backfillFromStaffingRequest(
  request: Prisma.StaffingRequestGetPayload<{
    include: {
      assignments: true;
      proposalSlate: { include: { candidates: true } };
    };
  }>,
  counters: BackfillCounters,
): Promise<void> {
  counters.staffingRequestsScanned += 1;

  // Idempotency: if a ProjectPosition with this legacy id exists, skip.
  const existing = await prisma.projectPosition.findFirst({
    where: { legacyStaffingRequestId: request.idNew },
    select: { id: true },
  });
  if (existing) {
    counters.positionsSkipped += 1;
    return;
  }

  const activeAssignment = pickActiveAssignment(request.assignments);
  const fillStatus = activeAssignment
    ? mapLegacyAssignmentStatus(activeAssignment.status)
    : mapLegacyAssignmentStatus(request.status); // DRAFT/OPEN/IN_REVIEW/FULFILLED/CANCELLED

  const positionData: Prisma.ProjectPositionUncheckedCreateInput = {
    id: request.idNew, // Reuse the existing UUID for traceability.
    projectId: request.projectId,
    role: request.role,
    skills: request.skills,
    summary: request.summary,
    requiredAllocationPercent: request.allocationPercent.toString(),
    startDate: request.startDate,
    endDate: request.endDate,
    priority: request.priority,
    requestedByPersonId: request.requestedByPersonId,
    fillStatus,
    activePersonId: activeAssignment?.id ? request.assignments.find((a) => a.id === activeAssignment.id)?.personId : undefined,
    activeAllocationPercent: activeAssignment
      ? request.assignments.find((a) => a.id === activeAssignment.id)?.allocationPercent?.toString()
      : undefined,
    activeValidFrom: activeAssignment?.validFrom,
    activeValidTo: activeAssignment?.validTo,
    version: 1,
    legacyStaffingRequestId: request.idNew,
    createdByPersonId: request.createdByPersonId,
    updatedByPersonId: request.updatedByPersonId,
    tenantId: request.tenantId,
  };

  if (DRY_RUN) {
    counters.positionsCreated += 1;
    counters.candidatesCopied += request.proposalSlate?.candidates.length ?? 0;
    counters.fillHistoryRowsWritten += request.assignments.length;
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectPosition.create({ data: positionData });
    counters.positionsCreated += 1;

    // Copy candidates from the slate (if present).
    if (request.proposalSlate) {
      for (const cand of request.proposalSlate.candidates) {
        await tx.projectPositionCandidate.create({
          data: {
            positionId: positionData.id!,
            candidatePersonId: cand.candidatePersonId,
            rank: cand.rank,
            matchScore: cand.matchScore,
            availabilityPercent: cand.availabilityPercent ?? null,
            mismatchedSkills: cand.mismatchedSkills,
            rationale: cand.rationale,
            decision: cand.decision,
            decidedAt: cand.decidedAt,
            createdByPersonId: cand.createdByPersonId,
            updatedByPersonId: cand.updatedByPersonId,
          },
        });
        counters.candidatesCopied += 1;
      }
    }

    // Write a FillHistory entry for every legacy ProjectAssignment.
    for (const assignment of request.assignments) {
      const newStatus = mapLegacyAssignmentStatus(assignment.status);
      await tx.projectPositionFillHistory.create({
        data: {
          positionId: positionData.id!,
          changeType: 'PROPOSED', // Coarse label; finer event recovery would need AssignmentHistory replay.
          changedByPersonId: assignment.requestedByPersonId,
          changeReason: assignment.notes ?? assignment.rejectionReason ?? assignment.cancellationReason,
          newPersonId: assignment.personId,
          newStatus,
          newSnapshot: {
            legacyAssignmentId: assignment.id,
            legacyStatus: assignment.status,
            allocationPercent: assignment.allocationPercent?.toString(),
            validFrom: assignment.validFrom.toISOString(),
            validTo: assignment.validTo?.toISOString() ?? null,
          },
          occurredAt: assignment.requestedAt,
        },
      });
      counters.fillHistoryRowsWritten += 1;
    }
  });
}

async function backfillOrphanAssignment(
  assignment: Prisma.ProjectAssignmentGetPayload<{}>,
  counters: BackfillCounters,
): Promise<void> {
  counters.orphanAssignmentsScanned += 1;

  // Idempotency: skip if a ProjectPosition already references this assignment.
  const existing = await prisma.projectPosition.findFirst({
    where: { legacyAssignmentId: assignment.id },
    select: { id: true },
  });
  if (existing) {
    counters.positionsSkipped += 1;
    return;
  }

  const fillStatus = mapLegacyAssignmentStatus(assignment.status);
  const isActive = ACTIVE_LEGACY_STATUSES.includes(assignment.status);

  const positionData: Prisma.ProjectPositionUncheckedCreateInput = {
    projectId: assignment.projectId,
    role: assignment.staffingRole,
    skills: [],
    requiredAllocationPercent: (assignment.allocationPercent ?? 100).toString(),
    startDate: assignment.validFrom,
    endDate: assignment.validTo ?? new Date(assignment.validFrom.getTime() + 365 * 24 * 60 * 60 * 1000),
    priority: 'MEDIUM',
    requestedByPersonId: assignment.requestedByPersonId,
    fillStatus,
    activePersonId: isActive ? assignment.personId : undefined,
    activeAllocationPercent: isActive ? (assignment.allocationPercent?.toString() ?? '100') : undefined,
    activeValidFrom: isActive ? assignment.validFrom : undefined,
    activeValidTo: isActive ? assignment.validTo : undefined,
    onboardingDate: assignment.onboardingDate,
    notes: assignment.notes,
    rejectionReason: assignment.rejectionReason,
    rejectionReasonCode: assignment.rejectionReasonCode,
    cancellationReason: assignment.cancellationReason,
    onHoldReason: assignment.onHoldReason,
    onHoldCaseId: assignment.onHoldCaseId,
    releaseReason: !isActive ? (assignment.notes ?? assignment.cancellationReason) : undefined,
    requiresDirectorApproval: assignment.requiresDirectorApproval,
    slaStage: assignment.slaStage,
    slaDueAt: assignment.slaDueAt,
    slaBreachedAt: assignment.slaBreachedAt,
    slaWarnedAt50pct: assignment.slaWarnedAt50pct,
    slaWarnedAt75pct: assignment.slaWarnedAt75pct,
    appliedRateCardEntryId: assignment.appliedRateCardEntryId,
    effectiveBillRate: assignment.effectiveBillRate,
    effectiveBillCurrency: assignment.effectiveBillCurrency,
    version: 1,
    legacyAssignmentId: assignment.id,
    createdByPersonId: assignment.createdByPersonId,
    updatedByPersonId: assignment.updatedByPersonId,
    tenantId: assignment.tenantId,
  };

  if (DRY_RUN) {
    counters.orphanPositionsCreated += 1;
    counters.fillHistoryRowsWritten += 1;
    return;
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.projectPosition.create({ data: positionData });
    counters.orphanPositionsCreated += 1;
    await tx.projectPositionFillHistory.create({
      data: {
        positionId: created.id,
        changeType: 'PROPOSED',
        changedByPersonId: assignment.requestedByPersonId,
        changeReason: assignment.notes,
        newPersonId: assignment.personId,
        newStatus: fillStatus,
        newSnapshot: {
          legacyAssignmentId: assignment.id,
          legacyStatus: assignment.status,
          allocationPercent: assignment.allocationPercent?.toString(),
          validFrom: assignment.validFrom.toISOString(),
          validTo: assignment.validTo?.toISOString() ?? null,
          source: 'orphan-assignment',
        },
        occurredAt: assignment.requestedAt,
      },
    });
    counters.fillHistoryRowsWritten += 1;
  });
}

async function main(): Promise<void> {
  const counters = makeCounters();
  const start = Date.now();

  console.log(
    `🌱 Backfilling ProjectPosition from legacy data (dry_run=${DRY_RUN}, batch_size=${BATCH_SIZE})...`,
  );

  // 1) StaffingRequest-rooted positions.
  let cursor1: string | undefined;
  for (;;) {
    const batch: Prisma.StaffingRequestGetPayload<{
      include: {
        assignments: true;
        proposalSlate: { include: { candidates: true } };
      };
    }>[] = cursor1
      ? await prisma.staffingRequest.findMany({
          take: BATCH_SIZE,
          skip: 1,
          cursor: { id: cursor1 },
          orderBy: { id: 'asc' },
          include: {
            assignments: true,
            proposalSlate: { include: { candidates: true } },
          },
        })
      : await prisma.staffingRequest.findMany({
          take: BATCH_SIZE,
          orderBy: { id: 'asc' },
          include: {
            assignments: true,
            proposalSlate: { include: { candidates: true } },
          },
        });
    if (batch.length === 0) break;
    for (const req of batch) {
      try {
        await backfillFromStaffingRequest(req, counters);
      } catch (err) {
        console.error(`✗ StaffingRequest ${req.id} failed: ${(err as Error).message}`);
      }
    }
    cursor1 = batch[batch.length - 1].id;
  }

  // 2) Orphan ProjectAssignments (no staffingRequestId).
  let cursor2: string | undefined;
  for (;;) {
    const batch: Prisma.ProjectAssignmentGetPayload<Record<string, never>>[] = cursor2
      ? await prisma.projectAssignment.findMany({
          take: BATCH_SIZE,
          skip: 1,
          cursor: { id: cursor2 },
          where: { staffingRequestId: null },
          orderBy: { id: 'asc' },
        })
      : await prisma.projectAssignment.findMany({
          take: BATCH_SIZE,
          where: { staffingRequestId: null },
          orderBy: { id: 'asc' },
        });
    if (batch.length === 0) break;
    for (const a of batch) {
      try {
        await backfillOrphanAssignment(a, counters);
      } catch (err) {
        console.error(`✗ Orphan ProjectAssignment ${a.id} failed: ${(err as Error).message}`);
      }
    }
    cursor2 = batch[batch.length - 1].id;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log('');
  console.log('================================================================');
  console.log(`✓ Backfill complete in ${elapsed}s`);
  console.log(`  StaffingRequests scanned:    ${counters.staffingRequestsScanned}`);
  console.log(`  Positions created (from SR): ${counters.positionsCreated}`);
  console.log(`  Positions skipped (exist):   ${counters.positionsSkipped}`);
  console.log(`  Orphan assignments scanned:  ${counters.orphanAssignmentsScanned}`);
  console.log(`  Positions created (orphan):  ${counters.orphanPositionsCreated}`);
  console.log(`  Candidates copied:           ${counters.candidatesCopied}`);
  console.log(`  FillHistory rows written:    ${counters.fillHistoryRowsWritten}`);
  console.log('================================================================');
}

main()
  .catch((err) => {
    console.error('✗ Backfill aborted:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
