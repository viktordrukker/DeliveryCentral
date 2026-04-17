import type { StaffingDeskRow, StatusGroup } from '@/lib/api/staffing-desk';

export type { StaffingDeskRow, StatusGroup };

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
