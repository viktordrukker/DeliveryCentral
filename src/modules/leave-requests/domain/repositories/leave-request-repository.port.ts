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
  // SC-7 — resolved requester name, populated by the list paths (findMany /
  // findManyByPerson) so the approval queue never shows a truncated UUID.
  // Optional: single-record paths leave it undefined.
  personName?: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  // Track B.1 — reviewer's free-text justification on approve / reject.
  reviewComment: string | null;
  createdAt: Date;
}

export interface CreateLeaveRequestRowInput {
  personId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  // F-112 / D-103-write-path round 22 — actor-audit. `actorId` is the
  // person who submitted the request (often == personId for self-serve,
  // != when HR creates on behalf).
  actorId?: string;
}

export interface UpdateLeaveRequestStatusInput {
  status: LeaveRequestStatus;
  reviewedAt: Date;
  reviewedBy: string;
  // F-112 / D-103-write-path round 22 — actor-audit. Captures the
  // reviewer in `updatedByPersonId` (same value as `reviewedBy` for
  // approve/reject, but kept separate so the column population matches
  // the uniform D-103 pair shape).
  actorId?: string;
  // Track B.1 — optional reviewer comment captured at decision time.
  // Persisted onto LeaveRequest.reviewComment.
  reviewComment?: string | null;
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
