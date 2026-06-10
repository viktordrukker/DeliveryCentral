import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, EditableCell, Table, type Column } from '@/components/ds';
import { fetchMonthlyTimesheet, type MonthlyTimesheetResponse } from '@/lib/api/my-time';
import { submitTimesheetWeek, upsertTimesheetEntry } from '@/lib/api/timesheets';

type GridRow =
  | { kind: 'project'; projectId: string; code: string; name: string; days: Map<string, number> }
  | { kind: 'total'; days: number[] };

/**
 * /me?tab=time — Weekly grid (project × day matrix).
 *
 * SoT PR 13 cleanup: monthly fallback and the legacy Timeline strip have
 * been removed. The weekly grid is the only view — DS canvas-style day
 * boxes with editable cells (DRAFT/REJECTED weeks) and inline submit.
 */
export function TimeTab(): JSX.Element {
  const today = useMemo(() => new Date(), []);
  const monthKey = useMemo(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, [today]);
  const [data, setData] = useState<MonthlyTimesheetResponse | null>(null);
  // Optimistic overrides keyed by `${projectId}|${YYYY-MM-DD}` → hours.
  // Pre-populated on successful upsert; cleared on refetch.
  const [overrides, setOverrides] = useState<Map<string, number>>(() => new Map());
  const [submitting, setSubmitting] = useState(false);
  const [refetchTick, setRefetchTick] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetchMonthlyTimesheet(monthKey)
      .then((res) => {
        if (active) {
          setData(res);
          setOverrides(new Map());
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load your timesheet.');
        }
      });
    return () => {
      active = false;
    };
  }, [monthKey, refetchTick]);

  const sortedWeeks = useMemo(
    () => (data ? [...data.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)) : []),
    [data],
  );
  const defaultWeekIdx = useMemo(() => {
    if (!sortedWeeks.length) return 0;
    for (let i = 0; i < sortedWeeks.length; i++) {
      const start = new Date(sortedWeeks[i].weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (today >= start && today <= end) return i;
    }
    return Math.max(0, sortedWeeks.length - 1);
  }, [sortedWeeks, today]);
  const [weekIdx, setWeekIdx] = useState(0);
  useEffect(() => {
    setWeekIdx(defaultWeekIdx);
  }, [defaultWeekIdx]);
  const selectedWeek = sortedWeeks[weekIdx];
  const weekDays = useMemo(() => {
    if (!selectedWeek) return [] as Date[];
    const start = new Date(selectedWeek.weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedWeek]);
  const projectRows = useMemo(() => {
    if (!data || !selectedWeek || weekDays.length === 0) {
      return [] as Array<{ projectId: string; code: string; name: string; days: Map<string, number> }>;
    }
    const startKey = weekDays[0].toISOString().slice(0, 10);
    const endKey = weekDays[6].toISOString().slice(0, 10);
    const labels = new Map<string, { code: string; name: string }>();
    for (const a of data.assignmentRows) {
      labels.set(a.projectId, { code: a.projectCode, name: a.projectName });
    }
    const rows = new Map<string, Map<string, number>>();
    for (const e of data.entries) {
      const ek = e.date.slice(0, 10);
      if (ek < startKey || ek > endKey) continue;
      if (!labels.has(e.projectId)) {
        labels.set(e.projectId, { code: e.projectCode, name: e.projectName });
      }
      const r = rows.get(e.projectId) ?? new Map<string, number>();
      r.set(ek, (r.get(ek) ?? 0) + e.hours);
      rows.set(e.projectId, r);
    }
    // Apply optimistic overrides: replace cell totals with the latest committed
    // value. Also ensure the (projectId × date) row exists even if no entries
    // were in the original payload (e.g. first cell on an unstarted row).
    for (const [k, hours] of overrides.entries()) {
      const [pid, ek] = k.split('|');
      if (!pid || !ek) continue;
      if (ek < startKey || ek > endKey) continue;
      const r = rows.get(pid) ?? new Map<string, number>();
      r.set(ek, hours);
      rows.set(pid, r);
    }
    // For assignmentRows that had no entries this week, still surface a row
    // so the user has a target cell to edit.
    for (const a of data.assignmentRows) {
      if (!rows.has(a.projectId)) rows.set(a.projectId, new Map());
    }
    return Array.from(rows.entries())
      .map(([projectId, days]) => {
        const lbl = labels.get(projectId) ?? { code: '', name: projectId };
        return { projectId, code: lbl.code, name: lbl.name, days };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data, selectedWeek, weekDays, overrides]);
  const dailyTotals = useMemo(() => {
    const totals = new Array(7).fill(0) as number[];
    if (!projectRows.length || weekDays.length === 0) return totals;
    for (let i = 0; i < 7; i++) {
      const k = weekDays[i].toISOString().slice(0, 10);
      for (const row of projectRows) {
        totals[i] += row.days.get(k) ?? 0;
      }
    }
    return totals;
  }, [projectRows, weekDays]);
  const weekStatus = selectedWeek?.status ?? 'DRAFT';
  const weekStatusTone: 'active' | 'info' | 'neutral' | 'warning' =
    weekStatus === 'APPROVED' ? 'active' : weekStatus === 'SUBMITTED' ? 'info' : weekStatus === 'REJECTED' ? 'warning' : 'neutral';
  const isEditable = weekStatus === 'DRAFT' || weekStatus === 'REJECTED';

  // Commits a single cell edit. Optimistically updates the local overrides map
  // then calls the BE upsert. On error, revert the override entry so the cell
  // snaps back to the server-truth value.
  const commitHours = useCallback(
    async (projectId: string, dateKey: string, weekStartKey: string, prevValue: number, next: number) => {
      const overrideKey = `${projectId}|${dateKey}`;
      // Optimistic.
      setOverrides((m) => {
        const copy = new Map(m);
        copy.set(overrideKey, next);
        return copy;
      });
      try {
        await upsertTimesheetEntry({
          weekStart: weekStartKey,
          projectId,
          date: dateKey,
          hours: next,
          capex: false,
        });
      } catch (err) {
        // Revert.
        setOverrides((m) => {
          const copy = new Map(m);
          copy.set(overrideKey, prevValue);
          return copy;
        });
        toast.error(err instanceof Error ? err.message : 'Failed to save hours');
        throw err;
      }
    },
    [],
  );

  const handleSubmitWeek = useCallback(async () => {
    if (!selectedWeek || submitting) return;
    setSubmitting(true);
    try {
      await submitTimesheetWeek(selectedWeek.weekStart);
      toast.success('Week submitted for approval');
      setRefetchTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit week');
    } finally {
      setSubmitting(false);
    }
  }, [selectedWeek, submitting]);

  const gridColumns: Column<GridRow>[] = useMemo(() => {
    const cols: Column<GridRow>[] = [
      {
        key: 'project',
        title: 'Project',
        align: 'left',
        sortable: false,
        filter: false,
        render: (row) =>
          row.kind === 'total' ? (
            'Daily total'
          ) : (
            <span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.code}</span>{' '}
              <span>{row.name}</span>
            </span>
          ),
      },
    ];
    const weekStartKey = selectedWeek?.weekStart ?? '';
    weekDays.forEach((d, idx) => {
      const k = d.toISOString().slice(0, 10);
      const dayColumn: Column<GridRow, number> = {
        key: `day-${k}`,
        title: (
          <span>
            {d.toLocaleDateString('en-US', { weekday: 'short' })}
            <br />
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 400 }}>{d.getDate()}</span>
          </span>
        ),
        align: 'right',
        width: 56,
        sortable: false,
        filter: false,
        getValue: (row) => (row.kind === 'total' ? row.days[idx] : row.days.get(k) ?? 0),
        render: (row) => {
          const h = row.kind === 'total' ? row.days[idx] : row.days.get(k) ?? 0;
          const display = (
            <span style={{ fontVariantNumeric: 'tabular-nums', color: h > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
              {h > 0 ? h.toFixed(1) : '—'}
            </span>
          );
          // Total row: never editable.
          if (row.kind === 'total') return display;
          // Editable only when the week is DRAFT/REJECTED and we have a week-start key.
          if (!isEditable || !weekStartKey) return display;
          return (
            <EditableCell<GridRow, number>
              row={row}
              rowIndex={idx}
              column={dayColumn}
              displayContent={display}
            />
          );
        },
        edit: isEditable && weekStartKey
          ? {
              kind: 'number',
              enabledFor: (row) => row.kind === 'project',
              validate: (next) => {
                const n = Number(next);
                if (Number.isNaN(n)) return 'Must be a number';
                if (n < 0) return 'Must be ≥ 0';
                if (n > 24) return 'Max 24h per day';
                return null;
              },
              commit: async (row, next) => {
                if (row.kind !== 'project') return;
                const prev = row.days.get(k) ?? 0;
                const n = Number(next ?? 0);
                if (n === prev) return;
                await commitHours(row.projectId, k, weekStartKey, prev, n);
              },
            }
          : undefined,
      };
      cols.push(dayColumn as Column<GridRow>);
    });
    return cols;
  }, [weekDays, selectedWeek, isEditable, commitHours]);

  const gridRows: GridRow[] = useMemo(() => {
    if (projectRows.length === 0) return [];
    const projects: GridRow[] = projectRows.map((r) => ({
      kind: 'project',
      projectId: r.projectId,
      code: r.code,
      name: r.name,
      days: r.days,
    }));
    const total: GridRow = { kind: 'total', days: dailyTotals };
    return [...projects, total];
  }, [projectRows, dailyTotals]);

  if (loadError && !data) {
    return (
      <SectionCard title="Weekly grid">
        <ErrorState
          variant="card"
          description={loadError}
          onRetry={() => setRefetchTick((t) => t + 1)}
        />
      </SectionCard>
    );
  }

  if (weekDays.length !== 7) {
    return (
      <SectionCard title="Weekly grid">
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-compact)' }}>
          Loading your timesheet…
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span>Weekly grid · {formatRange(weekDays[0], weekDays[6])}</span>
          <StatusBadge tone={weekStatusTone} label={weekStatus} variant="chip" size="small" />
        </span>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={weekIdx <= 0}
          onClick={() => setWeekIdx((v) => Math.max(0, v - 1))}
        >
          ← Prev week
        </Button>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Week {weekIdx + 1} of {sortedWeeks.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={weekIdx >= sortedWeeks.length - 1}
          onClick={() => setWeekIdx((v) => Math.min(sortedWeeks.length - 1, v + 1))}
        >
          Next week →
        </Button>
      </div>
      <div data-testid="me-time-weekly-grid">
        <Table<GridRow>
          variant="compact"
          columns={gridColumns}
          rows={gridRows}
          getRowKey={(row) => (row.kind === 'project' ? row.projectId : 'total')}
          rowStyle={(row) =>
            row.kind === 'total'
              ? { background: 'var(--color-surface-alt)', fontWeight: 600 }
              : undefined
          }
          emptyState={
            <span style={{ color: 'var(--color-text-muted)' }}>
              No hours logged for this week. Click any cell to start logging.
            </span>
          }
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 'var(--space-3)',
          gap: 'var(--space-2)',
          alignItems: 'center',
        }}
      >
        {weekStatus !== 'DRAFT' && weekStatus !== 'REJECTED' && (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {weekStatus === 'SUBMITTED' ? 'Awaiting approval' : weekStatus === 'APPROVED' ? 'Approved' : weekStatus}
          </span>
        )}
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={!isEditable || submitting || !selectedWeek}
          onClick={handleSubmitWeek}
          data-testid="me-time-submit-week"
        >
          {submitting ? 'Submitting…' : 'Submit week'}
        </Button>
      </div>
    </SectionCard>
  );
}

function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date): string => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}
