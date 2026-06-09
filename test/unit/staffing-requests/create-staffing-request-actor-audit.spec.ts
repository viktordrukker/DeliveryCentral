import {
  InMemoryStaffingRequestService,
  type CreateStaffingRequestCommand,
} from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-92 / D-103-write-path round 2 — asserts that `createdByPersonId` is
 * threaded into the Prisma `create` data block when a staffing request
 * is created. Mocks the prisma client to capture the args without
 * touching a real DB.
 */
describe('D-103 write-path — StaffingRequest createdByPersonId', () => {
  it('passes createdByPersonId = requestedByPersonId into prisma.staffingRequest.create', async () => {
    const capturedCreates: Array<Record<string, unknown>> = [];

    // Decimal stub — Prisma uses decimal.js for the allocationPercent column.
    const decimalLike = (n: number) => ({ toNumber: () => n });

    const prismaStub = {
      staffingRequest: {
        create: async (args: { data: Record<string, unknown>; include?: unknown }) => {
          capturedCreates.push(args.data);
          return {
            id: 'sr-1',
            publicId: 'stf_test',
            allocationPercent: decimalLike(args.data.allocationPercent as number),
            candidatePersonId: args.data.candidatePersonId ?? null,
            cancelledAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            endDate: new Date('2026-09-30'),
            startDate: new Date('2026-05-01'),
            fulfilments: [],
            headcountFulfilled: 0,
            headcountRequired: args.data.headcountRequired ?? 1,
            priority: args.data.priority,
            projectId: args.data.projectId,
            requestedByPersonId: args.data.requestedByPersonId,
            role: args.data.role,
            skills: args.data.skills ?? [],
            status: 'DRAFT',
            summary: args.data.summary ?? null,
          };
        },
        findMany: async () => [],
        findUnique: async () => null,
        update: async () => ({}),
      },
      // SoT PR 15 — canonical ProjectPosition write happens BEFORE the
      // legacy staffingRequest.create. Stub returns a positionId so the
      // service can pin legacyStaffingRequestId.
      projectPosition: {
        create: async () => ({ id: 'pos-canonical-1' }),
      },
      project: {
        findUnique: async () => ({ status: 'ACTIVE', archivedAt: null, name: 'Test Project' }),
      },
      metadataDictionary: {
        // Return null = "taxonomy not seeded yet" → service is permissive.
        findFirst: async () => null,
      },
      skill: {
        findMany: async () => [],
      },
    } as unknown as PrismaService;

    const svc = new InMemoryStaffingRequestService(prismaStub);

    const cmd: CreateStaffingRequestCommand = {
      allocationPercent: 50,
      endDate: '2026-09-30',
      priority: 'MEDIUM',
      projectId: 'proj-1',
      requestedByPersonId: 'pm-actor-7',
      role: 'Senior Engineer',
      startDate: '2026-05-01',
    };

    await svc.create(cmd);

    expect(capturedCreates).toHaveLength(1);
    expect(capturedCreates[0]?.createdByPersonId).toBe('pm-actor-7');
    expect(capturedCreates[0]?.requestedByPersonId).toBe('pm-actor-7');
  });
});
