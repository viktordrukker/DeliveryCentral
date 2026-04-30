import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Button, Table, type Column } from '@/components/ds';
const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

/* ── Generic row shape accepted by the chart ── */
export interface ReconciliationChartRow {
  anomalyCount: number;
  code?: string;
  evidenceHours: number;
  id: string;
  label: string;
  matchRate: number;
  matchedHours: number;
  plannedHours: number;
  silentHours: number;
  unapprovedHours: number;
  variance: number;
}

interface ChartRow {
  code: string;
  id: string;
  label: string;
  matchRate: number;
  matched: number;
  silent: number;
  unapproved: number;
}

function toChartRows(rows: ReconciliationChartRow[]): ChartRow[] {
  return rows.map((r) => ({
    code: r.code ?? r.label.slice(0, 12),
    id: r.id,
    label: r.label,
    matchRate: r.matchRate,
    matched: r.matchedHours,
    silent: -r.silentHours,
    unapproved: -r.unapprovedHours,
  }));
}

/* ── Tooltip ── */
function ReconciliationTooltip(props: Record<string, unknown>): JSX.Element | null {
  const active = props.active as boolean | undefined;
  const payloadArr = props.payload as Array<{ payload?: ChartRow }> | undefined;
  if (!active || !payloadArr?.length) return null;
  const d = payloadArr[0]?.payload;
  if (!d) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__header">{d.label}</div>
      <div className="chart-tooltip__body">
        <TRow color="var(--color-status-active)" label="Covered Actual" value={`${d.matched}h`} />
        <TRow color="var(--color-status-danger)" label="Actual w/o Assignment" value={`${Math.abs(d.unapproved)}h`} />
        <TRow color="var(--color-status-warning)" label="Planned, No Actual" value={`${Math.abs(d.silent)}h`} />
        <div className="chart-tooltip__divider" />
        <TRow
          color={d.matchRate >= 80 ? 'var(--color-status-active)' : d.matchRate >= 50 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}
          label="Alignment"
          value={`${d.matchRate}%`}
          bold
        />
      </div>
      <div className="chart-tooltip__footer">Click to drill down</div>
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

/* ── Helpers ── */
function matchRateColor(rate: number): string {
  if (rate >= 80) return 'var(--color-status-active)';
  if (rate >= 50) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

const PAGE_SIZES = [10, 20, 50] as const;

/* ── Main ── */
interface ReconciliationOverviewChartProps {
  data: ReconciliationChartRow[];
  drillPrefix?: string;
}

export function ReconciliationOverviewChart({ data, drillPrefix = '/projects' }: ReconciliationOverviewChartProps): JSX.Element {
  const navigate = useNavigate();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(0);
  const [chartFilter, setChartFilter] = useState<Set<string> | null>(null);
  const dragAnchorRef = useRef(-1);
  const isDraggingRef = useRef(false);

  const totalPages = Math.ceil(data.length / pageSize);
  const pageRows = data.slice(page * pageSize, (page + 1) * pageSize);

  // Default chart: top 10, sorted green (healthy) left → red (bad) right
  const chartRows = useMemo(() => {
    const source = chartFilter
      ? data.filter((d) => chartFilter.has(d.id))
      : [...data]
          .sort((a, b) => b.matchRate - a.matchRate || a.variance - b.variance)
          .slice(0, 10);
    return toChartRows(source);
  }, [data, chartFilter]);

  // Average match rate for the reference line
  const avgMatchRate = useMemo(() => {
    const src = chartFilter ? data.filter((d) => chartFilter.has(d.id)) : data;
    if (src.length === 0) return 0;
    return Math.round(src.reduce((s, r) => s + r.matchRate, 0) / src.length);
  }, [data, chartFilter]);

  useEffect(() => { setPage(0); }, [pageSize]);
  useEffect(() => { setChartFilter(null); setSelected(new Set()); }, [data]);
  useEffect(() => {
    function up(): void { isDraggingRef.current = false; }
    document.addEventListener('mouseup', up);
    return () => document.removeEventListener('mouseup', up);
  }, []);

  const handleRowMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    if (e.button === 2) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    isDraggingRef.current = true;
    dragAnchorRef.current = idx;
    if (e.shiftKey && selected.size > 0) {
      const anchorId = [...selected][0];
      const anchorIdx = data.findIndex((r) => r.id === anchorId);
      const from = Math.min(anchorIdx >= 0 ? anchorIdx : idx, idx);
      const to = Math.max(anchorIdx >= 0 ? anchorIdx : idx, idx);
      const next = new Set<string>();
      for (let i = from; i <= to; i++) if (data[i]) next.add(data[i].id);
      setSelected(next);
    } else {
      setSelected(new Set([data[idx].id]));
    }
  }, [data, selected]);

  const handleRowMouseEnter = useCallback((idx: number) => {
    if (!isDraggingRef.current || dragAnchorRef.current < 0) return;
    const from = Math.min(dragAnchorRef.current, idx);
    const to = Math.max(dragAnchorRef.current, idx);
    const next = new Set<string>();
    for (let i = from; i <= to; i++) if (data[i]) next.add(data[i].id);
    setSelected(next);
  }, [data]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (selected.size > 0) { e.preventDefault(); setChartFilter(new Set(selected)); setView('chart'); }
  }, [selected]);

  const handleChartClick = useCallback((ev: unknown) => {
    const e = ev as { activePayload?: Array<{ payload?: ChartRow }> } | null;
    const pid = e?.activePayload?.[0]?.payload?.id;
    if (pid) navigate(`${drillPrefix}/${pid}`);
  }, [navigate]);

  const totals = useMemo(() => {
    if (data.length === 0) return null;
    const src = selected.size > 0 ? data.filter((r) => selected.has(r.id)) : data;
    const matched = src.reduce((s, r) => s + r.matchedHours, 0);
    const unapproved = src.reduce((s, r) => s + r.unapprovedHours, 0);
    const silent = src.reduce((s, r) => s + r.silentHours, 0);
    const actual = src.reduce((s, r) => s + r.evidenceHours, 0);
    const planned = src.reduce((s, r) => s + r.plannedHours, 0);
    const variance = Math.round((actual - planned) * 10) / 10;
    const total = matched + unapproved + silent;
    const avgMatch = total > 0 ? Math.round((matched / total) * 100) : 0;
    return { matched, unapproved, silent, actual, planned, variance, avgMatch, count: src.length };
  }, [data, selected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Button size="sm" variant={view === 'chart' ? 'primary' : 'secondary'} onClick={() => setView('chart')}>Chart</Button>
          <Button size="sm" variant={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>Table</Button>
          {chartFilter && view === 'chart' && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setChartFilter(null)} style={{ marginLeft: 8, borderStyle: 'dashed' }}>
              Reset to top 10 ({chartFilter.size} selected)
            </Button>
          )}
        </div>
        {view === 'table' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
            {selected.size > 0 && <span>{selected.size} selected — right-click to filter chart</span>}
            <span>Click+drag to select · Shift+click to extend</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ fontSize: 11, padding: '2px 4px', border: '1px solid var(--color-border)', borderRadius: 4, background: 'var(--color-surface)', color: 'var(--color-text)' }}>
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
              { key: 'project', title: 'Project', getValue: (r) => r.label, render: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
              { key: 'code', title: 'Code', width: 60, getValue: (r) => r.code ?? r.label.slice(0, 12), render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.code ?? r.label.slice(0, 12)}</span> },
              { key: 'planned', title: 'Planned', align: 'right', getValue: (r) => r.plannedHours, render: (r) => <span style={NUM}>{r.plannedHours}h</span> },
              { key: 'actual', title: 'Actual', align: 'right', getValue: (r) => r.evidenceHours, render: (r) => <span style={NUM}>{r.evidenceHours}h</span> },
              { key: 'variance', title: 'Variance', align: 'right', getValue: (r) => r.variance, render: (r) => (
                <span style={{ ...NUM, fontWeight: 600, color: r.variance < 0 ? 'var(--color-status-danger)' : r.variance > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)' }}>
                  {r.variance > 0 ? '+' : ''}{r.variance}h
                </span>
              ) },
              { key: 'covered', title: 'Covered', align: 'right', getValue: (r) => r.matchedHours, render: (r) => <span style={{ ...NUM, color: 'var(--color-status-active)' }}>{r.matchedHours}h</span> },
              { key: 'noAssign', title: 'No Assign', align: 'right', getValue: (r) => r.unapprovedHours, render: (r) => <span style={{ ...NUM, color: r.unapprovedHours > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{r.unapprovedHours}h</span> },
              { key: 'noActual', title: 'No Actual', align: 'right', getValue: (r) => r.silentHours, render: (r) => <span style={{ ...NUM, color: r.silentHours > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{r.silentHours}h</span> },
              { key: 'align', title: 'Align %', align: 'right', getValue: (r) => r.matchRate, render: (r) => <span style={{ ...NUM, fontWeight: 600, color: matchRateColor(r.matchRate) }}>{r.matchRate}%</span> },
              { key: 'bar', title: 'Bar', width: 70, render: (r) => (
                <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(r.matchRate, 100)}%`, borderRadius: 2, background: matchRateColor(r.matchRate) }} />
                </div>
              ) },
              { key: 'go', title: '', width: 30, render: (r) => {
                const isSelected = selected.has(r.id);
                return (
                  <Link to={`${drillPrefix}/${r.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: isSelected ? 'var(--color-surface)' : 'var(--color-accent)' }}>Go</Link>
                );
              } },
            ] as Column<ReconciliationChartRow>[]}
            rows={pageRows}
            getRowKey={(r) => r.id}
            onRowMouseDown={(_row, sliceIndex, e) => handleRowMouseDown(page * pageSize + sliceIndex, e)}
            onRowMouseEnter={(_row, sliceIndex) => handleRowMouseEnter(page * pageSize + sliceIndex)}
            rowStyle={(r) => {
              const isSelected = selected.has(r.id);
              return {
                cursor: 'pointer',
                background: isSelected ? 'var(--color-accent)' : undefined,
                color: isSelected ? 'var(--color-surface)' : undefined,
                userSelect: 'none',
              };
            }}
            footer={
              totals ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 70px 30px', padding: 'var(--space-2) var(--space-3)', fontWeight: 600, background: 'var(--color-surface-alt)', fontSize: 11 }}>
                  <span>{selected.size > 0 ? `${totals.count} selected` : `${data.length} projects`}</span>
                  <span />
                  <span style={NUM}>{totals.planned.toFixed(1)}h</span>
                  <span style={NUM}>{totals.actual.toFixed(1)}h</span>
                  <span style={{ ...NUM, color: totals.variance < 0 ? 'var(--color-status-danger)' : totals.variance > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)' }}>
                    {totals.variance > 0 ? '+' : ''}{totals.variance}h
                  </span>
                  <span style={{ ...NUM, color: 'var(--color-status-active)' }}>{totals.matched.toFixed(1)}h</span>
                  <span style={{ ...NUM, color: totals.unapproved > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{totals.unapproved.toFixed(1)}h</span>
                  <span style={{ ...NUM, color: totals.silent > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{totals.silent.toFixed(1)}h</span>
                  <span style={{ ...NUM, color: matchRateColor(totals.avgMatch) }}>{totals.avgMatch}%</span>
                  <span /><span />
                </div>
              ) : undefined
            }
          />
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
            <ComposedChart data={chartRows} margin={{ top: 8, right: 12, left: -4, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <YAxis yAxisId="hours" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}h`} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} axisLine={false} tickLine={false} width={40} />
              <XAxis dataKey="code" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
              <ReferenceLine yAxisId="hours" y={0} stroke="var(--color-text-muted)" strokeWidth={2} />
              {/* Positive: matched hours go up (own stack) */}
              <Bar yAxisId="hours" dataKey="matched" stackId="positive" fill="var(--color-status-active)" name="Covered Actual" radius={[3, 3, 0, 0]} />
              {/* Negative: actual without assignment + planned without actual go below zero */}
              <Bar yAxisId="hours" dataKey="unapproved" stackId="negative" fill="var(--color-status-danger)" name="Actual w/o Assignment" />
              <Bar yAxisId="hours" dataKey="silent" stackId="negative" fill="var(--color-status-warning)" name="Planned, No Actual" radius={[0, 0, 3, 3]} />
              {/* Average alignment rate — single horizontal reference line, not a per-project trend */}
              <ReferenceLine yAxisId="pct" y={avgMatchRate} stroke="var(--color-chart-1)" strokeWidth={2} label={{ value: `Alignment ${avgMatchRate}%`, position: 'right', fontSize: 10, fill: 'var(--color-chart-1)' }} />
              <Tooltip content={<ReconciliationTooltip />} cursor={false} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" iconSize={8} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
