/**
 * Track B.1 — LeaveRequest.reviewComment behaviour through the service.
 *
 * Uses an in-memory fake repository implementing the port; verifies the
 * service forwards / normalises the comment for both approve + reject and
 * surfaces it in the returned DTO.
 */
import {
  LeaveRequestRepositoryPort,
  LeaveRequestRow,
  UpdateLeaveRequestStatusInput,
  CreateLeaveRequestRowInput,
  FindLeaveRequestsFilter,
  FindOverlappingApprovedInput,
} from '@src/modules/leave-requests/domain/repositories/leave-request-repository.port';
import { LeaveRequestsService } from '@src/modules/leave-requests/application/leave-requests.service';

class InMemoryFake implements LeaveRequestRepositoryPort {
  public lastUpdate: { id: string; input: UpdateLeaveRequestStatusInput } | null = null;

  public constructor(private readonly initial: LeaveRequestRow[]) {}

  async create(_input: CreateLeaveRequestRowInput): Promise<LeaveRequestRow> {
    throw new Error('not used');
  }

  async findById(id: string): Promise<LeaveRequestRow | null> {
    return this.initial.find((r) => r.id === id) ?? null;
  }

  async findManyByPerson(): Promise<LeaveRequestRow[]> {
    return this.initial;
  }

  async findMany(_filter: FindLeaveRequestsFilter): Promise<LeaveRequestRow[]> {
    return this.initial;
  }

  async findFirstOverlappingApproved(_input: FindOverlappingApprovedInput): Promise<LeaveRequestRow | null> {
    return null;
  }

  async updateStatus(id: string, input: UpdateLeaveRequestStatusInput): Promise<LeaveRequestRow> {
    this.lastUpdate = { id, input };
    const row = this.initial.find((r) => r.id === id)!;
    return {
      ...row,
      status: input.status,
      reviewedAt: input.reviewedAt,
      reviewedBy: input.reviewedBy,
      // When the input omits reviewComment (undefined), keep existing value;
      // otherwise overwrite with the supplied value (null clears).
      reviewComment: input.reviewComment === undefined ? row.reviewComment : input.reviewComment,
    };
  }
}

const seedRow: LeaveRequestRow = {
  id: 'lr-1',
  personId: 'p-employee',
  type: 'ANNUAL',
  status: 'PENDING',
  startDate: new Date('2026-06-10'),
  endDate: new Date('2026-06-12'),
  notes: 'Family wedding',
  reviewedAt: null,
  reviewedBy: null,
  reviewComment: null,
  createdAt: new Date('2026-05-01'),
};

describe('LeaveRequestsService.reject — reviewComment (Track B.1)', () => {
  it('persists a non-empty reviewComment and surfaces it on the DTO', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const svc = new LeaveRequestsService(fake);
    const dto = await svc.reject('lr-1', 'mgr-1', 'Conflict with sprint cut-over');
    expect(dto.status).toBe('REJECTED');
    expect(dto.reviewComment).toBe('Conflict with sprint cut-over');
    expect(fake.lastUpdate?.input.reviewComment).toBe('Conflict with sprint cut-over');
  });

  it('trims surrounding whitespace before persisting', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const svc = new LeaveRequestsService(fake);
    const dto = await svc.reject('lr-1', 'mgr-1', '   Coverage gap   ');
    expect(dto.reviewComment).toBe('Coverage gap');
  });

  it('normalises whitespace-only comments to null', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const svc = new LeaveRequestsService(fake);
    const dto = await svc.reject('lr-1', 'mgr-1', '   ');
    expect(dto.reviewComment).toBeNull();
    expect(fake.lastUpdate?.input.reviewComment).toBeNull();
  });

  it('omits reviewComment from the update payload when no value supplied (undefined ⇒ keep existing)', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const svc = new LeaveRequestsService(fake);
    const dto = await svc.reject('lr-1', 'mgr-1');
    // service passes undefined down; column stays NULL because the seed row had null.
    expect(dto.reviewComment).toBeNull();
    expect(fake.lastUpdate?.input.reviewComment).toBeUndefined();
  });

  it('still rejects only PENDING requests', async () => {
    const approved = { ...seedRow, status: 'APPROVED' as const };
    const fake = new InMemoryFake([approved]);
    const svc = new LeaveRequestsService(fake);
    await expect(svc.reject('lr-1', 'mgr-1', 'too late')).rejects.toThrow(
      /Only pending requests can be rejected/,
    );
    expect(fake.lastUpdate).toBeNull();
  });
});

describe('LeaveRequestsService.approve — reviewComment (Track B.1)', () => {
  it('persists an approval comment symmetrically', async () => {
    const fake = new InMemoryFake([{ ...seedRow }]);
    const svc = new LeaveRequestsService(fake);
    const dto = await svc.approve('lr-1', 'mgr-1', 'Coverage confirmed');
    expect(dto.status).toBe('APPROVED');
    expect(dto.reviewComment).toBe('Coverage confirmed');
  });
});
