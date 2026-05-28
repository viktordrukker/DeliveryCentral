/* Shared workload visualization helpers — extracted from WorkloadPlanningPage */

import { startOfWeek, format } from 'date-fns';

export function blockStyle(pct: number): { background: string; color: string } {
  if (pct >= 100) return { background: 'color-mix(in srgb, var(--color-status-danger) 20%, transparent)', color: 'var(--color-status-danger)' };
  if (pct >= 80) return { background: 'color-mix(in srgb, var(--color-status-warning) 20%, transparent)', color: 'var(--color-status-warning)' };
  if (pct >= 50) return { background: 'color-mix(in srgb, var(--color-status-active) 26%, transparent)', color: 'var(--color-status-active)' };
  return { background: 'color-mix(in srgb, var(--color-status-active) 14%, transparent)', color: 'var(--color-status-active)' };
}

export function getCellBackground(total: number): string {
  if (total === 0) return 'var(--color-surface)';
  if (total > 100) return 'color-mix(in srgb, var(--color-status-danger) 35%, var(--color-surface))';
  if (total >= 80) return 'color-mix(in srgb, var(--color-status-active) 35%, var(--color-surface))';
  if (total >= 50) return 'color-mix(in srgb, var(--color-status-info) 35%, var(--color-surface))';
  return 'color-mix(in srgb, var(--color-status-info) 18%, var(--color-surface))';
}

export function getCellTextColor(total: number): string {
  if (total === 0) return 'var(--color-text-subtle)';
  if (total > 100) return 'var(--color-status-danger)';
  if (total >= 80) return 'var(--color-status-active)';
  return 'var(--color-status-info)';
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getCurrentWeekMonday(): string {
  const d = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(d, 'yyyy-MM-dd');
}

export function generateWeeks(count: number, startMonday?: string): string[] {
  const base = startMonday ?? getCurrentWeekMonday();
  const weeks: string[] = [];
  for (let i = 0; i < count; i++) {
    weeks.push(addDays(base, i * 7));
  }
  return weeks;
}

export function assignmentOverlapsWeek(
  assignment: { validFrom: string; validTo: string | null },
  weekStart: string,
): boolean {
  const weekEnd = addDays(weekStart, 7);
  const start = assignment.validFrom;
  const end = assignment.validTo ?? '9999-12-31';
  return start < weekEnd && end > weekStart;
}

export function getTotalAllocationForWeek(
  assignments: Array<{ allocationPercent: number; validFrom: string; validTo: string | null }>,
  weekStart: string,
): number {
  return assignments
    .filter((a) => assignmentOverlapsWeek(a, weekStart))
    .reduce((sum, a) => sum + a.allocationPercent, 0);
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  return format(d, 'dd MMM');
}
