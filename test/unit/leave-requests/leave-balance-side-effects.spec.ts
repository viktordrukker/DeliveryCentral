/**
 * 20c-05 hot-patch — verifies that LeaveRequestsService now updates
 * LeaveBalance as a side effect of create / approve / reject.
 *
 * Before this fix, LeaveRequestsService mutated only LeaveRequest.status
 * and never touched LeaveBalance, leaving used/pending columns
 * perpetually at 0 in production. These tests lock the side-effect
 * contract so a future refactor cannot silently regress it.
 *
 * Atomicity (status + balance in one $transaction) is NOT covered here —
 * the hot-patch is intentionally sequential. The atomic variant lands
 * in EW S5-E5.
 */
import {
  CreateLeaveRequestRowInput,
  FindLeaveRequestsFilter,
  FindOverlappingApprovedInput,
  LeaveRequestRepositoryPort,
  LeaveRequestRow,
  UpdateLeaveRequestStatusInput,
} from '@src/modules/leave-requests/domain/repositories/leave-request-repository.port';
import { LeaveBalanceService } from '@src/modules/leave-requests/application/leave-balance.service';
import { LeaveRequestsService } from '@src/modules/leave-requests/application/leave-requests.service';

interface BalanceCall {
  method: 'ensureBalance' | 'addPending' | 'deduct' | 'restorePending' | 'restoreUsed';
  personId: string;
  year: number;
  leaveType: string;
  days?: number;
  actorId?: string;
}

function recordingBalanceService(): { svc: LeaveBalanceService; calls: BalanceCall[] } {
  const calls: BalanceCall[] = [];
  const svc = {
    ensureBalance: async (
      personId: string,
      year: number,
      leaveType: string,
      _defaultEntitlement: number,
      actorId?: string,
    ): Promise<void> => {
      calls.push({ method: 'ensureBalance', personId, year, leaveType, actorId });
    },
    addPending: async (
      personId: string,
      year: number,
      leaveType: string,
      days: number,
      actorId?: string,
    ): Promise<void> => {
      calls.push({ method: 'addPending', personId, year, leaveType, days, actorId });
    },
    deduct: async (
      personId: string,
      year: number,
      leaveType: string,
      days: number,
      actorId?: string,
    ): Promise<void> => {
      calls.push({ method: 'deduct', personId, year, leaveType, days, actorId });
    },
    restorePending: async (
      personId: string,
      year: number,
      leaveType: string,
      days: number,
      actorId?: string,
    ): Promise<void> => {
      calls.push({ method: 'restorePending', personId, year, leaveType, days, actorId });
    },
    restoreUsed: async (): Promise<void> => {},
    getBalances: async () => [],
  } as unknown as LeaveBalanceService;
  return { svc, calls };
}

const seedRow: LeaveRequestRow = {
  id: 'lr-1',
  personId: 'p-employee',
  type: 'ANNUAL',
  status: 'PENDING',
  startDate: new Date('2026-06-10'),
  endDate: new Date('2026-06-12'), // inclusive → 3 days
  notes: null,
  reviewedAt: null,
  reviewedBy: null,
  reviewComment: null,
  createdAt: new Date('2026-05-01'),
};

class InMemoryFake implements LeaveRequestRepositoryPort {
  public constructor(private readonly rows: LeaveRequestRow[]) {}

  async create(input: CreateLeaveRequestRowInput): Promise<LeaveRequestRow> {
    const row: LeaveRequestRow = {
      id: `lr-new-${this.rows.length + 1}`,
      personId: input.personId,
      type: input.type,
      status: 'PENDING',
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      reviewedAt: null,
      reviewedBy: null,
      reviewComment: null,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }

  async findById(id: string): Promise<LeaveRequestRow | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async findManyByPerson(): Promise<LeaveRequestRow[]> {
    return this.rows;
  }

  async findMany(_f: FindLeaveRequestsFilter): Promise<LeaveRequestRow[]> {
    return this.rows;
  }

  async findFirstOverlappingApproved(
    _i: FindOverlappingApprovedInput,
  ): Promise<LeaveRequestRow | null> {
    return null;
  }

  async updateStatus(id: string, input: UpdateLeaveRequestStatusInput): Promise<LeaveRequestRow> {
    const row = this.rows.find((r) => r.id === id)!;
    return {
      ...row,
      status: input.status,
      reviewedAt: input.reviewedAt,
      reviewedBy: input.reviewedBy,
      reviewComment: input.reviewComment === undefined ? row.reviewComment : input.reviewComment,
    };
  }
}

describe('LeaveRequestsService — LeaveBalance side effects (20c-05)', () => {
  it('create() seeds balance and increments pending by the inclusive day count', async () => {
    const fake = new InMemoryFake([]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await service.create({
      personId: 'p-1',
      startDate: '2026-06-10',
      endDate: '2026-06-12', // 3 days inclusive
      type: 'ANNUAL',
      actorId: 'self',
    });

    expect(calls).toEqual([
      {
        method: 'ensureBalance',
        personId: 'p-1',
        year: 2026,
        leaveType: 'ANNUAL',
        actorId: 'self',
      },
      {
        method: 'addPending',
        personId: 'p-1',
        year: 2026,
        leaveType: 'ANNUAL',
        days: 3,
        actorId: 'self',
      },
    ]);
  });

  it('approve() moves days from pending to used (single deduct call)', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await service.approve('lr-1', 'mgr-1', null);

    expect(calls).toEqual([
      {
        method: 'ensureBalance',
        personId: 'p-employee',
        year: 2026,
        leaveType: 'ANNUAL',
        actorId: 'mgr-1',
      },
      {
        method: 'deduct',
        personId: 'p-employee',
        year: 2026,
        leaveType: 'ANNUAL',
        days: 3,
        actorId: 'mgr-1',
      },
    ]);
  });

  it('reject() releases pending without touching used', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await service.reject('lr-1', 'mgr-1', null);

    expect(calls).toEqual([
      {
        method: 'ensureBalance',
        personId: 'p-employee',
        year: 2026,
        leaveType: 'ANNUAL',
        actorId: 'mgr-1',
      },
      {
        method: 'restorePending',
        personId: 'p-employee',
        year: 2026,
        leaveType: 'ANNUAL',
        days: 3,
        actorId: 'mgr-1',
      },
    ]);
  });

  it('single-day leave (start === end) counts as 1 day', async () => {
    const fake = new InMemoryFake([]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await service.create({
      personId: 'p-1',
      startDate: '2026-07-04',
      endDate: '2026-07-04',
      type: 'SICK',
      actorId: 'self',
    });

    const addPending = calls.find((c) => c.method === 'addPending');
    expect(addPending?.days).toBe(1);
  });

  it('does NOT mutate balance when the request is already non-pending', async () => {
    const approvedRow: LeaveRequestRow = { ...seedRow, status: 'APPROVED' };
    const fake = new InMemoryFake([approvedRow]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await expect(service.approve('lr-1', 'mgr-1', null)).rejects.toThrow(
      /Only pending requests can be approved/,
    );
    expect(calls).toEqual([]); // no balance writes if the request is rejected pre-status update
  });
});
