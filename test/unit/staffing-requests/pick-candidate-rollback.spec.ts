import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { StaffingProposalSlateService } from '@src/modules/staffing-requests/application/staffing-proposal-slate.service';
import { StaffingRequestProposalCandidate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-candidate.entity';
import { StaffingRequestProposalSlate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-slate.entity';
import { StaffingRequestProposalSlateRepositoryPort } from '@src/modules/staffing-requests/domain/repositories/staffing-request-proposal-slate-repository.port';
import { PrismaService } from '@src/shared/persistence/prisma.service';

// HD-0.2 Phase 2 — Fault-injection probe for the `pickCandidate` rollback
// boundary. Order is option C (cross-service first, then atomic our-side
// writes). The test proves: when `staffingRequest.update` throws inside
// the $transaction, the slate.save is also rolled back — i.e., the
// slate's pre-call state is preserved in the in-memory repo.

const STAFFING_REQUEST_ID = '11111111-1111-4000-8000-000000000001';
const SLATE_ID = '22222222-2222-4000-8000-000000000002';
const CANDIDATE_ID = '33333333-3333-4000-8000-000000000003';
const ASSIGNMENT_ID = '44444444-4444-4000-8000-000000000004';

function buildSlate(): StaffingRequestProposalSlate {
  const candidate = StaffingRequestProposalCandidate.create(
    {
      slateId: SLATE_ID,
      candidatePersonId: 'person-a',
      matchScore: 0.95,
      mismatchedSkills: [],
      rank: 1,
    },
    CANDIDATE_ID,
  );
  return StaffingRequestProposalSlate.create(
    {
      candidates: [candidate],
      staffingRequestId: STAFFING_REQUEST_ID,
      proposedByPersonId: 'rm-1',
      proposedAt: new Date('2026-05-01'),
    },
    SLATE_ID,
  );
}

// `state.current` is the slate aggregate the service mutates in-memory
// via `slate.pickCandidate(...)`. The repo records save-attempts into
// `pendingSnapshots` (status string per call) and the prisma stub's
// $transaction commits these into `committedSnapshots` only if the
// callback returns successfully. On throw, the pending list is dropped
// — same contract Postgres uses.
interface SlateState {
  current: StaffingRequestProposalSlate;
  pendingSnapshots: string[];
  committedSnapshots: string[];
}

function buildSlateRepo(initial: StaffingRequestProposalSlate): {
  repo: StaffingRequestProposalSlateRepositoryPort;
  state: SlateState;
} {
  const state: SlateState = {
    current: initial,
    pendingSnapshots: [],
    committedSnapshots: [],
  };
  const repo = {
    findById: async (id: string) => (state.current.id === id ? state.current : null),
    findByStaffingRequestId: async (rid: string) =>
      state.current.staffingRequestId === rid ? state.current : null,
    save: async (s: StaffingRequestProposalSlate) => {
      // Capture the post-mutation status as a "pending" write that the
      // surrounding $transaction commits on success / discards on throw.
      state.pendingSnapshots.push(s.status);
    },
  } as unknown as StaffingRequestProposalSlateRepositoryPort;
  return { repo, state };
}

interface PrismaPinSpy {
  prisma: PrismaService;
  txAttempts: number;
}

function buildPrismaStub(
  state: SlateState,
  options: { failOnRequestUpdate: boolean } = { failOnRequestUpdate: false },
): PrismaPinSpy {
  const stub: PrismaPinSpy = {
    prisma: undefined as unknown as PrismaService,
    txAttempts: 0,
  };

  const tx = {
    staffingRequest: {
      update: async () => {
        if (options.failOnRequestUpdate) {
          throw new Error('simulated DB failure on staffingRequest.update');
        }
        return { id: STAFFING_REQUEST_ID };
      },
    },
    // LEAN-P1-8 — slate service now dual-writes onto ProjectPositionCandidate
    // inside the same tx. No backfilled positions exist in this stub, so the
    // findMany returns [] and the mirror is a no-op. The upsert + history.create
    // stubs are required so missing-method errors don't mask real bugs if a
    // future test adds positions to the fixture.
    projectPosition: {
      findMany: async () => [],
    },
    projectPositionCandidate: {
      upsert: async () => ({}),
    },
    projectPositionFillHistory: {
      create: async () => ({}),
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      stub.txAttempts += 1;
      try {
        const result = await fn(tx);
        // Commit pending slate writes — only if the callback returned
        // successfully (mirrors Postgres tx commit on no-throw).
        state.committedSnapshots.push(...state.pendingSnapshots);
        state.pendingSnapshots = [];
        return result;
      } catch (err) {
        // Discard pending writes — Postgres rolls back on throw.
        state.pendingSnapshots = [];
        throw err;
      }
    },
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
    // D-95 — `pickCandidate` now queries `prisma.projectAssignment.count`
    // to derive headcountFulfilled from live assignment status.
    projectAssignment: {
      count: async () => 1,
    },
  } as unknown as PrismaService;
  stub.prisma = prisma;
  return stub;
}

function buildCreateAssignmentStub(): CreateProjectAssignmentService {
  return {
    execute: async () => ({ id: ASSIGNMENT_ID }),
  } as unknown as CreateProjectAssignmentService;
}

describe('StaffingProposalSlateService.pickCandidate — HD-0.2 Phase 2 rollback semantics', () => {
  it('happy path: tx writes both slate decision + request update atomically', async () => {
    const slate = buildSlate();
    const { repo, state } = buildSlateRepo(slate);
    const stub = buildPrismaStub(state);
    const svc = new StaffingProposalSlateService(repo, stub.prisma, buildCreateAssignmentStub());

    const result = await svc.pickCandidate({
      staffingRequestId: STAFFING_REQUEST_ID,
      slateId: SLATE_ID,
      candidateId: CANDIDATE_ID,
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
    });

    expect(result.assignmentId).toBe(ASSIGNMENT_ID);
    expect(stub.txAttempts).toBe(1);
    // Slate decision was COMMITTED via the tx (status='DECIDED' captured at save time).
    expect(state.committedSnapshots).toEqual(['DECIDED']);
    expect(state.pendingSnapshots).toEqual([]);
  });

  it('rolls back the slate decision when staffingRequest.update fails inside the tx', async () => {
    const slate = buildSlate();
    const { repo, state } = buildSlateRepo(slate);
    const stub = buildPrismaStub(state, { failOnRequestUpdate: true });
    const svc = new StaffingProposalSlateService(repo, stub.prisma, buildCreateAssignmentStub());

    await expect(
      svc.pickCandidate({
        staffingRequestId: STAFFING_REQUEST_ID,
        slateId: SLATE_ID,
        candidateId: CANDIDATE_ID,
        actorId: 'actor-1',
        actorRoles: ['project_manager'],
      }),
    ).rejects.toThrow('simulated DB failure on staffingRequest.update');

    expect(stub.txAttempts).toBe(1);
    // Slate write was attempted inside the same tx (pending), but the tx
    // ROLLED BACK on throw — the pending write was discarded, nothing
    // committed.
    expect(state.committedSnapshots).toEqual([]);
    expect(state.pendingSnapshots).toEqual([]);
  });
});
