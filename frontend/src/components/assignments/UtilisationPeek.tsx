import { useEffect, useState } from 'react';

import { Pct } from '@/components/ds';
import { listProjectPositions } from '@/lib/api/project-positions';

interface Props {
  personId: string;
  startDate: string;
  endDate: string;
  allocationPercent: number;
}

/**
 * Live capacity preview for an assignment-in-progress. Calls
 * `GET /workload/check-conflict` with 300ms debounce and renders a
 * capacity bar plus delta / total % so users see over-allocation before
 * they submit.
 */
export function UtilisationPeek({ personId, startDate, endDate, allocationPercent }: Props): JSX.Element | null {
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!personId || !startDate || allocationPercent <= 0) {
      setTotal(null);
      return;
    }
    const to = endDate && endDate >= startDate ? endDate : startDate;
    let active = true;
    setIsLoading(true);

    const handle = setTimeout(() => {
      // LEAN-P2: legacy /workload/check-conflict replaced by a client-side
      // sum over /project-positions filtered to the person's active fills.
      // The lean conflict-check endpoint lands in LEAN-P2-11; until then we
      // sum allocationPercent across BOOKED/ASSIGNED/ONBOARDING positions
      // intersecting the [startDate, to] window.
      listProjectPositions({
        activePersonId: personId,
        fillStatuses: ['BOOKED', 'ASSIGNED', 'ONBOARDING'],
        take: 100,
      })
        .then((res) => {
          if (!active) return;
          const existing = res.positions
            .filter((p) => {
              const from = p.activeValidFrom ?? '0000-01-01';
              const until = p.activeValidTo ?? '9999-12-31';
              return from <= to && until >= startDate;
            })
            .reduce((sum, p) => sum + (p.activeAllocationPercent ?? 0), 0);
          setTotal(existing + allocationPercent);
        })
        .catch(() => {
          if (active) setTotal(null);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [personId, startDate, endDate, allocationPercent]);

  if (total === null && !isLoading) return null;

  const existing = total !== null ? Math.max(0, total - allocationPercent) : 0;
  const isOver = total !== null && total > 100;
  const barColor = isOver
    ? 'var(--color-status-danger)'
    : total !== null && total >= 85
    ? 'var(--color-status-warning)'
    : 'var(--color-status-active)';

  const existingWidth = Math.min(100, existing);
  const newWidth = Math.min(100 - existingWidth, allocationPercent);
  const overflowWidth = isOver ? Math.min(100, total - 100) : 0;

  return (
    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span>
          Utilisation preview: existing <Pct value={existing} fractionDigits={0} /> + new <Pct value={allocationPercent} fractionDigits={0} />
        </span>
        <span style={{ fontWeight: 600, color: isOver ? 'var(--color-status-danger)' : 'var(--color-text)' }}>
          {isLoading ? '…' : <Pct value={total ?? 0} fractionDigits={0} />}
        </span>
      </div>
      <div style={{ position: 'relative', background: 'var(--color-border)', borderRadius: 3, height: 8, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${existingWidth}%`, background: 'var(--color-text-subtle)' }} />
        <div style={{ position: 'absolute', left: `${existingWidth}%`, top: 0, bottom: 0, width: `${newWidth}%`, background: barColor }} />
      </div>
      {isOver ? (
        <div style={{ marginTop: 4, color: 'var(--color-status-danger)', fontWeight: 600 }}>
          Over-allocated by <Pct value={overflowWidth} fractionDigits={0} /> {'\u2014'} review or reduce this assignment.
        </div>
      ) : null}
    </div>
  );
}
