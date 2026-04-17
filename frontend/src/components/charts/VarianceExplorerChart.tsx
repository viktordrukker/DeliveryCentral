import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

/* ── Data shape ── */
export interface VarianceExplorerRow {
  actual: number;
  gap: number;
  id: string;
  label: string;
  planned: number;
  silent: number;
}

export type VarianceDimension = 'person' | 'project' | 'department' | 'pool';

interface VarianceExplorerChartProps {
  dimensions: Record<VarianceDimension, VarianceExplorerRow[]>;
  drillPrefixes?: Record<VarianceDimension, string>;
}

/* ── Tooltip ── */
function ExplorerTooltip(props: Record<string, unknown>): JSX.Element | null {
  const active = props.active as boolean | undefined;
  const payloadArr = props.payload as Array<{ payload?: VarianceExplorerRow }> | undefined;
  if (!active || !payloadArr?.length) return null;
  const d = payloadArr[0]?.payload;
  if (!d) return null;

  const gapPct = d.planned > 0 ? Math.round((d.gap / d.planned) * 100) : 0;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__header">{d.label}</div>
      <div className="chart-tooltip__body">
        <TRow color="var(--color-status-neutral)" label="Planned" value={`${d.planned}h`} />
        <TRow color="var(--color-chart-5)" label="Actual" value={`${d.actual}h`} />
        {d.silent > 0 && <TRow color="var(--color-status-warning)" label="Planned, No Actual" value={`${d.silent}h`} />}
        <div className="chart-tooltip__divider" />
        <TRow
          color={d.gap < 0 ? 'var(--color-status-danger)' : d.gap > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}
          label="Gap"
          value={`${d.gap > 0 ? '+' : ''}${d.gap}h (${gapPct > 0 ? '+' : ''}${gapPct}%)`}
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

const DIM_LABELS: Record<VarianceDimension, string> = { person: 'Person', project: 'Project', department: 'Department', pool: 'Resource Pool' };
const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

/* ── Main ── */
export function VarianceExplorerChart({ dimensions, drillPrefixes }: VarianceExplorerChartProps): JSX.Element {
  const navigate = useNavigate();
  const [dim, setDim] = useState<VarianceDimension>('project');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const allRows = dimensions[dim] ?? [];

  // If nothing selected, show top 10 by absolute gap
  const chartRows = useMemo(() => {
    if (selected.size > 0) return allRows.filter((r) => selected.has(r.id));
    return [...allRows].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 10);
  }, [allRows, selected]);

  const avgGap = useMemo(() => {
    if (allRows.length === 0) return 0;
    return Math.round((allRows.reduce((s, r) => s + r.gap, 0) / allRows.length) * 10) / 10;
  }, [allRows]);

  const avgGapLabel = avgGap < 0 ? `Avg underrun: ${avgGap}h` : avgGap > 0 ? `Avg overrun: +${avgGap}h` : 'Avg: 0h';

  function toggleSelect(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleChartClick(ev: unknown): void {
    const e = ev as { activePayload?: Array<{ payload?: VarianceExplorerRow }> } | null;
    const id = e?.activePayload?.[0]?.payload?.id;
    const prefix = drillPrefixes?.[dim] ?? '/';
    if (id) navigate(`${prefix}/${id}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {(['project', 'person', 'department', 'pool'] as VarianceDimension[]).map((d) => (
            <button key={d} type="button" className={`button button--sm ${dim === d ? 'button--primary' : 'button--secondary'}`}
              onClick={() => { setDim(d); setSelected(new Set()); }}>
              {DIM_LABELS[d]}
            </button>
          ))}
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>|</span>
          <button type="button" className={`button button--sm ${view === 'chart' ? 'button--primary' : 'button--secondary'}`} onClick={() => setView('chart')}>Chart</button>
          <button type="button" className={`button button--sm ${view === 'table' ? 'button--primary' : 'button--secondary'}`} onClick={() => setView('table')}>Table</button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
          {selected.size > 0 && (
            <button type="button" className="button button--sm button--secondary" onClick={() => setSelected(new Set())} style={{ borderStyle: 'dashed' }}>
              Clear ({selected.size})
            </button>
          )}
          <span>{allRows.length} {DIM_LABELS[dim].toLowerCase()}s</span>
          <span style={{ color: avgGap < 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)', fontWeight: 600 }}>{avgGapLabel}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, minHeight: 0 }}>
        {/* Multi-select list */}
        <div style={{
          width: 180, flexShrink: 0, overflow: 'auto',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)',
          background: 'var(--color-surface)', fontSize: 11,
        }}>
          <div style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', position: 'sticky', top: 0 }}>
            Select to compare
          </div>
          {allRows.map((r) => (
            <label
              key={r.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', cursor: 'pointer',
                background: selected.has(r.id) ? 'var(--color-accent-soft)' : undefined,
              }}
            >
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.label}</span>
              <span style={{ ...NUM, color: r.gap < 0 ? 'var(--color-status-danger)' : r.gap > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                {r.gap > 0 ? '+' : ''}{r.gap}h
              </span>
            </label>
          ))}
        </div>

        {/* Chart or Table */}
        {view === 'chart' ? (
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 12, left: -4, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => `${v}h`} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <Bar dataKey="planned" fill="var(--color-status-neutral)" name="Planned" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" fill="var(--color-chart-5)" name="Actual" radius={[3, 3, 0, 0]} />
                {avgGap !== 0 && (
                  <ReferenceLine y={Math.abs(avgGap)} stroke="var(--color-status-danger)" strokeDasharray="6 3" strokeWidth={1.5}
                    label={{ value: avgGapLabel, position: 'right', fontSize: 10, fill: 'var(--color-status-danger)' }} />
                )}
                <Tooltip content={<ExplorerTooltip />} cursor={false} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" iconSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table className="dash-compact-table" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th>{DIM_LABELS[dim]}</th>
                  <th style={NUM}>Planned</th>
                  <th style={NUM}>Actual</th>
                  <th style={NUM}>No Actual</th>
                  <th style={NUM}>Gap</th>
                  <th style={NUM}>Gap %</th>
                  <th style={{ width: 70 }}>Bar</th>
                </tr>
              </thead>
              <tbody>
                {(selected.size > 0 ? allRows.filter((r) => selected.has(r.id)) : allRows).map((r) => {
                  const gapPct = r.planned > 0 ? Math.round((r.gap / r.planned) * 100) : 0;
                  const maxHours = Math.max(...allRows.map((x) => Math.max(x.planned, x.actual)), 1);
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`${drillPrefixes?.[dim] ?? '/'}/${r.id}`)}>
                      <td style={{ fontWeight: 500 }}>{r.label}</td>
                      <td style={NUM}>{r.planned}h</td>
                      <td style={NUM}>{r.actual}h</td>
                      <td style={{ ...NUM, color: r.silent > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{r.silent}h</td>
                      <td style={{ ...NUM, fontWeight: 600, color: r.gap < 0 ? 'var(--color-status-danger)' : r.gap > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)' }}>
                        {r.gap > 0 ? '+' : ''}{r.gap}h
                      </td>
                      <td style={{ ...NUM, color: gapPct < 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>
                        {gapPct > 0 ? '+' : ''}{gapPct}%
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 1, height: 8, alignItems: 'flex-end' }}>
                          <div style={{ width: `${(r.planned / maxHours) * 100}%`, height: 8, background: 'var(--color-status-neutral)', borderRadius: 1 }} />
                          <div style={{ width: `${(r.actual / maxHours) * 100}%`, height: 6, background: 'var(--color-chart-5)', borderRadius: 1 }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600 }}>
                  <td>Average</td>
                  <td style={NUM}>{allRows.length > 0 ? Math.round(allRows.reduce((s, r) => s + r.planned, 0) / allRows.length * 10) / 10 : 0}h</td>
                  <td style={NUM}>{allRows.length > 0 ? Math.round(allRows.reduce((s, r) => s + r.actual, 0) / allRows.length * 10) / 10 : 0}h</td>
                  <td style={NUM}>{allRows.length > 0 ? Math.round(allRows.reduce((s, r) => s + r.silent, 0) / allRows.length * 10) / 10 : 0}h</td>
                  <td style={{ ...NUM, color: avgGap < 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{avgGap}h</td>
                  <td></td><td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
