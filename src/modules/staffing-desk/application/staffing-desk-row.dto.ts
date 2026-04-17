export type StaffingDeskRowKind = 'assignment' | 'request';
export type StatusGroup = 'active' | 'cancelled' | 'done' | 'draft' | 'pending';

export interface TimelineAssignment {
  allocationPercent: number;
  endDate: string | null;
  projectName: string;
  startDate: string;
  status: string;
}

export interface StaffingDeskRowDto {
  id: string;
  kind: StaffingDeskRowKind;
  projectId: string;
  projectName: string;
  role: string;
  allocationPercent: number;
  startDate: string;
  endDate: string | null;
  status: string;
  statusGroup: StatusGroup;
  createdAt: string;
  // Assignment-only
  personId: string | null;
  personName: string | null;
  assignmentCode: string | null;
  personAssignments: TimelineAssignment[];
  // Person metadata (supply rows)
  personGrade: string | null;
  personRole: string | null;
  personEmail: string | null;
  personOrgUnit: string | null;
  personManager: string | null;
  personPool: string | null;
  personSkills: string[];
  personEmploymentStatus: string | null;
  // Request-only
  priority: string | null;
  skills: string[];
  headcountRequired: number | null;
  headcountFulfilled: number | null;
  requestedByName: string | null;
  summary: string | null;
}

const ACTIVE_STATUSES = new Set(['APPROVED', 'ACTIVE']);
const PENDING_STATUSES = new Set(['REQUESTED', 'OPEN', 'IN_REVIEW']);
const DONE_STATUSES = new Set(['ENDED', 'FULFILLED', 'ARCHIVED']);
const CANCELLED_STATUSES = new Set(['REJECTED', 'REVOKED', 'CANCELLED']);

export function resolveStatusGroup(status: string): StatusGroup {
  const upper = status.toUpperCase();
  if (upper === 'DRAFT') return 'draft';
  if (ACTIVE_STATUSES.has(upper)) return 'active';
  if (PENDING_STATUSES.has(upper)) return 'pending';
  if (DONE_STATUSES.has(upper)) return 'done';
  if (CANCELLED_STATUSES.has(upper)) return 'cancelled';
  return 'pending';
}
