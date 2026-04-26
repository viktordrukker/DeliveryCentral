import { useEffect, useState } from 'react';

import { checkAllocationConflict } from '@/lib/api/staffing-requests';

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
      checkAllocationConflict({
        allocation: allocationPercent,
        from: startDate,
        personId,
        to,
      })
        .then((res) => {
          if (active) setTotal(res.totalAllocationPercent);
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
          Utilisation preview: existing {existing}% + new {allocationPercent}%
        </span>
        <span style={{ fontWeight: 600, color: isOver ? 'var(--color-status-danger)' : 'var(--color-text)' }}>
          {isLoading ? '…' : `${total ?? 0}%`}
        </span>
      </div>
      <div style={{ position: 'relative', background: 'var(--color-border)', borderRadius: 3, height: 8, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${existingWidth}%`, background: 'var(--color-text-subtle)' }} />
        <div style={{ position: 'absolute', left: `${existingWidth}%`, top: 0, bottom: 0, width: `${newWidth}%`, background: barColor }} />
      </div>
      {isOver ? (
        <div style={{ marginTop: 4, color: 'var(--color-status-danger)', fontWeight: 600 }}>
          Over-allocated by {overflowWidth}% {'\u2014'} review or reduce this assignment.
        </div>
      ) : null}
    </div>
  );
}
