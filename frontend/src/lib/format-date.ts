import { format, formatDistanceToNow, isValid, parseISO, startOfWeek, endOfWeek } from 'date-fns';

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = typeof input === 'string' ? parseISO(input) : input;
  return isValid(d) ? d : null;
}

/** "Apr 12, 2026" */
export function formatDate(input: string | Date | null | undefined): string {
  const d = toDate(input);
  return d ? format(d, 'MMM d, yyyy') : '\u2014';
}

/** "12 Apr 2026" (compact for tables) */
export function formatDateShort(input: string | Date | null | undefined): string {
  const d = toDate(input);
  return d ? format(d, 'd MMM yyyy') : '\u2014';
}

/** "2026-04-12" (for API/sorting) */
export function formatDateISO(input: string | Date | null | undefined): string {
  const d = toDate(input);
  return d ? format(d, 'yyyy-MM-dd') : '';
}

/** "2 days ago" / "in 3 hours" */
export function formatRelative(input: string | Date | null | undefined): string {
  const d = toDate(input);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '\u2014';
}

/** "Apr 12 – Apr 18, 2026" */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return '\u2014';
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
  }
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`;
}

/** "Week 15, Apr 6 – 12, 2026" */
export function formatWeek(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return '\u2014';
  const weekNum = format(d, 'I');
  const ws = startOfWeek(d, { weekStartsOn: 1 });
  const we = endOfWeek(d, { weekStartsOn: 1 });
  return `Week ${weekNum}, ${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`;
}

/** "Apr 12, 2026 15:30" (with time) */
export function formatDateTime(input: string | Date | null | undefined): string {
  const d = toDate(input);
  return d ? format(d, 'MMM d, yyyy HH:mm') : '\u2014';
}
