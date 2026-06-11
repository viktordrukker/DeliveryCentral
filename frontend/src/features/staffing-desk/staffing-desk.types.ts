import type { StaffingDeskRow, StatusGroup } from '@/lib/api/staffing-desk';
import type { PositionFillStatus } from '@/lib/api/project-positions';

export type { StaffingDeskRow, StatusGroup };

// PR-13 — normalize desk-row statuses onto the lean fill-status vocabulary.
// Assignment rows already carry raw `fillStatus` values; request rows surface
// the BE's legacy-mapped vocabulary (IN_REVIEW/FULFILLED/CANCELLED). Old
// AssignmentStatus keys are accepted too. Mirrors the backend
// `mapLegacyAssignmentStatus` in position-fill-status.ts.
const LEGACY_TO_LEAN: Record<string, PositionFillStatus> = {
  CREATED: 'OPEN',
  REQUESTED: 'PROPOSED',
  IN_REVIEW: 'PROPOSED',
  APPROVED: 'BOOKED',
  FULFILLED: 'BOOKED',
  ACTIVE: 'ASSIGNED',
  REJECTED: 'RELEASED',
  COMPLETED: 'RELEASED',
  CANCELLED: 'RELEASED',
  ENDED: 'RELEASED',
  REVOKED: 'RELEASED',
  ARCHIVED: 'RELEASED',
};

const LEAN_FILL_STATUSES: ReadonlySet<string> = new Set([
  'DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'RELEASED',
]);

export function toLeanFillStatus(status: string): PositionFillStatus {
  const upper = status.toUpperCase();
  if (LEAN_FILL_STATUSES.has(upper)) return upper as PositionFillStatus;
  return LEGACY_TO_LEAN[upper] ?? 'DRAFT';
}

// PR-13 — canonical reference to emit to /project-positions/:id/transition.
// Migrated rows carry the legacy assignment/request id in `row.id`, which the
// lean endpoint cannot resolve; the backfilled `pos_…` publicId is the
// resolvable reference. Post-cutover rows have `row.id` = ProjectPosition.id.
export function positionRef(row: StaffingDeskRow): string {
  return row.positionPublicId ?? row.id;
}

export function isAssignment(row: StaffingDeskRow): boolean {
  return row.kind === 'assignment';
}

export function isRequest(row: StaffingDeskRow): boolean {
  return row.kind === 'request';
}

export type StatusBadgeTone = 'active' | 'danger' | 'info' | 'neutral' | 'pending' | 'warning';

export function statusTone(row: StaffingDeskRow): StatusBadgeTone {
  switch (row.statusGroup) {
    case 'active': return 'active';
    case 'pending': return 'pending';
    case 'done': return 'neutral';
    case 'cancelled': return 'danger';
    case 'draft': return 'info';
    default: return 'info';
  }
}

export function priorityTone(priority: string | null): StatusBadgeTone {
  if (!priority) return 'neutral';
  switch (priority.toUpperCase()) {
    case 'URGENT': return 'danger';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'info';
    case 'LOW': return 'neutral';
    default: return 'neutral';
  }
}

export function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (!end) return `${s} — Open-ended`;
  const e = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${s} — ${e}`;
}
