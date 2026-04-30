import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { fetchWorkloadPlanning, type WorkloadPlanningPerson, type WorkloadPlanningResponse } from '@/lib/api/workload';
import { fetchStaffingRequests, type StaffingRequest } from '@/lib/api/staffing-requests';
import {
  blockStyle,
  getCellBackground,
  getCellTextColor,
  generateWeeks,
  addDays,
  formatWeekLabel,
  getCurrentWeekMonday,
} from '@/lib/workload-helpers';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import { Button, Table, type Column } from '@/components/ds';

interface Props {
  filters: { from?: string; poolId?: string; to?: string };
  onRowClick?: (row: StaffingDeskRow) => void;
}

const WEEKS_PER_PAGE = 12;

const S_WRAPPER: React.CSSProperties = { overflowX: 'auto' };
const S_TABLE: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', fontSize: 12 };
const S_TH: React.CSSProperties = {
  padding: '6px 8px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)',
  borderBottom: '2px solid var(--color-border)', textAlign: 'center', whiteSpace: 'nowrap', minWidth: 80,
};
const S_NAME_TH: React.CSSProperties = {
  ...S_TH, position: 'sticky', left: 0, background: 'var(--color-surface-alt)',
  zIndex: 2, textAlign: 'left', minWidth: 150,
};
const S_NAME_TD: React.CSSProperties = {
  padding: '4px 8px', fontWeight: 500, position: 'sticky', left: 0,
  background: 'var(--color-surface)', zIndex: 1, borderRight: '1px solid var(--color-border)',
};
const S_CELL: React.CSSProperties = {
  padding: '2px 4px', verticalAlign: 'top', borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)', minHeight: 36,
};
const S_BLOCK: React.CSSProperties = {
  borderRadius: 3, padding: '1px 4px', fontSize: 10, marginBottom: 1,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
};
const S_REQUEST_BLOCK: React.CSSProperties = {
  ...S_BLOCK, border: '1px dashed var(--color-text-muted)', background: 'var(--color-surface-alt)',
  color: 'var(--color-text-muted)', fontStyle: 'italic',
};

export function StaffingDeskTimeline({ filters, onRowClick }: Props): JSX.Element {
  const [data, setData] = useState<WorkloadPlanningResponse | null>(null);
  const [requests, setRequests] = useState<StaffingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const baseMonday = useMemo(() => getCurrentWeekMonday(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const startMonday = addDays(baseMonday, weekOffset * 7);
    const endDate = addDays(startMonday, WEEKS_PER_PAGE * 7);

    Promise.all([
      fetchWorkloadPlanning({ from: startMonday, to: endDate, poolId: filters.poolId }),
      fetchStaffingRequests({ status: 'OPEN' }),
    ])
      .then(([planningData, requestData]) => {
        if (active) {
          setData(planningData);
          setRequests(requestData);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load timeline data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [baseMonday, weekOffset, filters.poolId]);

  const weeks = useMemo(
    () => generateWeeks(WEEKS_PER_PAGE, addDays(baseMonday, weekOffset * 7)),
    [baseMonday, weekOffset],
  );

  const currentWeek = baseMonday;

  const goToToday = useCallback(() => setWeekOffset(0), []);
  const goPrev = useCallback(() => setWeekOffset((o) => o - 4), []);
  const goNext = useCallback(() => setWeekOffset((o) => o + 4), []);

  if (loading) return <LoadingState variant="skeleton" skeletonType="table" />;
  if (error) return <ErrorState description={error} />;
  if (!data || data.people.length === 0) return <EmptyState title="No people in scope" description="Adjust filters to see timeline data." />;

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
        <Button variant="secondary" size="sm" onClick={goPrev} type="button">&laquo; Prev 4</Button>
        <Button variant="secondary" size="sm" onClick={goToToday} type="button">Today</Button>
        <Button variant="secondary" size="sm" onClick={goNext} type="button">Next 4 &raquo;</Button>
      </div>

      <Table
        variant="compact"
        columns={[
          {
            key: 'person',
            title: 'Person',
            cellStyle: S_NAME_TD,
            getValue: (p) => p.displayName,
            render: (p) => p.displayName,
          },
          {
            key: 'total',
            title: 'Total',
            align: 'center',
            getValue: (p) => p.assignments.filter((a) => a.status === 'APPROVED' || a.status === 'ACTIVE').reduce((sum, a) => sum + a.allocationPercent, 0),
            render: (p) => {
              const totalAlloc = p.assignments
                .filter((a) => a.status === 'APPROVED' || a.status === 'ACTIVE')
                .reduce((sum, a) => sum + a.allocationPercent, 0);
              return (
                <span style={{
                  display: 'inline-block',
                  padding: '0 6px',
                  borderRadius: 3,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: getCellTextColor(totalAlloc),
                  background: getCellBackground(totalAlloc),
                }}>{totalAlloc}%</span>
              );
            },
          },
          ...weeks.map((weekStart) => ({
            key: `wk-${weekStart}`,
            title: <span style={{ background: weekStart === currentWeek ? 'var(--color-accent-bg)' : undefined, padding: '2px 4px' }}>{formatWeekLabel(weekStart)}</span>,
            align: 'center' as const,
            cellStyle: { padding: '2px 4px', verticalAlign: 'top' as const, minWidth: 80 },
            render: (p: WorkloadPlanningPerson) => {
              const weekEnd = addDays(weekStart, 6);
              const weekAssignments = p.assignments.filter((a) => {
                const aEnd = a.validTo ?? '9999-12-31';
                return a.validFrom <= weekEnd && aEnd >= weekStart;
              });
              const weekTotal = weekAssignments.reduce((s, a) => s + a.allocationPercent, 0);
              const weekRequests = requests.filter((r) => {
                const rStart = r.startDate.slice(0, 10);
                const rEnd = r.endDate.slice(0, 10);
                return rStart <= weekEnd && rEnd >= weekStart;
              });
              return (
                <div style={{
                  background: weekStart === currentWeek ? 'var(--color-accent-bg)' : getCellBackground(weekTotal),
                  padding: 2,
                  borderRadius: 3,
                  minHeight: 28,
                }}>
                  {weekAssignments.map((a) => {
                    const { background, color } = blockStyle(a.allocationPercent);
                    return (
                      <div
                        key={a.id}
                        style={{ ...S_BLOCK, background, color }}
                        title={`${a.projectName}: ${a.allocationPercent}% (${a.validFrom} – ${a.validTo ?? 'open'})`}
                      >
                        {a.projectName.slice(0, 6)} {a.allocationPercent}%
                      </div>
                    );
                  })}
                  {weekRequests.slice(0, 2).map((r) => (
                    <div key={r.id} style={S_REQUEST_BLOCK} title={`Request: ${r.role} ${r.allocationPercent}%`}>
                      {r.role.slice(0, 8)} {r.allocationPercent}%
                    </div>
                  ))}
                </div>
              );
            },
          })),
        ] as Column<WorkloadPlanningPerson>[]}
        rows={data.people}
        getRowKey={(p) => p.id}
      />
    </div>
  );
}
