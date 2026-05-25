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

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import { useTitleBarActions } from '@/app/title-bar-context';
import { PortfolioStaffingHeatmap } from '@/components/dashboard/PortfolioStaffingHeatmap';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { PendingApprovalsCard } from '@/components/dashboard/PendingApprovalsCard';
import { RecentActivityRail } from '@/components/dashboard/RecentActivityRail';
// 20c-15 — KPI strip extracted to its own component (was 9 inline <Link> tiles
// inside the page render). Same KPIs, same `data-jtbd` attrs, same threshold
// colors.
import { DirectorKpiStrip } from '@/components/dashboard/director/DirectorKpiStrip';
import { DirectorAnomalyRail } from '@/components/dashboard/DirectorAnomalyRail';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ViewToggle } from '@/components/common/ViewToggle';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { useDirectorDashboard } from '@/features/dashboard/useDirectorDashboard';
import { exportToXlsx } from '@/lib/export';
import { type PortfolioHeatmapResponse, type PortfolioSummaryResponse, type AvailablePoolPerson, fetchPortfolioHeatmap, fetchPortfolioSummary, fetchAvailablePool } from '@/lib/api/portfolio-dashboard';
import { type DirectorSlaSummary, fetchDirectorSlaSummary } from '@/lib/api/dashboard-exec-sla';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealthBatch, type ProjectHealthDto } from '@/lib/api/project-health';
import { Button, DataView, Pct, Table, type Column } from '@/components/ds';

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
    // Sprint F-0.8 (B-14 / D-88) — batch replaces N parallel /:id/health calls.
    void fetchProjectDirectory()
      .then(async (res) => {
        const healthMap = await fetchProjectHealthBatch(res.items.map((p) => p.id));
        setProjectRows(
          res.items.map((p) => ({
            id: p.id,
            name: p.name,
            projectCode: p.projectCode,
            status: p.status,
            assignmentCount: p.assignmentCount,
            health: healthMap.get(p.id) ?? null,
            clientName: p.clientName,
            priority: p.priority,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  // F-3.3 — SLA breach + Time-to-fill metrics
  const [slaSummary, setSlaSummary] = useState<DirectorSlaSummary | null>(null);
  useEffect(() => {
    let active = true;
    fetchDirectorSlaSummary()
      .then((data) => { if (active) setSlaSummary(data); })
      .catch(() => { if (active) setSlaSummary(null); });
    return () => { active = false; };
  }, []);

  // Title bar
  useEffect(() => {
    setActions(
      <>
        <Button variant="secondary" size="sm" onClick={() => exportSummary()} type="button">Export</Button>
        <Button as={Link} variant="secondary" size="sm" to="/projects">Projects</Button>
        <Button as={Link} variant="secondary" size="sm" to="/workload">Workload</Button>
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
  const actionColumns = useMemo<Column<ProjectActionRow>[]>(() => [
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
          {/* 20c-15 — KPI strip extracted to DirectorKpiStrip.tsx. */}
          <DirectorKpiStrip
            summary={d.summary}
            weeklyTrend={d.weeklyTrend}
            portfolioSummary={ps}
            slaSummary={slaSummary}
          />

          {/* Phase B3 — "What needs you now" anomaly rail (DS/page-director.jsx). */}
          {isFeatureEnabled('dsRefresh') ? <DirectorAnomalyRail /> : null}

          <PendingApprovalsCard />

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
                <Table
                  variant="compact"
                  columns={[
                    { key: 'unit', title: 'Org Unit', getValue: (item) => item.orgUnitName, render: (item) => <span style={{ fontWeight: 500 }}>{item.orgUnitName}</span> },
                    { key: 'util', title: 'Util %', align: 'right', getValue: (item) => item.utilisation, render: (item) => <span style={{ ...NUM, fontWeight: 600, color: tc(item.utilisation, 60, 40, false) }}><Pct value={item.utilisation} /></span> },
                  ] as Column<typeof d.unitUtilisation[number]>[]}
                  rows={d.unitUtilisation}
                  getRowKey={(item) => item.orgUnitId}
                />
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
                  <Table
                    variant="compact"
                    columns={[
                      { key: 'status', title: 'Status', getValue: (r) => r.label, render: (r) => <StatusBadge status={r.tone} label={r.label} variant="dot" /> },
                      { key: 'count', title: 'Count', align: 'right', getValue: (r) => r.count, render: (r) => <span style={NUM}>{r.count}</span> },
                      { key: 'pct', title: '%', align: 'right', getValue: (r) => r.pct, render: (r) => <span style={NUM}><Pct value={r.pct} /></span> },
                    ] as Column<{ tone: string; label: string; count: number; pct: number }>[]}
                    rows={[
                      { tone: 'active', label: 'Green', count: ps.byRag.green, pct: ps.totalProjects > 0 ? Math.round(ps.byRag.green / ps.totalProjects * 100) : 0 },
                      { tone: 'warning', label: 'Amber', count: ps.byRag.amber, pct: ps.totalProjects > 0 ? Math.round(ps.byRag.amber / ps.totalProjects * 100) : 0 },
                      { tone: 'danger', label: 'Red', count: ps.byRag.red, pct: ps.totalProjects > 0 ? Math.round(ps.byRag.red / ps.totalProjects * 100) : 0 },
                    ]}
                    getRowKey={(r) => r.label}
                  />
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
                  <Table
                    variant="compact"
                    columns={[
                      { key: 'person', title: 'Person', getValue: (p) => p.displayName, render: (p) => <span style={{ fontWeight: 500 }}>{p.displayName}</span> },
                      { key: 'alloc', title: 'Alloc %', align: 'right', getValue: (p) => p.currentAllocation, render: (p) => <span style={{ ...NUM, color: p.currentAllocation === 0 ? 'var(--color-status-active)' : 'var(--color-text-muted)' }}><Pct value={p.currentAllocation} /></span> },
                      { key: 'avail', title: 'Available', getValue: (p) => p.availableFrom ?? 'Now', render: (p) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.availableFrom ?? 'Now'}</span> },
                    ] as Column<typeof availablePool[number]>[]}
                    rows={availablePool.slice(0, 10)}
                    getRowKey={(p) => p.id}
                    onRowClick={(p) => navigate(`/people/${p.id}`)}
                  />
                  {availablePool.length > 10 ? <div style={{ marginTop: 'var(--space-2)', fontSize: 11, color: 'var(--color-text-muted)' }}>Showing 10 of {availablePool.length} — <Link to="/workload" style={{ color: 'var(--color-accent)' }}>View all</Link></div> : null}
                </>
              )}
            </SectionCard>
          </div>

          {/* ═══ PORTFOLIO HEATMAP WITH TIMELINES ═══ */}
          <SectionCard title={
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              Portfolio Staffing Timeline
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {([
                  { label: '2W', weeks: 2 },
                  { label: '1M', weeks: 4 },
                  { label: '3M', weeks: 13 },
                  { label: '6M', weeks: 26 },
                  { label: '12M', weeks: 52 },
                ] as const).map((opt) => (
                  <Button
                    key={opt.weeks}
                    size="xs"
                    variant={heatmapWeeks === opt.weeks ? 'primary' : 'secondary'}
                    onClick={() => setHeatmapWeeks(opt.weeks)}
                  >
                    {opt.label}
                  </Button>
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
              <DataView<ProjectActionRow>
                pageSizeOptions={[1000]}
                caption="Projects sorted by health — worst first"
                columns={actionColumns}
                getRowKey={(row) => row.id}
                rows={sortedProjects}
                onRowClick={(row) => navigate(`/projects/${row.id}/dashboard`)}
                variant="compact"
              />
            )}
          </div>

          {/* Charts section moved above heatmap */}

          {/* ═══ RECENT ACTIVITY RAIL ═══ */}
          <RecentActivityRail role="director" />

          {/* ═══ DATA FRESHNESS ═══ */}
          <DataFreshness lastFetch={lastFetch} onRefresh={refetch} />
        </>
      ) : null}
    </PageContainer>
  );
}
