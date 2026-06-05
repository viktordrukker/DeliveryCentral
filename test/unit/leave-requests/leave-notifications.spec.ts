/**
 * LEAN-P4-missing-12 — verifies that `LeaveRequestsService` dispatches
 * the four lifecycle events through `NotificationEventTranslatorService`:
 *
 *   create  → leave.submitted
 *   approve → leave.approved
 *   reject  → leave.rejected
 *   cancel  → leave.cancelled_by_employee
 *
 * The translator is recorded as a stub; downstream email + in-app fan-out
 * is covered by translator-level specs. Here the contract under test is
 * the service calling the right translator method with the right payload.
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
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

interface RecordedDispatch {
  method:
    | 'leaveSubmitted'
    | 'leaveApproved'
    | 'leaveRejected'
    | 'leaveCancelledByEmployee';
  payload: Record<string, unknown>;
}

function recordingTranslator(): {
  svc: NotificationEventTranslatorService;
  dispatches: RecordedDispatch[];
} {
  const dispatches: RecordedDispatch[] = [];
  const svc = {
    leaveSubmitted: async (payload: Record<string, unknown>): Promise<void> => {
      dispatches.push({ method: 'leaveSubmitted', payload });
    },
    leaveApproved: async (payload: Record<string, unknown>): Promise<void> => {
      dispatches.push({ method: 'leaveApproved', payload });
    },
    leaveRejected: async (payload: Record<string, unknown>): Promise<void> => {
      dispatches.push({ method: 'leaveRejected', payload });
    },
    leaveCancelledByEmployee: async (payload: Record<string, unknown>): Promise<void> => {
      dispatches.push({ method: 'leaveCancelledByEmployee', payload });
    },
  } as unknown as NotificationEventTranslatorService;
  return { svc, dispatches };
}

function noopBalance(): LeaveBalanceService {
  return {
    ensureBalance: async () => undefined,
    addPending: async () => undefined,
    deduct: async () => undefined,
    restorePending: async () => undefined,
    restoreUsed: async () => undefined,
    getBalances: async () => [],
  } as unknown as LeaveBalanceService;
}

const seedRow: LeaveRequestRow = {
  id: 'lr-1',
  personId: 'p-employee',
  type: 'ANNUAL',
  status: 'PENDING',
  startDate: new Date('2026-06-10T00:00:00.000Z'),
  endDate: new Date('2026-06-12T00:00:00.000Z'),
  notes: null,
  reviewedAt: null,
  reviewedBy: null,
  reviewComment: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
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
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
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
    const updated = {
      ...row,
      status: input.status,
      reviewedAt: input.reviewedAt,
      reviewedBy: input.reviewedBy,
      reviewComment: input.reviewComment === undefined ? row.reviewComment : input.reviewComment,
    };
    Object.assign(row, updated);
    return updated;
  }
}

// `void this.notificationEventTranslator?.leaveSubmitted(...)` is fire-and-forget
// — give the microtask queue a chance to flush before asserting.
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('LeaveRequestsService — notification dispatches (LEAN-P4-missing-12)', () => {
  it('create() dispatches leave.submitted with start/end/type/manager payload', async () => {
    const fake = new InMemoryFake([]);
    const { svc: translator, dispatches } = recordingTranslator();
    const service = new LeaveRequestsService(fake, noopBalance(), translator);

    await service.create({
      personId: 'p-1',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      type: 'ANNUAL',
      actorId: 'p-1',
      managerPersonId: 'mgr-7',
    });
    await flush();

    expect(dispatches).toHaveLength(1);
    expect(dispatches[0].method).toBe('leaveSubmitted');
    expect(dispatches[0].payload).toMatchObject({
      personId: 'p-1',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      type: 'ANNUAL',
      managerPersonId: 'mgr-7',
    });
    expect(typeof (dispatches[0].payload as { leaveRequestId: string }).leaveRequestId).toBe(
      'string',
    );
  });

  it('approve() dispatches leave.approved to the employee with reviewer + comment', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const { svc: translator, dispatches } = recordingTranslator();
    const service = new LeaveRequestsService(fake, noopBalance(), translator);

    await service.approve('lr-1', 'mgr-1', 'Looks good.');
    await flush();

    expect(dispatches).toHaveLength(1);
    expect(dispatches[0].method).toBe('leaveApproved');
    expect(dispatches[0].payload).toMatchObject({
      leaveRequestId: 'lr-1',
      personId: 'p-employee',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      type: 'ANNUAL',
      reviewerPersonId: 'mgr-1',
      reviewComment: 'Looks good.',
    });
  });

  it('reject() dispatches leave.rejected with the reviewer + reason', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const { svc: translator, dispatches } = recordingTranslator();
    const service = new LeaveRequestsService(fake, noopBalance(), translator);

    await service.reject('lr-1', 'mgr-2', 'Coverage gap.');
    await flush();

    expect(dispatches).toHaveLength(1);
    expect(dispatches[0].method).toBe('leaveRejected');
    expect(dispatches[0].payload).toMatchObject({
      leaveRequestId: 'lr-1',
      personId: 'p-employee',
      reviewerPersonId: 'mgr-2',
      reviewComment: 'Coverage gap.',
    });
  });

  it('cancelByEmployee() dispatches leave.cancelled_by_employee to the manager', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const { svc: translator, dispatches } = recordingTranslator();
    const service = new LeaveRequestsService(fake, noopBalance(), translator);

    const dto = await service.cancelByEmployee('lr-1', 'p-employee', 'mgr-3');
    await flush();

    expect(dto.status).toBe('CANCELLED');
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0].method).toBe('leaveCancelledByEmployee');
    expect(dispatches[0].payload).toMatchObject({
      leaveRequestId: 'lr-1',
      personId: 'p-employee',
      type: 'ANNUAL',
      managerPersonId: 'mgr-3',
    });
  });

  it('cancelByEmployee() refuses when caller is not the requesting employee', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const { svc: translator, dispatches } = recordingTranslator();
    const service = new LeaveRequestsService(fake, noopBalance(), translator);

    await expect(service.cancelByEmployee('lr-1', 'someone-else')).rejects.toThrow(
      /Only the requesting employee/,
    );
    expect(dispatches).toHaveLength(0);
  });

  it('cancelByEmployee() refuses non-PENDING rows', async () => {
    const fake = new InMemoryFake([{ ...seedRow, status: 'APPROVED' }]);
    const { svc: translator, dispatches } = recordingTranslator();
    const service = new LeaveRequestsService(fake, noopBalance(), translator);

    await expect(service.cancelByEmployee('lr-1', 'p-employee')).rejects.toThrow(
      /Only pending requests can be cancelled/,
    );
    expect(dispatches).toHaveLength(0);
  });
});
