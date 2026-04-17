import { useMemo } from 'react';

/**
 * Inline mini-timeline bar for table rows.
 * Shows a compact 6-month window with colored blocks for each assignment.
 */

interface MiniTimelineProps {
  allocationPercent: number;
  endDate: string | null;
  startDate: string;
  status: string;
}

function statusColor(s: string): string {
  const u = s.toUpperCase();
  if (u === 'ACTIVE' || u === 'APPROVED') return 'var(--color-status-active)';
  if (u === 'REQUESTED' || u === 'OPEN' || u === 'IN_REVIEW') return 'var(--color-status-pending)';
  if (u === 'ENDED' || u === 'FULFILLED') return 'var(--color-status-neutral)';
  if (u === 'DRAFT') return 'var(--color-status-info)';
  return 'var(--color-text-subtle)';
}

const BAR_WIDTH = 120;
const BAR_HEIGHT = 14;

export function MiniTimeline({ allocationPercent, endDate, startDate, status }: MiniTimelineProps): JSX.Element {
  const { barLeft, barWidth, todayPct } = useMemo(() => {
    const now = new Date();
    // 6-month window: 3 months back, 3 months forward
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    const totalMs = windowEnd.getTime() - windowStart.getTime();

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : windowEnd;

    const startPct = Math.max(0, Math.min(100, ((start.getTime() - windowStart.getTime()) / totalMs) * 100));
    const endPct = Math.max(0, Math.min(100, ((end.getTime() - windowStart.getTime()) / totalMs) * 100));
    const todayPct = Math.max(0, Math.min(100, ((now.getTime() - windowStart.getTime()) / totalMs) * 100));

    return {
      barLeft: startPct,
      barWidth: Math.max(2, endPct - startPct),
      todayPct,
    };
  }, [startDate, endDate]);

  const color = statusColor(status);
  const opacity = allocationPercent > 80 ? 1 : allocationPercent > 40 ? 0.7 : 0.4;

  return (
    <div style={{ width: BAR_WIDTH, height: BAR_HEIGHT, position: 'relative', background: 'var(--color-surface-alt)', borderRadius: 2, overflow: 'hidden' }}>
      {/* Assignment bar */}
      <div style={{
        position: 'absolute',
        left: `${barLeft}%`,
        width: `${barWidth}%`,
        top: 1,
        bottom: 1,
        background: color,
        opacity,
        borderRadius: 1,
      }} />
      {/* Today marker */}
      <div style={{
        position: 'absolute',
        left: `${todayPct}%`,
        top: 0,
        bottom: 0,
        borderLeft: '1px solid var(--color-accent)',
        zIndex: 1,
      }} />
    </div>
  );
}
