import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, EditableCell, Table, Timeline, type Column, type TimelineSegment } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { fetchMonthlyTimesheet, type MonthlyTimesheetResponse } from '@/lib/api/my-time';
import { submitTimesheetWeek, upsertTimesheetEntry } from '@/lib/api/timesheets';
import { MyTimePage } from '@/routes/my-time/MyTimePage';

type GridRow =
  | { kind: 'project'; projectId: string; code: string; name: string; days: Map<string, number> }
  | { kind: 'total'; days: number[] };

/**
 * /me?tab=time — week-timeline strip above the existing monthly time-entry surface.
 *
 * The strip shows the current week (Mon–Sun) with one bar per project,
 * width = day-span the entries cover, height = allocationPercent =
 * project-week-hours / 40 × 100 (40h = full-time week). Uses the lifecycle
 * Timeline (colorMode='lifecycle') with status="assigned" so the bars
 * read in workspace green.
 *
 * Below the strip, the existing MyTimePage handles all the heavy
 * monthly-grid work. No rewrite — additive only.
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

  useEffect(() => {
    let active = true;
    fetchMonthlyTimesheet(monthKey)
      .then((res) => {
        if (active) {
          setData(res);
          setOverrides(new Map());
        }
      })
      .catch(() => {
        // strip is decorative; legacy MyTimePage below has its own loading + error states
      });
    return () => {
      active = false;
    };
  }, [monthKey, refetchTick]);

  const weekSegments: TimelineSegment[] = useMemo(() => {
    if (!data) return [];
    // Compute this Monday's date.
    const day = today.getDay(); // 0=Sun..6=Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    // Filter entries to this week + group by projectId.
    type ProjectAcc = { projectId: string; projectName: string; projectCode: string; hours: number; minDate: string; maxDate: string };
    const byProject = new Map<string, ProjectAcc>();
    for (const e of data.entries) {
      const d = new Date(e.date);
      if (d < monday || d > sunday) continue;
      const k = e.projectId;
      const cur = byProject.get(k);
      if (cur) {
        cur.hours += e.hours;
        if (e.date < cur.minDate) cur.minDate = e.date;
        if (e.date > cur.maxDate) cur.maxDate = e.date;
      } else {
        byProject.set(k, {
          projectId: e.projectId,
          projectName: e.projectName,
          projectCode: e.projectCode,
          hours: e.hours,
          minDate: e.date,
          maxDate: e.date,
        });
      }
    }

    const out: TimelineSegment[] = [];
    for (const p of byProject.values()) {
      out.push({
        id: p.projectId,
        label: `${p.projectName} · ${p.hours.toFixed(1)}h`,
        startDate: p.minDate,
        endDate: p.maxDate,
        status: 'assigned',
        allocationPercent: Math.round((p.hours / 40) * 100),
        href: `/projects/${p.projectId}`,
      });
    }
    return out.sort((a, b) => (b.allocationPercent ?? 0) - (a.allocationPercent ?? 0));
  }, [data, today]);

  const weeklyTotals = useMemo(() => {
    if (!data) return { reported: 0, expected: 0, variance: 0 };
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    let reported = 0;
    for (const e of data.entries) {
      const d = new Date(e.date);
      if (d >= monday && d <= sunday) reported += e.hours;
    }
    const expected = 40; // standard week — matches MyTimePage convention
    return { reported, expected, variance: reported - expected };
  }, [data, today]);

  const monday = (() => {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
  })();
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  // V2 weekly grid (dsRefresh ON): project × day matrix sourced from the same
  // MonthlyTimesheetResponse the timeline strip already consumes. Read-only v1
  // — editable cells + submit-week defer to a follow-up.
  const dsRefresh = isFeatureEnabled('dsRefresh');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {dsRefresh && weekDays.length === 7 ? (
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
                  No hours logged for this week. Use the grid below to start logging.
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
      ) : (
        <SectionCard title={`This week · ${formatRange(monday, sunday)}`}>
          {weekSegments.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-compact)' }}>
              No hours logged this week yet. The full monthly grid is below — start logging there.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', fontSize: 12 }}>
                <KpiInline label="Reported" value={`${weeklyTotals.reported.toFixed(1)}h`} />
                <KpiInline label="Expected" value={`${weeklyTotals.expected}h`} />
                <KpiInline
                  label="Variance"
                  value={`${weeklyTotals.variance >= 0 ? '+' : ''}${weeklyTotals.variance.toFixed(1)}h`}
                  tone={weeklyTotals.variance < 0 ? 'warning' : weeklyTotals.variance > 4 ? 'info' : 'active'}
                />
              </div>
              <div style={{ height: 140 }}>
                <Timeline
                  segments={weekSegments}
                  colorMode="lifecycle"
                  variant="stacked"
                  size="md"
                  rangeStart={monday.toISOString().slice(0, 10)}
                  rangeEnd={sunday.toISOString().slice(0, 10)}
                  showToday
                  ariaLabel="This week's logged hours by project"
                  onSegmentClick={(seg) => seg.href && (window.location.href = seg.href)}
                />
              </div>
            </>
          )}
        </SectionCard>
      )}

      <MyTimePage />
    </div>
  );
}

interface KpiInlineProps {
  label: string;
  value: string;
  tone?: 'active' | 'warning' | 'info';
}

function KpiInline({ label, value, tone }: KpiInlineProps): JSX.Element {
  const color =
    tone === 'warning'
      ? 'var(--color-status-warning)'
      : tone === 'info'
        ? 'var(--color-status-info)'
        : tone === 'active'
          ? 'var(--color-status-active)'
          : 'var(--color-text)';
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color }}>{value}</span>
    </span>
  );
}

function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date): string => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}
