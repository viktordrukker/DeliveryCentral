export type AgingTone = 'neutral' | 'warning' | 'danger';

const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_THRESHOLD_DAYS = 3;
const DANGER_THRESHOLD_DAYS = 7;

/**
 * Returns aging tone based on how many days ago a staffing request was created:
 *   < 3 days  → neutral (grey)
 *   3-7 days  → warning (amber)
 *   > 7 days  → danger (red)
 */
export function getAgingTone(createdAt: string, now: Date = new Date()): AgingTone {
  const created = new Date(createdAt).getTime();
  const ageDays = (now.getTime() - created) / DAY_MS;
  if (ageDays > DANGER_THRESHOLD_DAYS) return 'danger';
  if (ageDays >= WARN_THRESHOLD_DAYS) return 'warning';
  return 'neutral';
}

export function getAgingDays(createdAt: string, now: Date = new Date()): number {
  const created = new Date(createdAt).getTime();
  return Math.floor((now.getTime() - created) / DAY_MS);
}

export function getAgingTooltip(tone: AgingTone): string {
  switch (tone) {
    case 'danger':
      return 'Open more than 7 days — aging risk';
    case 'warning':
      return 'Open 3–7 days — monitor closely';
    default:
      return 'Open less than 3 days';
  }
}
