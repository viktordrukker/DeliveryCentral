/* Shared workload visualization helpers — extracted from WorkloadPlanningPage */

import { startOfWeek, format } from 'date-fns';

export function blockStyle(pct: number): { background: string; color: string } {
  if (pct >= 100) return { background: 'rgba(211,47,47,.20)', color: '#b71c1c' };
  if (pct >= 80) return { background: 'rgba(245,124,0,.20)', color: '#e65100' };
  if (pct >= 50) return { background: 'rgba(46,125,50,.26)', color: '#1b5e20' };
  return { background: 'rgba(46,125,50,.14)', color: '#2e7d32' };
}

export function getCellBackground(total: number): string {
  if (total === 0) return 'var(--color-surface)';
  if (total > 100) return '#fca5a5';
  if (total >= 80) return '#86efac';
  if (total >= 50) return '#93c5fd';
  return '#bfdbfe';
}

export function getCellTextColor(total: number): string {
  if (total === 0) return 'var(--color-text-subtle)';
  if (total > 100) return '#991b1b';
  if (total >= 80) return '#14532d';
  return '#1e40af';
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
