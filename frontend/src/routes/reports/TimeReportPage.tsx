import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { useTitleBarActions } from '@/app/title-bar-context';
import { exportToXlsx } from '@/lib/export';
import { TimeReportData, fetchTimeReport } from '@/lib/api/timesheets';
import { Button, DatePicker, Table, type Column } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

type Period = 'this_week' | 'this_month' | 'this_quarter' | 'custom';

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const toIso = (d: Date): string => d.toISOString().slice(0, 10);

  switch (period) {
    case 'this_week': {
      const dow = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: toIso(mon), to: toIso(sun) };
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toIso(first), to: toIso(last) };
    }
    case 'this_quarter': {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      const first = new Date(now.getFullYear(), qStart, 1);
      const last = new Date(now.getFullYear(), qStart + 3, 0);
      return { from: toIso(first), to: toIso(last) };
    }
    default:
      return { from: '', to: '' };
  }
}

export function TimeReportPage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<TimeReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const range = period === 'custom' ? { from: customFrom, to: customTo } : getDateRange(period);
    if (!range.from || !range.to) return;
    setLoading(true);
    setError(null);
    void fetchTimeReport(range)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  useEffect(() => {
    setActions(
      <>
        <label className="field">
          <span className="field__label">Period</span>
          <select className="field__control" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {period === 'custom' && (
          <>
            <label className="field"><span className="field__label">From</span><DatePicker value={customFrom} onValueChange={(value) => setCustomFrom(value)} /></label>
            <label className="field"><span className="field__label">To</span><DatePicker value={customTo} onValueChange={(value) => setCustomTo(value)} /></label>
          </>
        )}
        {data && (
          <Button type="button" variant="secondary" size="sm" onClick={() => {
            const rows = data.byPerson.map((p) => ({ Person: p.name, Total: p.hours, Standard: p.standardHours, Overtime: p.overtimeHours, Bench: p.benchHours }));
            exportToXlsx(rows, 'time-analytics');
          }}>Export XLSX</Button>
        )}
      </>
    );
    return () => setActions(null);
  }, [setActions, period, customFrom, customTo, data]);

  return (
    <PageContainer testId="time-report-page">
      {loading && <LoadingState label="Loading time analytics..." variant="skeleton" skeletonType="page" />}
      {error && <ErrorState description={error} />}

      {data && (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Time analytics summary">
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <span className="kpi-strip__value">{data.totalHours}h</span>
              <span className="kpi-strip__label">Total Hours</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-chart-1)' }}>
              <span className="kpi-strip__value">{data.standardHours}h</span>
              <span className="kpi-strip__label">Standard</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${data.overtimeHours > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{data.overtimeHours}h</span>
              <span className="kpi-strip__label">Overtime</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-neutral)' }}>
              <span className="kpi-strip__value">{data.benchHours}h</span>
              <span className="kpi-strip__label">Bench</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-chart-3)' }}>
              <span className="kpi-strip__value">{data.capexHours}h</span>
              <span className="kpi-strip__label">CAPEX</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>{data.totalHours > 0 ? Math.round((data.capexHours / data.totalHours) * 100) : 0}%</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-chart-4)' }}>
              <span className="kpi-strip__value">{data.opexHours}h</span>
              <span className="kpi-strip__label">OPEX</span>
            </div>
          </div>

          {/* ── HERO: Weekly Trend (stacked area) ── */}
          {data.weeklyTrend.length > 1 && (
            <SectionCard title="Weekly Time Distribution">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weeklyTrend} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                    <Tooltip formatter={(v) => `${v}h`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                    <Area type="monotone" dataKey="standard" stackId="1" fill="var(--color-status-active)" stroke="var(--color-status-active)" name="Standard" />
                    <Area type="monotone" dataKey="overtime" stackId="1" fill="var(--color-status-warning)" stroke="var(--color-status-warning)" name="Overtime" />
                    <Area type="monotone" dataKey="bench" stackId="1" fill="var(--color-status-neutral)" stroke="var(--color-status-neutral)" name="Bench" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          {/* ── 2×2 GRID ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
            {/* Hours by Project (stacked) */}
            <SectionCard title="Hours by Project">
              {data.byProject.length > 0 ? (
                <div style={{ height: Math.max(200, data.byProject.length * 28 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byProject.slice(0, 15)} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={7} />
                      <Bar dataKey="standardHours" stackId="a" fill="var(--color-status-active)" name="Standard" />
                      <Bar dataKey="overtimeHours" stackId="a" fill="var(--color-status-warning)" name="Overtime" />
                      <Bar dataKey="benchHours" stackId="a" fill="var(--color-status-neutral)" name="Bench" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', textAlign: 'center' }}>No data</div>}
            </SectionCard>

            {/* Hours by Person (stacked) */}
            <SectionCard title="Hours by Person">
              {data.byPerson.length > 0 ? (
                <div style={{ height: Math.max(200, Math.min(data.byPerson.length, 15) * 28 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byPerson.slice(0, 15)} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={7} />
                      <Bar dataKey="standardHours" stackId="a" fill="var(--color-status-active)" name="Standard" />
                      <Bar dataKey="overtimeHours" stackId="a" fill="var(--color-status-warning)" name="Overtime" />
                      <Bar dataKey="benchHours" stackId="a" fill="var(--color-status-neutral)" name="Bench" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', textAlign: 'center' }}>No data</div>}
            </SectionCard>

            {/* CAPEX / OPEX */}
            <SectionCard title="CAPEX vs OPEX">
              {(data.capexHours > 0 || data.opexHours > 0) ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ name: 'CAPEX', value: data.capexHours }, { name: 'OPEX', value: data.opexHours }]} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        <Cell fill="var(--color-chart-3)" />
                        <Cell fill="var(--color-chart-4)" />
                      </Pie>
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', textAlign: 'center' }}>No CAPEX/OPEX data</div>}
            </SectionCard>

            {/* Daily Hours */}
            <SectionCard title="Daily Hours">
              {data.byDay.length > 0 ? (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byDay} margin={{ top: 4, right: 12, left: -4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Bar dataKey="hours" fill="var(--color-chart-1)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', textAlign: 'center' }}>No daily data</div>}
            </SectionCard>
          </div>

          {/* ── DETAIL TABLE ── */}
          <SectionCard title="Detail by Person">
            {data.byPerson.length > 0 ? (
              <Table
                variant="compact"
                columns={[
                  { key: 'person', title: 'Person', getValue: (p) => p.name, render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
                  { key: 'standard', title: 'Standard', align: 'right', getValue: (p) => p.standardHours, render: (p) => <span style={NUM}>{p.standardHours}h</span> },
                  { key: 'overtime', title: 'Overtime', align: 'right', getValue: (p) => p.overtimeHours, render: (p) => <span style={{ ...NUM, color: p.overtimeHours > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{p.overtimeHours}h</span> },
                  { key: 'bench', title: 'Bench', align: 'right', getValue: (p) => p.benchHours, render: (p) => <span style={{ ...NUM, color: p.benchHours > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{p.benchHours}h</span> },
                  { key: 'total', title: 'Total', align: 'right', getValue: (p) => p.hours, render: (p) => <span style={{ ...NUM, fontWeight: 600 }}>{p.hours}h</span> },
                ] as Column<typeof data.byPerson[number]>[]}
                rows={data.byPerson}
                getRowKey={(p) => p.name}
                footer={
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: 'var(--space-2) var(--space-3)', fontWeight: 700, background: 'var(--color-surface-alt)' }}>
                    <span>Total</span>
                    <span style={NUM}>{data.standardHours}h</span>
                    <span style={{ ...NUM, color: 'var(--color-status-warning)' }}>{data.overtimeHours}h</span>
                    <span style={NUM}>{data.benchHours}h</span>
                    <span style={NUM}>{data.totalHours}h</span>
                  </div>
                }
              />
            ) : <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', textAlign: 'center' }}>No data</div>}
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}
