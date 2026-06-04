import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { StaffingProposalSlateService } from '@src/modules/staffing-requests/application/staffing-proposal-slate.service';
import { StaffingRequestProposalCandidate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-candidate.entity';
import { StaffingRequestProposalSlate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-slate.entity';
import { StaffingRequestProposalSlateRepositoryPort } from '@src/modules/staffing-requests/domain/repositories/staffing-request-proposal-slate-repository.port';
import { PrismaService } from '@src/shared/persistence/prisma.service';

// LEAN-P1-8 — the slate service must write to BOTH the legacy slate path
// (via slateRepository.save) AND the lean ProjectPositionCandidate +
// ProjectPositionFillHistory aggregate while reads still come from legacy.
// The lookup key is `ProjectPosition.legacyStaffingRequestId`; identity for
// each candidate row uses `legacyCandidateId` to keep the cross-table mapping
// stable across the Phase-2 swap.

const STAFFING_REQUEST_ID = '11111111-1111-4000-8000-000000000001';
const SLATE_ID = '22222222-2222-4000-8000-000000000002';
const CANDIDATE_A_ID = '33333333-3333-4000-8000-000000000003';
const CANDIDATE_B_ID = '33333333-3333-4000-8000-000000000004';
const POSITION_ID = '55555555-5555-4000-8000-000000000005';
const ASSIGNMENT_ID = '44444444-4444-4000-8000-000000000006';

interface CandidateUpsertCall {
  positionId: string;
  candidatePersonId: string;
  rank: number;
  decision: string;
  legacyCandidateId: string | null | undefined;
  createPath: boolean;
}

interface FillHistoryCreateCall {
  positionId: string;
  changeType: string;
  changedByPersonId: string | null | undefined;
}

interface DualWriteCapture {
  candidateUpserts: CandidateUpsertCall[];
  fillHistoryCreates: FillHistoryCreateCall[];
  slateSaveCount: number;
}

function buildSlate(): StaffingRequestProposalSlate {
  const candidateA = StaffingRequestProposalCandidate.create(
    {
      slateId: SLATE_ID,
      candidatePersonId: 'person-a',
      matchScore: 0.95,
      mismatchedSkills: [],
      rank: 1,
    },
    CANDIDATE_A_ID,
  );
  const candidateB = StaffingRequestProposalCandidate.create(
    {
      slateId: SLATE_ID,
      candidatePersonId: 'person-b',
      matchScore: 0.85,
      mismatchedSkills: ['python'],
      rank: 2,
    },
    CANDIDATE_B_ID,
  );
  return StaffingRequestProposalSlate.create(
    {
      candidates: [candidateA, candidateB],
      staffingRequestId: STAFFING_REQUEST_ID,
      proposedByPersonId: 'rm-1',
      proposedAt: new Date('2026-05-01'),
    },
    SLATE_ID,
  );
}

function buildSlateRepo(initial: StaffingRequestProposalSlate): {
  repo: StaffingRequestProposalSlateRepositoryPort;
  capture: DualWriteCapture;
} {
  const capture: DualWriteCapture = {
    candidateUpserts: [],
    fillHistoryCreates: [],
    slateSaveCount: 0,
  };
  const repo = {
    findById: async (id: string) => (initial.id === id ? initial : null),
    findByStaffingRequestId: async (rid: string) =>
      initial.staffingRequestId === rid ? initial : null,
    save: async () => {
      capture.slateSaveCount += 1;
    },
  } as unknown as StaffingRequestProposalSlateRepositoryPort;
  return { repo, capture };
}

function buildPrismaWithMatchingPosition(capture: DualWriteCapture): PrismaService {
  // The tx stub is shared across all sites the service walks through;
  // capture upsert / history payloads so the test can assert dual-write
  // shape verbatim.
  const tx = {
    staffingRequest: {
      update: async () => ({ id: STAFFING_REQUEST_ID }),
    },
    projectPosition: {
      findMany: async () => [{ id: POSITION_ID, fillStatus: 'OPEN' }],
    },
    projectPositionCandidate: {
      upsert: async (args: {
        where: { positionId_candidatePersonId: { positionId: string; candidatePersonId: string } };
        create: { rank: number; decision: string; legacyCandidateId: string };
        update: { rank: number; decision: string; legacyCandidateId: string };
      }) => {
        // Branch detection is approximate but reliable for stubs: the create
        // path is the one the test exercises here (no pre-existing rows).
        capture.candidateUpserts.push({
          positionId: args.where.positionId_candidatePersonId.positionId,
          candidatePersonId: args.where.positionId_candidatePersonId.candidatePersonId,
          rank: args.create.rank,
          decision: args.create.decision,
          legacyCandidateId: args.create.legacyCandidateId,
          createPath: true,
        });
        return {};
      },
    },
    projectPositionFillHistory: {
      create: async (args: {
        data: { positionId: string; changeType: string; changedByPersonId: string };
      }) => {
        capture.fillHistoryCreates.push({
          positionId: args.data.positionId,
          changeType: args.data.changeType,
          changedByPersonId: args.data.changedByPersonId,
        });
        return {};
      },
    },
  };

  return {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(tx),
    staffingRequest: {
      findUnique: async () => ({
        id: STAFFING_REQUEST_ID,
        status: 'IN_REVIEW',
        projectId: 'project-1',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-12-31'),
        role: 'Engineer',
        allocationPercent: 80,
        headcountFulfilled: 0,
        headcountRequired: 1,
        publicId: null,
      }),
    },
    projectAssignment: {
      count: async () => 1,
    },
    // rejectAll consults the rejection-reason taxonomy; permissive when no
    // dictionary is seeded.
    metadataDictionary: {
      findFirst: async () => null,
    },
  } as unknown as PrismaService;
}

function buildCreateAssignmentStub(): CreateProjectAssignmentService {
  return {
    execute: async () => ({ id: ASSIGNMENT_ID }),
  } as unknown as CreateProjectAssignmentService;
}

describe('StaffingProposalSlateService — LEAN-P1-8 dual-write to ProjectPositionCandidate', () => {
  it('pickCandidate mirrors PICKED + AUTO_DECLINED candidates onto the lean side with legacyCandidateId stamped', async () => {
    const slate = buildSlate();
    const { repo, capture } = buildSlateRepo(slate);
    const prisma = buildPrismaWithMatchingPosition(capture);
    const svc = new StaffingProposalSlateService(repo, prisma, buildCreateAssignmentStub());

    const result = await svc.pickCandidate({
      staffingRequestId: STAFFING_REQUEST_ID,
      slateId: SLATE_ID,
      candidateId: CANDIDATE_A_ID,
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
    });

    expect(result.assignmentId).toBe(ASSIGNMENT_ID);

    // Legacy slate.save was called once via the repo.
    expect(capture.slateSaveCount).toBe(1);

    // Lean dual-write: one upsert per candidate, stamped with the legacy id.
    expect(capture.candidateUpserts).toHaveLength(2);

    const picked = capture.candidateUpserts.find((u) => u.candidatePersonId === 'person-a');
    expect(picked).toBeDefined();
    expect(picked?.positionId).toBe(POSITION_ID);
    expect(picked?.rank).toBe(1);
    expect(picked?.decision).toBe('PICKED');
    expect(picked?.legacyCandidateId).toBe(CANDIDATE_A_ID);

    const autoDeclined = capture.candidateUpserts.find((u) => u.candidatePersonId === 'person-b');
    expect(autoDeclined).toBeDefined();
    expect(autoDeclined?.decision).toBe('AUTO_DECLINED');
    expect(autoDeclined?.legacyCandidateId).toBe(CANDIDATE_B_ID);

    // One fill-history row per position with the right change type + actor.
    expect(capture.fillHistoryCreates).toHaveLength(1);
    expect(capture.fillHistoryCreates[0]).toEqual({
      positionId: POSITION_ID,
      changeType: 'CANDIDATE_PICKED',
      changedByPersonId: 'actor-1',
    });
  });

  it('rejectAll mirrors DECLINED decisions and writes CANDIDATE_DECLINED history', async () => {
    const slate = buildSlate();
    const { repo, capture } = buildSlateRepo(slate);
    const prisma = buildPrismaWithMatchingPosition(capture);
    const svc = new StaffingProposalSlateService(repo, prisma, buildCreateAssignmentStub());

    const result = await svc.rejectAll({
      staffingRequestId: STAFFING_REQUEST_ID,
      slateId: SLATE_ID,
      reasonCode: 'NOT_ENOUGH_FIT',
      sendBack: true,
      actorId: 'actor-2',
      actorRoles: ['project_manager'],
    });

    expect(result.nextRequestStatus).toBe('OPEN');
    expect(capture.candidateUpserts).toHaveLength(2);
    for (const upsert of capture.candidateUpserts) {
      expect(upsert.decision).toBe('DECLINED');
    }
    expect(capture.fillHistoryCreates).toHaveLength(1);
    expect(capture.fillHistoryCreates[0].changeType).toBe('CANDIDATE_DECLINED');
    expect(capture.fillHistoryCreates[0].changedByPersonId).toBe('actor-2');
  });

  it('mirror is a no-op when no ProjectPosition rows reference the legacy SR', async () => {
    const slate = buildSlate();
    const { repo, capture } = buildSlateRepo(slate);
    // No-op path: findMany returns [], so upsert and history.create should
    // never be called.
    const tx = {
      staffingRequest: { update: async () => ({ id: STAFFING_REQUEST_ID }) },
      projectPosition: { findMany: async () => [] },
      projectPositionCandidate: {
        upsert: async () => {
          capture.candidateUpserts.push({
            positionId: 'should-not-fire',
            candidatePersonId: '',
            rank: 0,
            decision: '',
            legacyCandidateId: undefined,
            createPath: true,
          });
          return {};
        },
      },
      projectPositionFillHistory: {
        create: async () => {
          capture.fillHistoryCreates.push({
            positionId: 'should-not-fire',
            changeType: '',
            changedByPersonId: '',
          });
          return {};
        },
      },
    };
    const prisma = {
      $transaction: async <T>(fn: (txArg: unknown) => Promise<T>): Promise<T> => fn(tx),
      staffingRequest: {
        findUnique: async () => ({
          id: STAFFING_REQUEST_ID,
          status: 'IN_REVIEW',
          projectId: 'project-1',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-12-31'),
          role: 'Engineer',
          allocationPercent: 80,
          headcountFulfilled: 0,
          headcountRequired: 1,
          publicId: null,
        }),
      },
      projectAssignment: { count: async () => 1 },
    } as unknown as PrismaService;
    const svc = new StaffingProposalSlateService(repo, prisma, buildCreateAssignmentStub());

    await svc.pickCandidate({
      staffingRequestId: STAFFING_REQUEST_ID,
      slateId: SLATE_ID,
      candidateId: CANDIDATE_A_ID,
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
    });

    expect(capture.candidateUpserts).toHaveLength(0);
    expect(capture.fillHistoryCreates).toHaveLength(0);
    expect(capture.slateSaveCount).toBe(1);
  });
});
