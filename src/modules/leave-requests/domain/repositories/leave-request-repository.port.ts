/**
 * F-14.2 / 20c-02 — port for `LeaveRequest` data access.
 *
 * Replaces direct `PrismaService` usage in `LeaveRequestsService` with
 * an abstraction the service can consume. Keeps Prisma row-shape
 * leakage out of the application layer (the port exposes a typed row;
 * the service maps to DTO).
 */
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveRequestKind = 'ANNUAL' | 'SICK' | 'PARENTAL' | 'COMPASSIONATE' | 'UNPAID' | 'OTHER' | 'OT_OFF' | 'PERSONAL' | 'BEREAVEMENT' | 'STUDY';

export interface LeaveRequestRow {
  id: string;
  personId: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
}

export interface CreateLeaveRequestRowInput {
  personId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
}

export interface UpdateLeaveRequestStatusInput {
  status: LeaveRequestStatus;
  reviewedAt: Date;
  reviewedBy: string;
}

export interface FindLeaveRequestsFilter {
  personId?: string;
  status?: string;
}

export interface FindOverlappingApprovedInput {
  personId: string;
  startDate: Date;
  endDate: Date;
  excludeId: string;
}

export interface LeaveRequestRepositoryPort {
  create(input: CreateLeaveRequestRowInput): Promise<LeaveRequestRow>;
  findById(id: string): Promise<LeaveRequestRow | null>;
  findManyByPerson(personId: string): Promise<LeaveRequestRow[]>;
  findMany(filter: FindLeaveRequestsFilter): Promise<LeaveRequestRow[]>;
  findFirstOverlappingApproved(input: FindOverlappingApprovedInput): Promise<LeaveRequestRow | null>;
  updateStatus(id: string, input: UpdateLeaveRequestStatusInput): Promise<LeaveRequestRow>;
}

export const LEAVE_REQUEST_REPOSITORY = Symbol.for('LeaveRequestRepositoryPort');
