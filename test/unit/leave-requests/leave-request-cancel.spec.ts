/**
 * LEAN-P4-missing-11 — self-serve cancel.
 *
 * Covers:
 *   - happy path: own pending leave → CANCELLED, pending balance released.
 *   - RBAC: someone else's pending leave → ForbiddenException, no writes.
 *   - status guard: APPROVED / REJECTED can't be cancelled.
 *   - not found: missing id → NotFoundException.
 */
import {
  CancelLeaveRequestInput,
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
  method: 'ensureBalance' | 'restorePending';
  personId: string;
  days?: number;
  actorId?: string;
}

function recordingBalanceService(): { svc: LeaveBalanceService; calls: BalanceCall[] } {
  const calls: BalanceCall[] = [];
  const svc = {
    ensureBalance: async (
      personId: string,
      _year: number,
      _leaveType: string,
      _defaultEntitlement: number,
      actorId?: string,
    ): Promise<void> => {
      calls.push({ method: 'ensureBalance', personId, actorId });
    },
    addPending: async () => {},
    deduct: async () => {},
    restorePending: async (
      personId: string,
      _year: number,
      _leaveType: string,
      days: number,
      actorId?: string,
    ): Promise<void> => {
      calls.push({ method: 'restorePending', personId, days, actorId });
    },
    restoreUsed: async () => {},
    getBalances: async () => [],
  } as unknown as LeaveBalanceService;
  return { svc, calls };
}

class InMemoryFake implements LeaveRequestRepositoryPort {
  public cancelCalls: { id: string; input: CancelLeaveRequestInput }[] = [];

  public constructor(private readonly rows: LeaveRequestRow[]) {}

  async create(_i: CreateLeaveRequestRowInput): Promise<LeaveRequestRow> {
    throw new Error('not used');
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

  async findFirstOverlappingApproved(_i: FindOverlappingApprovedInput): Promise<LeaveRequestRow | null> {
    return null;
  }

  async updateStatus(id: string, input: UpdateLeaveRequestStatusInput): Promise<LeaveRequestRow> {
    const row = this.rows.find((r) => r.id === id)!;
    return { ...row, status: input.status, reviewedAt: input.reviewedAt, reviewedBy: input.reviewedBy };
  }

  async cancel(id: string, input: CancelLeaveRequestInput): Promise<LeaveRequestRow> {
    this.cancelCalls.push({ id, input });
    const row = this.rows.find((r) => r.id === id)!;
    return { ...row, status: 'CANCELLED' };
  }
}

const pendingRow: LeaveRequestRow = {
  id: 'lr-pending',
  personId: 'p-employee',
  type: 'ANNUAL',
  status: 'PENDING',
  startDate: new Date('2026-06-10'),
  endDate: new Date('2026-06-12'),
  notes: null,
  reviewedAt: null,
  reviewedBy: null,
  reviewComment: null,
  createdAt: new Date('2026-05-01'),
};

describe('LeaveRequestsService.cancel — LEAN-P4-missing-11', () => {
  it('cancels own pending request and releases pending balance', async () => {
    const fake = new InMemoryFake([{ ...pendingRow }]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    const dto = await service.cancel('lr-pending', 'p-employee');

    expect(dto.status).toBe('CANCELLED');
    expect(fake.cancelCalls).toEqual([
      { id: 'lr-pending', input: { actorId: 'p-employee' } },
    ]);
    expect(calls).toEqual([
      { method: 'ensureBalance', personId: 'p-employee', actorId: 'p-employee' },
      { method: 'restorePending', personId: 'p-employee', days: 3, actorId: 'p-employee' },
    ]);
  });

  it('rejects cancel by a different person (ForbiddenException, no writes)', async () => {
    const fake = new InMemoryFake([{ ...pendingRow }]);
    const { svc: balance, calls } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await expect(service.cancel('lr-pending', 'p-other')).rejects.toThrow(
      /You can only cancel your own leave requests/,
    );
    expect(fake.cancelCalls).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('rejects cancel when status is APPROVED', async () => {
    const fake = new InMemoryFake([{ ...pendingRow, status: 'APPROVED' }]);
    const { svc: balance } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await expect(service.cancel('lr-pending', 'p-employee')).rejects.toThrow(
      /Only pending requests can be cancelled/,
    );
    expect(fake.cancelCalls).toEqual([]);
  });

  it('rejects cancel when status is REJECTED', async () => {
    const fake = new InMemoryFake([{ ...pendingRow, status: 'REJECTED' }]);
    const { svc: balance } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await expect(service.cancel('lr-pending', 'p-employee')).rejects.toThrow(
      /Only pending requests can be cancelled/,
    );
    expect(fake.cancelCalls).toEqual([]);
  });

  it('throws NotFoundException when the leave request id is unknown', async () => {
    const fake = new InMemoryFake([]);
    const { svc: balance } = recordingBalanceService();
    const service = new LeaveRequestsService(fake, balance);

    await expect(service.cancel('nope', 'p-employee')).rejects.toThrow(/Leave request not found/);
  });
});
