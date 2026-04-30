import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getISOWeek } from 'date-fns';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { Button, Table, type Column } from '@/components/ds';

/* ------------------------------------------------------------------
   Data shape
   ------------------------------------------------------------------ */
export interface WorkforceWeekData {
  week: string;
  allocated: number;
  idle: number;
  utilizationPct: number;
}

/* ------------------------------------------------------------------
   Custom Tooltip
   ------------------------------------------------------------------ */
function OverviewTooltip(props: Record<string, unknown>): JSX.Element | null {
  const active = props.active as boolean | undefined;
  const payloadArr = props.payload as Array<{ payload?: WorkforceWeekData }> | undefined;
  if (!active || !payloadArr || payloadArr.length === 0) return null;
  const d = payloadArr[0]?.payload;
  if (!d) return null;
  const total = d.allocated + d.idle;
  const util = d.utilizationPct;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__header">Week of {d.week}</div>
      <div className="chart-tooltip__body">
        <TRow color="var(--color-chart-5, #8b5cf6)" label="Allocated" value={`${d.allocated}`} />
        <TRow color="var(--color-status-neutral, #94a3b8)" label="Idle" value={`${d.idle}`} />
        <TRow color="var(--color-text, inherit)" label="Total" value={`${total}`} bold />
        <div className="chart-tooltip__divider" />
        <TRow
          color={util >= 85 ? 'var(--color-status-active, #22c55e)' : util >= 65 ? 'var(--color-status-warning, #f59e0b)' : 'var(--color-status-danger, #ef4444)'}
          label="Utilization"
          value={`${util}%`}
          bold
        />
        {util < 65 && <div style={{ color: 'var(--color-status-danger)', fontSize: 11, marginTop: 4 }}>Below 65% threshold</div>}
        {d.idle > 3 && <div style={{ color: 'var(--color-status-warning)', fontSize: 11, marginTop: 2 }}>{d.idle} people available</div>}
      </div>
      <div className="chart-tooltip__footer">Click to view assignments</div>
    </div>
  );
}

function TRow({ bold, color, label, value }: { bold?: boolean; color: string; label: string; value: string }): JSX.Element {
  return (
    <div className="chart-tooltip__row">
      <span className="chart-tooltip__row-label">
        <span className="chart-tooltip__swatch" style={{ background: color }} />
        {label}
      </span>
      <span style={{ fontWeight: bold ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Enriched row for table
   ------------------------------------------------------------------ */
const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface EnrichedRow {
  week: string;
  weekNo: number;
  allocated: number;
  idle: number;
  total: number;
  allocatedPct: number;
  idlePct: number;
  utilizationPct: number;
  targetDev: number;
  wowChange: number;
  wowChangePct: number;
  trend: 'up' | 'down' | 'stable';
  runningAvgUtil: number;
}

function enrichData(data: WorkforceWeekData[], target: number): EnrichedRow[] {
  let utilSum = 0;
  return data.map((row, i) => {
    const total = row.allocated + row.idle;
    const prev = i > 0 ? data[i - 1] : null;
    const wowChange = prev ? row.allocated - prev.allocated : 0;
    const wowChangePct = prev && prev.allocated > 0 ? Math.round((wowChange / prev.allocated) * 100) : 0;
    utilSum += row.utilizationPct;
    let weekNo: number;
    try { weekNo = getISOWeek(new Date(row.week)); } catch { weekNo = i + 1; }
    return {
      week: row.week, weekNo, allocated: row.allocated, idle: row.idle, total,
      allocatedPct: total > 0 ? Math.round((row.allocated / total) * 100) : 0,
      idlePct: total > 0 ? Math.round((row.idle / total) * 100) : 0,
      utilizationPct: row.utilizationPct,
      targetDev: row.utilizationPct - target,
      wowChange, wowChangePct,
      trend: wowChange > 0 ? 'up' : wowChange < 0 ? 'down' : 'stable',
      runningAvgUtil: Math.round(utilSum / (i + 1)),
    };
  });
}

function trendArrow(t: 'up' | 'down' | 'stable'): string {
  return t === 'up' ? '\u2191' : t === 'down' ? '\u2193' : '\u2192';
}
function trendColor(t: 'up' | 'down' | 'stable'): string {
  return t === 'up' ? 'var(--color-status-active)' : t === 'down' ? 'var(--color-status-danger)' : 'var(--color-text-muted)';
}
function devColor(dev: number): string {
  if (dev >= 0) return 'var(--color-status-active)';
  if (dev >= -15) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

const PAGE_SIZES = [20, 50, 100] as const;

/* ------------------------------------------------------------------
   Main Component
   ------------------------------------------------------------------ */
interface WorkforceOverviewChartProps {
  data: WorkforceWeekData[];
  targetUtilization?: number;
}

export function WorkforceOverviewChart({ data, targetUtilization = 80 }: WorkforceOverviewChartProps): JSX.Element {
  const navigate = useNavigate();
  const [view, setView] = useState<'chart' | 'table'>('chart');

  // Table state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(0);

  // Drag-select state: Shift+mousedown starts, mouseover extends, mouseup ends
  const dragAnchorRef = useRef<number>(-1);
  const isDraggingRef = useRef(false);

  // When selection is applied as chart filter
  const [chartFilter, setChartFilter] = useState<Set<string> | null>(null);

  const enriched = useMemo(() => enrichData(data, targetUtilization), [data, targetUtilization]);
  const totalPages = Math.ceil(enriched.length / pageSize);
  const pageRows = enriched.slice(page * pageSize, (page + 1) * pageSize);

  // Chart data — filtered if selection was applied
  const chartData = useMemo(() => {
    if (!chartFilter) return data;
    return data.filter((d) => chartFilter.has(d.week));
  }, [data, chartFilter]);

  // Reset page when page size changes
  useEffect(() => { setPage(0); }, [pageSize]);

  // End drag on mouseup anywhere
  useEffect(() => {
    function handleMouseUp(): void { isDraggingRef.current = false; }
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Row mousedown — start selection (skip right-click to preserve existing selection)
  const handleRowMouseDown = useCallback((globalIdx: number, e: React.MouseEvent) => {
    if (e.button === 2) return; // right-click — don't touch selection
    e.preventDefault();
    window.getSelection()?.removeAllRanges();

    // Always enable drag-select on mousedown; dragging extends the range
    isDraggingRef.current = true;
    dragAnchorRef.current = globalIdx;

    if (e.shiftKey && selected.size > 0) {
      // Shift+click: extend selection from anchor to current row
      const anchorWeek = [...selected][0];
      const anchorIdx = enriched.findIndex((r) => r.week === anchorWeek);
      const from = Math.min(anchorIdx >= 0 ? anchorIdx : globalIdx, globalIdx);
      const to = Math.max(anchorIdx >= 0 ? anchorIdx : globalIdx, globalIdx);
      const next = new Set<string>();
      for (let i = from; i <= to; i++) {
        if (enriched[i]) next.add(enriched[i].week);
      }
      dragAnchorRef.current = anchorIdx >= 0 ? anchorIdx : globalIdx;
      setSelected(next);
    } else {
      // Plain click: start fresh selection from this row
      setSelected(new Set([enriched[globalIdx].week]));
    }
  }, [enriched, selected]);

  // Row mouseenter — extend selection while dragging
  const handleRowMouseEnter = useCallback((globalIdx: number) => {
    if (!isDraggingRef.current || dragAnchorRef.current < 0) return;
    const from = Math.min(dragAnchorRef.current, globalIdx);
    const to = Math.max(dragAnchorRef.current, globalIdx);
    const next = new Set<string>();
    for (let i = from; i <= to; i++) {
      if (enriched[i]) next.add(enriched[i].week);
    }
    setSelected(next);
  }, [enriched]);

  // Right-click on table → apply selection as chart filter and switch to chart
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (selected.size > 0) {
      e.preventDefault();
      setChartFilter(new Set(selected));
      setView('chart');
    }
  }, [selected]);

  // Ctrl+C — copy selected (or all visible) rows as TSV
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && view === 'table') {
        const rows = selected.size > 0
          ? enriched.filter((r) => selected.has(r.week))
          : pageRows;
        const header = 'Week#\tWeek\tAllocated\tIdle\tTotal\tAlloc%\tIdle%\tUtil%\tvs Target\tWoW\tWoW%\tAvg Util';
        const body = rows.map((r) =>
          `W${r.weekNo}\t${r.week}\t${r.allocated}\t${r.idle}\t${r.total}\t${r.allocatedPct}%\t${r.idlePct}%\t${r.utilizationPct}%\t${r.targetDev > 0 ? '+' : ''}${r.targetDev}\t${r.wowChange > 0 ? '+' : ''}${r.wowChange}\t${r.wowChangePct > 0 ? '+' : ''}${r.wowChangePct}%\t${r.runningAvgUtil}%`
        ).join('\n');
        void navigator.clipboard.writeText(`${header}\n${body}`);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [view, selected, enriched, pageRows]);

  // Summary
  const totals = useMemo(() => {
    if (enriched.length === 0) return null;
    const src = selected.size > 0 ? enriched.filter((r) => selected.has(r.week)) : enriched;
    const sumAlloc = src.reduce((s, r) => s + r.allocated, 0);
    const sumIdle = src.reduce((s, r) => s + r.idle, 0);
    const avgUtil = Math.round(src.reduce((s, r) => s + r.utilizationPct, 0) / src.length);
    const avgDev = Math.round(src.reduce((s, r) => s + r.targetDev, 0) / src.length);
    return { sumAlloc, sumIdle, sumTotal: sumAlloc + sumIdle, avgUtil, avgDev, count: src.length };
  }, [enriched, selected]);

  const handleChartClick = useCallback(
    (chartEvent: unknown) => {
      const e = chartEvent as { activePayload?: Array<{ payload?: WorkforceWeekData }> } | null;
      const week = e?.activePayload?.[0]?.payload?.week;
      if (week) navigate(`/assignments?from=${week}`);
    },
    [navigate],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* View toggle + controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Button size="sm" variant={view === 'chart' ? 'primary' : 'secondary'} onClick={() => setView('chart')}>
            Chart
          </Button>
          <Button size="sm" variant={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>
            Table
          </Button>
          {chartFilter && view === 'chart' && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setChartFilter(null)} style={{ marginLeft: 8, borderStyle: 'dashed' }}>
              Clear filter ({chartFilter.size} weeks)
            </Button>
          )}
        </div>
        {view === 'table' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
            {selected.size > 0 && (
              <span>{selected.size} selected — right-click to filter chart</span>
            )}
            <span>Click+drag to select range \u00B7 Shift+click to extend \u00B7 Ctrl+C to copy</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ fontSize: 11, padding: '2px 4px', border: '1px solid var(--color-border)', borderRadius: 4, background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} rows</option>)}
            </select>
          </div>
        )}
      </div>

      {view === 'table' ? (
        <div style={{ flex: 1, overflow: 'auto' }} onContextMenu={handleContextMenu}>
          <Table
            variant="compact"
            columns={[
              { key: 'wn', title: 'W#', width: 36, getValue: (r) => r.weekNo, render: (r) => <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>W{r.weekNo}</span> },
              { key: 'week', title: 'Week', getValue: (r) => r.week, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.week}</span> },
              { key: 'alloc', title: 'Alloc', align: 'right', getValue: (r) => r.allocated, render: (r) => <span style={NUM}>{r.allocated}</span> },
              { key: 'idle', title: 'Idle', align: 'right', getValue: (r) => r.idle, render: (r) => <span style={{ ...NUM, color: r.idle > 0 ? 'var(--color-text-muted)' : 'inherit' }}>{r.idle}</span> },
              { key: 'total', title: 'Total', align: 'right', getValue: (r) => r.total, render: (r) => <span style={{ ...NUM, fontWeight: 600 }}>{r.total}</span> },
              { key: 'allocPct', title: 'Alloc %', align: 'right', getValue: (r) => r.allocatedPct, render: (r) => <span style={NUM}>{r.allocatedPct}%</span> },
              { key: 'idlePct', title: 'Idle %', align: 'right', getValue: (r) => r.idlePct, render: (r) => <span style={{ ...NUM, color: 'var(--color-text-muted)' }}>{r.idlePct}%</span> },
              { key: 'util', title: 'Util %', align: 'right', getValue: (r) => r.utilizationPct, render: (r) => (
                <span style={{ ...NUM, fontWeight: 600, color: r.utilizationPct >= 85 ? 'var(--color-status-active)' : r.utilizationPct >= 65 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }}>
                  {r.utilizationPct}%
                </span>
              ) },
              { key: 'tgt', title: 'vs Tgt', align: 'right', width: 60, getValue: (r) => r.targetDev, render: (r) => <span style={{ ...NUM, color: devColor(r.targetDev), fontWeight: 600 }}>{r.targetDev > 0 ? '+' : ''}{r.targetDev}</span> },
              { key: 'wow', title: <>WoW \u0394</>, align: 'right', getValue: (r) => r.wowChange, render: (r) => <span style={{ ...NUM, color: trendColor(r.trend) }}>{r.wowChange > 0 ? '+' : ''}{r.wowChange}</span> },
              { key: 'wowPct', title: 'WoW %', align: 'right', getValue: (r) => r.wowChangePct, render: (r) => <span style={{ ...NUM, color: trendColor(r.trend), fontSize: 11 }}>{r.wowChangePct > 0 ? '+' : ''}{r.wowChangePct}%</span> },
              { key: 'arrow', title: '', width: 24, align: 'center', render: (r) => <span style={{ color: trendColor(r.trend), fontSize: 13 }}>{trendArrow(r.trend)}</span> },
              { key: 'runAvg', title: 'Avg Util', align: 'right', getValue: (r) => r.runningAvgUtil, render: (r) => <span style={{ ...NUM, color: 'var(--color-text-muted)', fontSize: 11 }}>{r.runningAvgUtil}%</span> },
              { key: 'bar', title: 'Bar', width: 80, render: (r) => (
                <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(r.utilizationPct, 100)}%`, borderRadius: 2,
                    background: r.utilizationPct >= 85 ? 'var(--color-status-active)' : r.utilizationPct >= 65 ? 'var(--color-status-warning)' : 'var(--color-status-danger)',
                  }} />
                </div>
              ) },
              { key: 'go', title: '', width: 36, render: (r) => (
                <Link to={`/assignments?from=${r.week}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link>
              ) },
            ] as Column<EnrichedRow>[]}
            rows={pageRows}
            getRowKey={(r) => r.week}
            onRowMouseDown={(_row, sliceIndex, e) => handleRowMouseDown(page * pageSize + sliceIndex, e)}
            onRowMouseEnter={(_row, sliceIndex) => handleRowMouseEnter(page * pageSize + sliceIndex)}
            rowStyle={(r) => {
              const isSelected = selected.has(r.week);
              return {
                cursor: 'pointer',
                background: isSelected ? 'var(--color-accent)' : undefined,
                color: isSelected ? 'var(--color-surface)' : undefined,
                userSelect: 'none',
              };
            }}
            footer={
              totals ? (
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 60px 1fr 1fr 24px 1fr 80px 36px', padding: 'var(--space-2) var(--space-3)', fontWeight: 600, background: 'var(--color-surface-alt)', fontSize: 11 }}>
                  <span />
                  <span>{selected.size > 0 ? `${totals.count} selected` : 'All'}</span>
                  <span style={NUM}>{totals.sumAlloc}</span>
                  <span style={NUM}>{totals.sumIdle}</span>
                  <span style={NUM}>{totals.sumTotal}</span>
                  <span /><span />
                  <span style={{ ...NUM, color: totals.avgUtil >= 85 ? 'var(--color-status-active)' : totals.avgUtil >= 65 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }}>{totals.avgUtil}%</span>
                  <span style={{ ...NUM, color: devColor(totals.avgDev) }}>{totals.avgDev > 0 ? '+' : ''}{totals.avgDev}</span>
                  <span /><span /><span /><span />
                  <span style={{ ...NUM, color: 'var(--color-text-muted)', fontSize: 11 }}>{totals.avgUtil}%</span>
                  <span />
                </div>
              ) : undefined
            }
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              <Button type="button" variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
              <ReferenceArea yAxisId="pct" y1={0} y2={65} fill="var(--color-status-danger, #ef4444)" fillOpacity={0.04} />
              <ReferenceArea yAxisId="pct" y1={65} y2={90} fill="var(--color-status-active, #22c55e)" fillOpacity={0.04} />
              <ReferenceArea yAxisId="pct" y1={90} y2={100} fill="var(--color-status-warning, #f59e0b)" fillOpacity={0.04} />
              <YAxis yAxisId="headcount" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} axisLine={false} tickLine={false} width={40} />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
              <Bar yAxisId="headcount" dataKey="allocated" stackId="hc" fill="var(--color-chart-5, #8b5cf6)" name="Allocated" />
              <Bar yAxisId="headcount" dataKey="idle" stackId="hc" fill="var(--color-status-neutral, #94a3b8)" name="Idle" radius={[2, 2, 0, 0]} />
              <Line yAxisId="pct" dataKey="utilizationPct" stroke="var(--color-chart-3, #f59e0b)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-chart-3, #f59e0b)', strokeWidth: 0 }} activeDot={{ r: 5, stroke: 'var(--color-surface, #fff)', strokeWidth: 2 }} name="Utilization %" type="monotone" />
              <ReferenceLine yAxisId="pct" y={targetUtilization} stroke="var(--color-status-danger, #ef4444)" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Target ${targetUtilization}%`, position: 'right', fontSize: 10, fill: 'var(--color-status-danger, #ef4444)' }} />
              <Tooltip content={<OverviewTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" iconSize={8} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
