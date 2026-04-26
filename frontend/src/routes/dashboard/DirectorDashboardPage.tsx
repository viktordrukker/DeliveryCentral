/**
 * Director Dashboard — answers 5 business questions:
 * 1. "How healthy is my portfolio right now?" → RAG distribution KPIs
 * 2. "Where are the staffing problems?" → Portfolio heatmap (projects × weeks)
 * 3. "Which projects need my attention?" → Action table sorted by severity
 * 4. "How is utilisation trending?" → Unit utilisation + weekly trend
 * 5. "Who is available?" → Bench / available pool preview
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import { useTitleBarActions } from '@/app/title-bar-context';
import { PortfolioStaffingHeatmap } from '@/components/dashboard/PortfolioStaffingHeatmap';
import { RecentActivityRail } from '@/components/dashboard/RecentActivityRail';
import { ViewToggle } from '@/components/common/ViewToggle';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Sparkline } from '@/components/charts/Sparkline';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { useDirectorDashboard } from '@/features/dashboard/useDirectorDashboard';
import { exportToXlsx } from '@/lib/export';
import { type PortfolioHeatmapResponse, type PortfolioSummaryResponse, type AvailablePoolPerson, fetchPortfolioHeatmap, fetchPortfolioSummary, fetchAvailablePool } from '@/lib/api/portfolio-dashboard';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealth, type ProjectHealthDto } from '@/lib/api/project-health';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const tc = (val: number, warn: number, danger: number, higherIsBad = true): string => {
  if (higherIsBad) return val >= danger ? 'var(--color-status-danger)' : val >= warn ? 'var(--color-status-warning)' : 'var(--color-status-active)';
  return val <= danger ? 'var(--color-status-danger)' : val <= warn ? 'var(--color-status-warning)' : 'var(--color-status-active)';
};

interface ProjectActionRow {
  id: string;
  name: string;
  projectCode: string;
  status: string;
  health: ProjectHealthDto | null;
  assignmentCount: number;
  clientName?: string | null;
  priority?: string | null;
}

export function DirectorDashboardPage(): JSX.Element {
  const state = useDirectorDashboard();
  const navigate = useNavigate();
  const { setActions } = useTitleBarActions();
  const [lastFetch, setLastFetch] = useState(new Date());

  // Portfolio data
  const [heatmapWeeks, setHeatmapWeeks] = useState(13); // default 3M
  const [heatmapData, setHeatmapData] = useState<PortfolioHeatmapResponse | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummaryResponse | null>(null);
  const [availablePool, setAvailablePool] = useState<AvailablePoolPerson[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectActionRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [utilView, setUtilView] = useState<'chart' | 'table'>('chart');
  const [poolView, setPoolView] = useState<'chart' | 'table'>('table');
  const [healthView, setHealthView] = useState<'chart' | 'table'>('chart');

  // Refetch heatmap when period changes
  useEffect(() => {
    void fetchPortfolioHeatmap(heatmapWeeks).then(setHeatmapData).catch(() => undefined);
  }, [heatmapWeeks]);

  useEffect(() => {
    void fetchPortfolioSummary().then(setPortfolioSummary).catch(() => undefined);
    void fetchAvailablePool().then(setAvailablePool).catch(() => undefined);

    setProjectsLoading(true);
    void fetchProjectDirectory().then(async (res) => {
      const healthResults = await Promise.allSettled(res.items.map((p) => fetchProjectHealth(p.id)));
      setProjectRows(res.items.map((p, i) => ({
        id: p.id, name: p.name, projectCode: p.projectCode, status: p.status,
        assignmentCount: p.assignmentCount,
        health: healthResults[i].status === 'fulfilled' ? healthResults[i].value : null,
        clientName: p.clientName, priority: p.priority,
      })));
    }).catch(() => {}).finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  // Title bar
  useEffect(() => {
    setActions(
      <>
        <button className="button button--secondary button--sm" onClick={() => exportSummary()} type="button">Export</button>
        <Link className="button button--secondary button--sm" to="/projects">Projects</Link>
        <Link className="button button--secondary button--sm" to="/workload">Workload</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportSummary(): void {
    if (!state.data) return;
    const s = state.data.summary;
    exportToXlsx([
      { Metric: 'Active Projects', Value: s.activeProjectCount },
      { Metric: 'Active Assignments', Value: s.activeAssignmentCount },
      { Metric: 'Staffed People', Value: s.staffedPersonCount },
      { Metric: 'Unstaffed', Value: s.unstaffedActivePersonCount },
      { Metric: 'Utilisation Rate', Value: `${Math.round(s.staffingUtilisationRate)}%` },
    ], 'director_summary');
  }

  const d = state.data;
  const ps = portfolioSummary;
  const refetch = (): void => {
    state.setAsOf(new Date().toISOString());
    void fetchPortfolioHeatmap(heatmapWeeks).then(setHeatmapData).catch(() => undefined);
    void fetchPortfolioSummary().then(setPortfolioSummary).catch(() => undefined);
  };

  // Sorted projects: RED health first, then AMBER, then GREEN
  const sortedProjects = useMemo(() => {
    const healthOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 };
    return [...projectRows].sort((a, b) => {
      const aOrder = a.health ? (healthOrder[a.health.grade] ?? 3) : 3;
      const bOrder = b.health ? (healthOrder[b.health.grade] ?? 3) : 3;
      return aOrder - bOrder;
    });
  }, [projectRows]);

  // Action table columns
  const actionColumns = useMemo<DataTableColumn<ProjectActionRow>[]>(() => [
    {
      key: 'health',
      title: '',
      width: 40,
      render: (row) => row.health
        ? <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: row.health.grade === 'green' ? 'var(--color-status-active)' : row.health.grade === 'yellow' ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }} title={`Health: ${row.health.score}`} />
        : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span>,
    },
    { key: 'name', title: 'Project', render: (row) => <span style={{ fontWeight: 500 }}>{row.name}</span> },
    { key: 'client', title: 'Client', width: 120, render: (row) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.clientName || '\u2014'}</span> },
    { key: 'status', title: 'Status', width: 80, render: (row) => <StatusBadge status={row.status} variant="dot" /> },
    { key: 'priority', title: 'Priority', width: 70, render: (row) => row.priority ? <StatusBadge status={row.priority === 'CRITICAL' ? 'danger' : row.priority === 'HIGH' ? 'warning' : 'info'} label={row.priority} variant="dot" /> : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span> },
    { key: 'staff', title: 'Staff', width: 50, align: 'right', render: (row) => row.assignmentCount },
    { key: 'score', title: 'Score', width: 50, align: 'right', render: (row) => <span style={{ fontWeight: 600, ...NUM, color: row.health ? tc(row.health.score, 60, 40, false) : 'var(--color-text-muted)' }}>{row.health?.score ?? '\u2014'}</span> },
    { key: 'go', title: '', width: 40, render: (row) => <Link to={`/projects/${row.id}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
  ], []);

  return (
    <PageContainer testId="director-dashboard-page">
      {state.isLoading && !d ? <LoadingState label="Loading..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} onRetry={refetch} /> : null}

      {d ? (
        <>
          {/* ═══ KPI STRIP ═══ */}
          <div className="kpi-strip" aria-label="Portfolio health">
            <Link className="kpi-strip__item" to="/projects" style={{ borderLeft: `3px solid var(--color-accent)` }}>
              <TipBalloon tip="Total active projects across the organization." arrow="left" />
              <span className="kpi-strip__value">{d.summary.activeProjectCount}</span>
              <span className="kpi-strip__label">Active Projects</span>
            </Link>

            <Link className="kpi-strip__item" to="/people" style={{ borderLeft: `3px solid ${tc(Math.round(d.summary.staffingUtilisationRate), 60, 40, false)}` }}>
              <TipBalloon tip="Percentage of active people currently assigned to at least one project." arrow="left" />
              <span className="kpi-strip__value">{Math.round(d.summary.staffingUtilisationRate)}%</span>
              <span className="kpi-strip__label">Utilisation</span>
              <Sparkline data={d.weeklyTrend.map((w) => w.staffingUtilisationRate)} height={20} width={60} color={tc(Math.round(d.summary.staffingUtilisationRate), 60, 40, false)} />
            </Link>

            <Link className="kpi-strip__item" to="/people?filter=unassigned" style={{ borderLeft: `3px solid ${tc(d.summary.unstaffedActivePersonCount, 3, 8)}` }}>
              <TipBalloon tip="Active people with no current assignment (bench)." arrow="left" />
              <span className="kpi-strip__value">{d.summary.unstaffedActivePersonCount}</span>
              <span className="kpi-strip__label">On Bench</span>
            </Link>

            {ps ? (
              <>
                <Link className="kpi-strip__item" to="/projects" style={{ borderLeft: `3px solid ${tc(ps.totalOpenGaps, 3, 8)}` }}>
                  <TipBalloon tip="Total unfilled positions across all project role plans." arrow="left" />
                  <span className="kpi-strip__value">{ps.totalOpenGaps}</span>
                  <span className="kpi-strip__label">Open Gaps</span>
                </Link>

                <span className="kpi-strip__item" style={{ borderLeft: `3px solid ${tc(ps.overallFillRate, 60, 40, false)}` }}>
                  <TipBalloon tip="Organization-wide staffing fill rate across all projects with role plans." arrow="left" />
                  <span className="kpi-strip__value">{ps.overallFillRate}%</span>
                  <span className="kpi-strip__label">Fill Rate</span>
                </span>

                <span className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-chart-5)' }}>
                  <span className="kpi-strip__value">
                    <span style={{ color: 'var(--color-status-active)' }}>{ps.byRag.green}</span>
                    {' / '}
                    <span style={{ color: 'var(--color-status-warning)' }}>{ps.byRag.amber}</span>
                    {' / '}
                    <span style={{ color: 'var(--color-status-danger)' }}>{ps.byRag.red}</span>
                  </span>
                  <span className="kpi-strip__label">G / A / R</span>
                </span>
              </>
            ) : null}
          </div>

          {/* ═══ CHARTS: 3-column grid with chart/table toggles ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
            <SectionCard title={<span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>Unit Utilisation <ViewToggle view={utilView} onChange={setUtilView} /></span>} collapsible>
              {d.unitUtilisation.length === 0 ? (
                <EmptyState description="No org unit data." title="No data" />
              ) : utilView === 'chart' ? (
                <div style={{ height: Math.max(180, d.unitUtilisation.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.unitUtilisation} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="orgUnitName" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="utilisation" radius={[0, 3, 3, 0]}>
                        {d.unitUtilisation.map((item, i) => <Cell key={i} fill={tc(item.utilisation, 60, 40, false)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <table className="dash-compact-table">
                  <thead><tr><th scope="col">Org Unit</th><th scope="col" style={NUM}>Util %</th></tr></thead>
                  <tbody>{d.unitUtilisation.map((item) => (
                    <tr key={item.orgUnitId}><td style={{ fontWeight: 500 }}>{item.orgUnitName}</td><td style={{ ...NUM, fontWeight: 600, color: tc(item.utilisation, 60, 40, false) }}>{item.utilisation}%</td></tr>
                  ))}</tbody>
                </table>
              )}
            </SectionCard>

            {ps ? (
              <SectionCard title={<span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>Health Distribution <ViewToggle view={healthView} onChange={setHealthView} /></span>} collapsible>
                {healthView === 'chart' ? (
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ name: 'Green', value: ps.byRag.green }, { name: 'Amber', value: ps.byRag.amber }, { name: 'Red', value: ps.byRag.red }].filter((d) => d.value > 0)} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                          {[ps.byRag.green, ps.byRag.amber, ps.byRag.red].map((v, i) => ({ v, fill: ['var(--color-status-active)', 'var(--color-status-warning)', 'var(--color-status-danger)'][i] })).filter((d) => d.v > 0).map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <table className="dash-compact-table">
                    <thead><tr><th scope="col">Status</th><th scope="col" style={NUM}>Count</th><th scope="col" style={NUM}>%</th></tr></thead>
                    <tbody>
                      <tr><td><StatusBadge status="active" label="Green" variant="dot" /></td><td style={NUM}>{ps.byRag.green}</td><td style={NUM}>{ps.totalProjects > 0 ? Math.round(ps.byRag.green / ps.totalProjects * 100) : 0}%</td></tr>
                      <tr><td><StatusBadge status="warning" label="Amber" variant="dot" /></td><td style={NUM}>{ps.byRag.amber}</td><td style={NUM}>{ps.totalProjects > 0 ? Math.round(ps.byRag.amber / ps.totalProjects * 100) : 0}%</td></tr>
                      <tr><td><StatusBadge status="danger" label="Red" variant="dot" /></td><td style={NUM}>{ps.byRag.red}</td><td style={NUM}>{ps.totalProjects > 0 ? Math.round(ps.byRag.red / ps.totalProjects * 100) : 0}%</td></tr>
                    </tbody>
                  </table>
                )}
              </SectionCard>
            ) : null}

            <SectionCard title={<span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>Available Pool ({availablePool.length}) <ViewToggle view={poolView} onChange={setPoolView} /></span>} collapsible>
              {availablePool.length === 0 ? (
                <EmptyState description="No people currently available." title="Pool empty" />
              ) : poolView === 'chart' ? (
                <div style={{ height: Math.max(180, Math.min(availablePool.length, 10) * 28) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={availablePool.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="displayName" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v) => `${v}% allocated`} />
                      <Bar dataKey="currentAllocation" radius={[0, 3, 3, 0]} fill="var(--color-chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <>
                  <table className="dash-compact-table">
                    <thead><tr><th scope="col">Person</th><th scope="col" style={NUM}>Alloc %</th><th scope="col">Available</th></tr></thead>
                    <tbody>{availablePool.slice(0, 10).map((p) => (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${p.id}`)}>
                        <td style={{ fontWeight: 500 }}>{p.displayName}</td>
                        <td style={{ ...NUM, color: p.currentAllocation === 0 ? 'var(--color-status-active)' : 'var(--color-text-muted)' }}>{p.currentAllocation}%</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.availableFrom ?? 'Now'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {availablePool.length > 10 ? <div style={{ marginTop: 'var(--space-2)', fontSize: 11, color: 'var(--color-text-muted)' }}>Showing 10 of {availablePool.length} — <Link to="/workload" style={{ color: 'var(--color-accent)' }}>View all</Link></div> : null}
                </>
              )}
            </SectionCard>
          </div>

          {/* ═══ PORTFOLIO HEATMAP WITH TIMELINES ═══ */}
          <SectionCard title={
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              Portfolio Staffing Timeline
              <span style={{ display: 'inline-flex', gap: 0, borderRadius: 'var(--radius-control, 4px)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                {([
                  { label: '2W', weeks: 2 },
                  { label: '1M', weeks: 4 },
                  { label: '3M', weeks: 13 },
                  { label: '6M', weeks: 26 },
                  { label: '12M', weeks: 52 },
                ] as const).map((opt) => (
                  <button
                    key={opt.weeks}
                    type="button"
                    onClick={() => setHeatmapWeeks(opt.weeks)}
                    style={{
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: 'none',
                      borderLeft: opt.weeks !== 2 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer',
                      background: heatmapWeeks === opt.weeks ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: heatmapWeeks === opt.weeks ? 'var(--color-surface)' : 'var(--color-text-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </span>
            </span>
          }>
            {heatmapData ? (
              <PortfolioStaffingHeatmap data={heatmapData} />
            ) : (
              <LoadingState variant="skeleton" skeletonType="chart" />
            )}
          </SectionCard>

          {/* ═══ ACTION TABLE: Projects sorted by health ═══ */}
          <div className="dash-action-section">
            <div className="dash-action-section__header">
              <span className="dash-action-section__title">Projects Requiring Attention ({sortedProjects.filter((p) => p.health && p.health.grade !== 'green').length})</span>
            </div>
            {projectsLoading ? (
              <LoadingState variant="skeleton" skeletonType="table" />
            ) : sortedProjects.length === 0 ? (
              <EmptyState description="No projects found." title="No projects" action={{ href: '/projects/new', label: 'Create Project' }} />
            ) : (
              <DataTable
                caption="Projects sorted by health — worst first"
                columns={actionColumns}
                getRowKey={(row) => row.id}
                items={sortedProjects}
                onRowClick={(row) => navigate(`/projects/${row.id}/dashboard`)}
                variant="compact"
              />
            )}
          </div>

          {/* Charts section moved above heatmap */}

          {/* ═══ RECENT ACTIVITY RAIL ═══ */}
          <RecentActivityRail role="director" />

          {/* ═══ DATA FRESHNESS ═══ */}
          <div className="data-freshness">
            Updated {formatDistanceToNow(lastFetch, { addSuffix: true })} {'\u00B7'}{' '}
            <button onClick={refetch} type="button">Refresh</button>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
