import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-96 / D-103-write-path round 6 — asserts that `createdByPersonId` /
 * `updatedByPersonId` are populated on StaffingRequestFulfilment.create
 * AND on the parent StaffingRequest.update during slate-pick fulfilment.
 */
describe('D-103 write-path — StaffingRequestFulfilment + parent SR update actor-audit', () => {
  it('populates actor-audit cols on both fulfilment create and parent SR update', async () => {
    const capturedFulfilmentCreates: Array<Record<string, unknown>> = [];
    const capturedSrUpdates: Array<Record<string, unknown>> = [];

    let findUniqueCallCount = 0;
    const prismaStub = {
      staffingRequest: {
        findUnique: async () => {
          findUniqueCallCount++;
          // First call: resolveInternalId → row with id
          if (findUniqueCallCount === 1) {
            return { id: 'sr-internal-id' };
          }
          // Second call: fulfil precondition check
          return {
            status: 'OPEN',
            headcountRequired: 2,
            headcountFulfilled: 0,
            projectId: 'proj-1',
          };
        },
        update: async (args: { data: Record<string, unknown> }) => {
          capturedSrUpdates.push(args.data);
          return {
            id: 'sr-1',
            publicId: 'stf_test',
            allocationPercent: { toNumber: () => 50 },
            createdAt: new Date(),
            updatedAt: new Date(),
            endDate: new Date('2026-09-30'),
            startDate: new Date('2026-05-01'),
            fulfilments: [],
            headcountFulfilled: 1,
            headcountRequired: 2,
            priority: 'MEDIUM',
            projectId: 'proj-1',
            requestedByPersonId: 'pm-1',
            role: 'Senior Engineer',
            skills: [],
            status: 'IN_REVIEW',
            summary: null,
            cancelledAt: null,
            candidatePersonId: null,
          };
        },
      },
      staffingRequestFulfilment: {
        create: async (args: { data: Record<string, unknown> }) => {
          capturedFulfilmentCreates.push(args.data);
          return args.data;
        },
      },
      project: {
        findUnique: async () => ({ status: 'ACTIVE', archivedAt: null, name: 'Test Project' }),
      },
    } as unknown as PrismaService;

    const svc = new InMemoryStaffingRequestService(prismaStub);
    await svc.fulfil('sr-internal-id', 'rm-actor-9', 'candidate-person-42');

    // Fulfilment row records both create + update actor.
    expect(capturedFulfilmentCreates).toHaveLength(1);
    expect(capturedFulfilmentCreates[0]?.createdByPersonId).toBe('rm-actor-9');
    expect(capturedFulfilmentCreates[0]?.updatedByPersonId).toBe('rm-actor-9');

    // Parent SR.update records who last touched it.
    expect(capturedSrUpdates).toHaveLength(1);
    expect(capturedSrUpdates[0]?.updatedByPersonId).toBe('rm-actor-9');
  });
});
