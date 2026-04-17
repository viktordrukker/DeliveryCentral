import { useMemo } from 'react';

/**
 * Timeline visualization for a demand (staffing request) row.
 * Shows the demand period as a colored bar across a -3m / +9m window,
 * with allocation height, priority-based color, and today marker.
 * Mirrors WorkloadTimeline visual language but for unfilled demand.
 */

interface Props {
  allocationPercent: number;
  endDate: string;
  headcountFulfilled: number;
  headcountRequired: number;
  priority: string | null;
  startDate: string;
}

function priorityColor(p: string | null): string {
  if (!p) return 'var(--color-status-info)';
  switch (p.toUpperCase()) {
    case 'URGENT': return 'var(--color-status-danger)';
    case 'HIGH': return 'var(--color-status-warning)';
    case 'MEDIUM': return 'var(--color-status-info)';
    default: return 'var(--color-status-neutral)';
  }
}

const CHART_HEIGHT = 36;

export function DemandTimeline({ allocationPercent, endDate, headcountFulfilled, headcountRequired, priority, startDate }: Props): JSX.Element {
  const { barLeft, barWidth, fillRatio, todayPct } = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 9, 0);
    const totalMs = windowEnd.getTime() - windowStart.getTime();

    const start = new Date(startDate);
    const end = new Date(endDate);

    const startPct = Math.max(0, Math.min(100, ((start.getTime() - windowStart.getTime()) / totalMs) * 100));
    const endPct = Math.max(0, Math.min(100, ((end.getTime() - windowStart.getTime()) / totalMs) * 100));
    const todayPct = Math.max(0, Math.min(100, ((now.getTime() - windowStart.getTime()) / totalMs) * 100));

    return {
      barLeft: startPct,
      barWidth: Math.max(2, endPct - startPct),
      fillRatio: headcountRequired > 0 ? headcountFulfilled / headcountRequired : 0,
      todayPct,
    };
  }, [startDate, endDate, headcountFulfilled, headcountRequired]);

  const color = priorityColor(priority);
  const heightPct = Math.max(20, Math.min(100, (allocationPercent / 100) * 100));

  return (
    <div style={{ position: 'relative', height: CHART_HEIGHT, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'visible' }}>
      {/* Demand block — dashed border for unfilled, solid for partial fill */}
      <div style={{
        position: 'absolute',
        left: `${barLeft}%`,
        width: `${barWidth}%`,
        bottom: 0,
        height: `${heightPct}%`,
        background: `${color}`,
        opacity: 0.15,
        borderRadius: '2px 2px 0 0',
        border: `2px dashed ${color}`,
      }} />

      {/* Filled portion overlay */}
      {fillRatio > 0 && (
        <div style={{
          position: 'absolute',
          left: `${barLeft}%`,
          width: `${barWidth * fillRatio}%`,
          bottom: 0,
          height: `${heightPct}%`,
          background: color,
          opacity: 0.35,
          borderRadius: '2px 2px 0 0',
        }} />
      )}

      {/* Today marker */}
      <div style={{
        position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
        borderLeft: '2px solid var(--color-accent)', zIndex: 3,
      }} />

      {/* Label inside the block */}
      <div style={{
        position: 'absolute', left: `${barLeft + 1}%`, bottom: 2,
        fontSize: 8, fontWeight: 600, color, whiteSpace: 'nowrap', zIndex: 2,
      }}>
        {allocationPercent}% &middot; {headcountFulfilled}/{headcountRequired} HC
        {priority ? ` &middot; ${priority}` : ''}
      </div>

      {/* 100% line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '100%',
        borderTop: '1px dashed var(--color-border)', opacity: 0.3,
      }} />
    </div>
  );
}
