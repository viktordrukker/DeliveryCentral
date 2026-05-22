import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-97 / D-103-write-path round 7 — asserts that submit / review / release /
 * cancel / update all populate `updatedByPersonId` when actorId is supplied.
 */
describe('D-103 write-path — StaffingRequest transition methods', () => {
  function buildStub(
    initialStatus: string,
    captureFn: (data: Record<string, unknown>) => void,
  ): PrismaService {
    let findCallCount = 0;
    return {
      staffingRequest: {
        findUnique: async () => {
          findCallCount++;
          if (findCallCount === 1) return { id: 'sr-internal-id' };
          return { status: initialStatus };
        },
        update: async (args: { data: Record<string, unknown> }) => {
          captureFn(args.data);
          return {
            id: 'sr-internal-id',
            publicId: 'stf_test',
            allocationPercent: { toNumber: () => 50 },
            createdAt: new Date(),
            updatedAt: new Date(),
            endDate: new Date('2026-09-30'),
            startDate: new Date('2026-05-01'),
            fulfilments: [],
            headcountFulfilled: 0,
            headcountRequired: 1,
            priority: 'MEDIUM',
            projectId: 'proj-1',
            requestedByPersonId: 'pm-1',
            role: 'Senior Engineer',
            skills: [],
            status: 'OPEN',
            summary: null,
            cancelledAt: null,
            candidatePersonId: null,
          };
        },
      },
      project: {
        findUnique: async () => ({ status: 'ACTIVE', archivedAt: null, name: 'Test Project' }),
      },
      staffingRequestProposalSlate: {
        findFirst: async () => null,
      },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          staffingRequestProposalCandidate: { updateMany: async () => undefined },
          staffingRequestProposalSlate: { update: async () => undefined },
          staffingRequest: {
            update: async (args: { data: Record<string, unknown> }) => {
              captureFn(args.data);
              return {
                id: 'sr-internal-id',
                publicId: 'stf_test',
                allocationPercent: { toNumber: () => 50 },
                createdAt: new Date(),
                updatedAt: new Date(),
                endDate: new Date('2026-09-30'),
                startDate: new Date('2026-05-01'),
                fulfilments: [],
                headcountFulfilled: 0,
                headcountRequired: 1,
                priority: 'MEDIUM',
                projectId: 'proj-1',
                requestedByPersonId: 'pm-1',
                role: 'Senior Engineer',
                skills: [],
                status: 'CANCELLED',
                summary: null,
                cancelledAt: new Date(),
                candidatePersonId: null,
              };
            },
          },
        }),
    } as unknown as PrismaService;
  }

  it('submit() sets updatedByPersonId when actor supplied', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new InMemoryStaffingRequestService(buildStub('DRAFT', (d) => (captured = d)));
    await svc.submit('sr-id', 'actor-1');
    expect(captured.updatedByPersonId).toBe('actor-1');
  });

  it('review() sets updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new InMemoryStaffingRequestService(buildStub('OPEN', (d) => (captured = d)));
    await svc.review('sr-id', 'actor-2');
    expect(captured.updatedByPersonId).toBe('actor-2');
  });

  it('release() sets updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new InMemoryStaffingRequestService(buildStub('IN_REVIEW', (d) => (captured = d)));
    await svc.release('sr-id', 'actor-3');
    expect(captured.updatedByPersonId).toBe('actor-3');
  });

  it('cancel() sets updatedByPersonId on the tx update', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new InMemoryStaffingRequestService(buildStub('OPEN', (d) => (captured = d)));
    await svc.cancel('sr-id', 'actor-4');
    expect(captured.updatedByPersonId).toBe('actor-4');
  });

  it('update() sets updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new InMemoryStaffingRequestService(buildStub('DRAFT', (d) => (captured = d)));
    await svc.update('sr-id', { summary: 'New summary' }, 'actor-5');
    expect(captured.updatedByPersonId).toBe('actor-5');
  });

  it('legacy callers without actorId leave the column NULL', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new InMemoryStaffingRequestService(buildStub('DRAFT', (d) => (captured = d)));
    await svc.submit('sr-id');
    expect(captured.updatedByPersonId).toBeNull();
  });
});
