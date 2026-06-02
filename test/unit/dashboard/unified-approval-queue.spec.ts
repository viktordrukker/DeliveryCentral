import { UnifiedApprovalQueueService } from '@src/modules/dashboard/application/unified-approval-queue.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

// The constructor now takes 5 source services (added by PR #470 for the
// decide() dispatcher). list()/loadTimesheets() never touches them, so we
// stub with empty objects.
const stubSvc = {} as never;

/**
 * Approvals Hub PR-2 — `timesheet` source merged into the unified queue.
 */
describe('UnifiedApprovalQueueService — timesheet source', () => {
  function buildStub(opts: {
    timesheets?: Array<{
      id: string;
      personId: string;
      weekStart: Date;
      submittedAt: Date | null;
      createdAt: Date;
      totalHours: number | null;
    }>;
    persons?: Array<{ id: string; displayName: string }>;
  }): PrismaService {
    return {
      projectPosition: { findMany: async () => [] },
      budgetApproval: { findMany: async () => [] },
      projectActivationApproval: { findMany: async () => [] },
      leaveRequest: { findMany: async () => [] },
      caseRecord: { findMany: async () => [] },
      timesheetWeek: {
        findMany: async () => opts.timesheets ?? [],
      },
      person: {
        findMany: async () => opts.persons ?? [],
      },
    } as unknown as PrismaService;
  }

  it('includes SUBMITTED timesheet rows mapped to the timesheet source', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub({
        timesheets: [
          {
            id: 'tw-1',
            personId: 'p-1',
            weekStart: new Date('2026-05-25T00:00:00Z'),
            submittedAt: new Date('2026-05-26T10:00:00Z'),
            createdAt: new Date('2026-05-25T08:00:00Z'),
            totalHours: 40,
          },
        ],
        persons: [{ id: 'p-1', displayName: 'Ethan Brooks' }],
      }),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc,
    );
    const out = await svc.list({ sources: ['timesheet'] });
    expect(out.items).toHaveLength(1);
    const item = out.items[0]!;
    expect(item.source).toBe('timesheet');
    expect(item.title).toBe('Timesheet week of 2026-05-25');
    expect(item.submittedBy).toEqual({ personId: 'p-1', displayName: 'Ethan Brooks' });
    expect(item.href).toBe('/approvals/tw-1?source=timesheet');
    expect(item.submittedAt).toBe('2026-05-26T10:00:00.000Z');
    expect(item.meta).toMatchObject({ weekStart: '2026-05-25', totalHours: 40 });
  });

  it('omits the timesheet source when not requested', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub({
        timesheets: [
          {
            id: 'tw-2',
            personId: 'p-2',
            weekStart: new Date('2026-05-25T00:00:00Z'),
            submittedAt: new Date('2026-05-26T10:00:00Z'),
            createdAt: new Date('2026-05-25T08:00:00Z'),
            totalHours: 35,
          },
        ],
        persons: [{ id: 'p-2', displayName: 'Other' }],
      }),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc,
    );
    const out = await svc.list({ sources: ['leave'] });
    expect(out.items).toHaveLength(0);
  });

  it('falls back to createdAt when submittedAt is null', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub({
        timesheets: [
          {
            id: 'tw-3',
            personId: 'p-3',
            weekStart: new Date('2026-05-18T00:00:00Z'),
            submittedAt: null,
            createdAt: new Date('2026-05-19T12:00:00Z'),
            totalHours: null,
          },
        ],
        persons: [{ id: 'p-3', displayName: 'Alex' }],
      }),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc,
    );
    const out = await svc.list({ sources: ['timesheet'] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0]!.submittedAt).toBe('2026-05-19T12:00:00.000Z');
  });
});
