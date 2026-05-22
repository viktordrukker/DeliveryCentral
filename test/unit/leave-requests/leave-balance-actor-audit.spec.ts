import { LeaveBalanceService } from '@src/modules/leave-requests/application/leave-balance.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-95 / D-103-write-path round 5 — asserts that `createdByPersonId` /
 * `updatedByPersonId` are populated on LeaveBalance writes.
 */
describe('D-103 write-path — LeaveBalance createdByPersonId / updatedByPersonId', () => {
  it('ensureBalance: sets both cols on insert when actorId supplied', async () => {
    let captured: { create?: Record<string, unknown>; update?: Record<string, unknown> } | undefined;
    const prismaStub = {
      leaveBalance: {
        upsert: async (args: typeof captured) => {
          captured = args;
        },
      },
    } as unknown as PrismaService;
    const svc = new LeaveBalanceService(prismaStub);
    await svc.ensureBalance('person-1', 2026, 'ANNUAL', 20, 'hr-admin-7');
    expect(captured?.create?.createdByPersonId).toBe('hr-admin-7');
    expect(captured?.create?.updatedByPersonId).toBe('hr-admin-7');
  });

  it('ensureBalance: cols NULL when actorId omitted', async () => {
    let captured: { create?: Record<string, unknown>; update?: Record<string, unknown> } | undefined;
    const prismaStub = {
      leaveBalance: {
        upsert: async (args: typeof captured) => {
          captured = args;
        },
      },
    } as unknown as PrismaService;
    const svc = new LeaveBalanceService(prismaStub);
    await svc.ensureBalance('person-1', 2026, 'ANNUAL', 20);
    expect(captured?.create?.createdByPersonId).toBeNull();
  });

  it('deduct: sets updatedByPersonId when actorId supplied', async () => {
    let captured: { data?: Record<string, unknown> } | undefined;
    const prismaStub = {
      leaveBalance: {
        update: async (args: typeof captured) => {
          captured = args;
        },
      },
    } as unknown as PrismaService;
    const svc = new LeaveBalanceService(prismaStub);
    await svc.deduct('person-1', 2026, 'ANNUAL', 3, 'hr-admin-7');
    expect(captured?.data?.updatedByPersonId).toBe('hr-admin-7');
  });

  it('addPending / restorePending / restoreUsed: all set updatedByPersonId', async () => {
    const captured: Array<{ data?: Record<string, unknown> }> = [];
    const prismaStub = {
      leaveBalance: {
        update: async (args: { data?: Record<string, unknown> }) => {
          captured.push(args);
        },
      },
    } as unknown as PrismaService;
    const svc = new LeaveBalanceService(prismaStub);
    await svc.addPending('p', 2026, 'ANNUAL', 1, 'a-1');
    await svc.restorePending('p', 2026, 'ANNUAL', 1, 'a-2');
    await svc.restoreUsed('p', 2026, 'ANNUAL', 1, 'a-3');
    expect(captured[0]?.data?.updatedByPersonId).toBe('a-1');
    expect(captured[1]?.data?.updatedByPersonId).toBe('a-2');
    expect(captured[2]?.data?.updatedByPersonId).toBe('a-3');
  });
});
