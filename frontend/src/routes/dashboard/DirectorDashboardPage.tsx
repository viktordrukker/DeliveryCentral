import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useTitleBarActions } from '@/app/title-bar-context';
import { DateRangePreset } from '@/components/common/DateRangePreset';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { SectionCard } from '@/components/common/SectionCard';
import { TabBar } from '@/components/common/TabBar';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { CostDistributionPie } from '@/components/charts/CostDistributionPie';
import { FteTrendChart, FteTrendPoint } from '@/components/charts/FteTrendChart';
import { WorkloadGauge } from '@/components/charts/WorkloadGauge';
import { UnitUtilisationItem, WeeklyTrendPoint } from '@/lib/api/dashboard-director';
import { useDirectorDashboard } from '@/features/dashboard/useDirectorDashboard';
import { exportToXlsx } from '@/lib/export';
import { fetchCapitalisationReport } from '@/lib/api/capitalisation';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { fetchWorkloadMatrix } from '@/lib/api/workload';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const DIRECTOR_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'trends', label: 'Trends' },
  { id: 'evidence', label: 'Evidence' },
];

interface PortfolioProjectRow {
  id: string;
  name: string;
  projectCode: string;
  status: string;
  assignmentCount: number;
  health: ProjectHealthDto | null;
}

export function DirectorDashboardPage(): JSX.Element {
  const state = useDirectorDashboard();
  const { setActions } = useTitleBarActions();
  const location = useLocation();
  const navigate = useNavigate();
  const [lastFetch, setLastFetch] = useState(new Date());
  const activeTab = DIRECTOR_TABS.some((t) => `#${t.id}` === location.hash)
    ? location.hash.slice(1)
    : 'overview';

  function handleTabChange(tabId: string): void {
    navigate(`${location.pathname}${location.search}#${tabId}`, { replace: true });
  }

  function handleExportSummary(): void {
    if (!state.data) return;
    const { summary, asOf } = state.data;
    exportToXlsx(
      [
        { Metric: 'As Of', Value: asOf },
        { Metric: 'Active Projects', Value: summary.activeProjectCount },
        { Metric: 'Active Assignments', Value: summary.activeAssignmentCount },
        { Metric: 'Staffed People', Value: summary.staffedPersonCount },
        { Metric: 'Unstaffed Active People', Value: summary.unstaffedActivePersonCount },
        { Metric: 'Evidence Coverage Rate (%)', Value: summary.evidenceCoverageRate },
      ],
      `director_dashboard_summary_${asOf.slice(0, 10)}`,
    );
  }

  // Title bar actions
  useEffect(() => {
    setActions(
      <>
        <DateRangePreset
          compact
          value={{ from: state.asOf.slice(0, 10), to: '' }}
          onChange={(r) => { if (r.from) state.setAsOf(`${r.from}T00:00:00.000Z`); }}
        />
        {state.data ? (
          <button className="button button--secondary button--sm" onClick={handleExportSummary} type="button">Export</button>
        ) : null}
        <Link className="button button--secondary button--sm" to="/projects">Projects</Link>
        <Link className="button button--secondary button--sm" to="/org">Org chart</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.asOf, state.data]);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  // FTE trend
  const fteTrend: FteTrendPoint[] = deriveFteTrend(state.data?.weeklyTrend ?? []);

  // Portfolio summary
  const [portfolioRows, setPortfolioRows] = useState<PortfolioProjectRow[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Cost distribution
  const [costData, setCostData] = useState<Array<{ projectName: string; totalHours: number }>>([]);
  const [capEnabled, setCapEnabled] = useState(false);

  // Utilisation gauge
  const [avgAllocation, setAvgAllocation] = useState<number | null>(null);

  // Overallocated people
  const [overallocated, setOverallocated] = useState<Array<{ id: string; displayName: string; totalPercent: number }>>([]);

  useEffect(() => {
    setPortfolioLoading(true);
    void fetchProjectDirectory()
      .then(async (res) => {
        const projects = res.items;
        const healthResults = await Promise.allSettled(
          projects.map((p) => fetchProjectHealth(p.id)),
        );
        setPortfolioRows(projects.map((p, idx) => ({
          assignmentCount: p.assignmentCount,
          health: healthResults[idx].status === 'fulfilled' ? healthResults[idx].value : null,
          id: p.id, name: p.name, projectCode: p.projectCode, status: p.status,
        })));
      })
      .catch(() => {})
      .finally(() => setPortfolioLoading(false));
  }, []);

  useEffect(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
    void fetchCapitalisationReport({ from, to })
      .then((report) => {
        if (report.byProject.length > 0) {
          setCapEnabled(true);
          setCostData(report.byProject.map((row) => ({ projectName: row.projectName, totalHours: row.totalHours })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void fetchWorkloadMatrix()
      .then((matrix) => {
        const alloc: number[] = [];
        const over: Array<{ id: string; displayName: string; totalPercent: number }> = [];
        for (const person of matrix.people) {
          const total = person.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
          alloc.push(total);
          if (total > 100) over.push({ id: person.id, displayName: person.displayName, totalPercent: total });
        }
        if (alloc.length > 0) setAvgAllocation(Math.round(alloc.reduce((s, v) => s + v, 0) / alloc.length));
        setOverallocated(over.sort((a, b) => b.totalPercent - a.totalPercent));
      })
      .catch(() => {});
  }, []);

  const d = state.data;
  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="director-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading director dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/projects?status=active" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Total projects with status Active across the entire organization." arrow="left" />
              <span className="kpi-strip__value">{d.summary.activeProjectCount}</span>
              <span className="kpi-strip__label">Active Projects</span>
            </Link>

            <Link className="kpi-strip__item" to="/assignments?status=active" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="Total people currently assigned to projects organization-wide." arrow="left" />
              <span className="kpi-strip__value">{d.summary.activeAssignmentCount}</span>
              <span className="kpi-strip__label">Active Assignments</span>
            </Link>

            <Link className="kpi-strip__item" to="/people" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <TipBalloon tip="People with at least one active assignment." arrow="left" />
              <span className="kpi-strip__value">{d.summary.staffedPersonCount}</span>
              <span className="kpi-strip__label">Staffed People</span>
            </Link>

            <Link className="kpi-strip__item" to="/people?filter=unassigned"
              style={{ borderLeft: `3px solid ${d.summary.unstaffedActivePersonCount > 5 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Active people without any current assignment." arrow="left" />
              <span className="kpi-strip__value">{d.summary.unstaffedActivePersonCount}</span>
              <span className="kpi-strip__label">Unstaffed</span>
            </Link>

            <Link className="kpi-strip__item" to="/work-evidence"
              style={{ borderLeft: `3px solid ${d.summary.evidenceCoverageRate < 40 ? 'var(--color-status-danger)' : d.summary.evidenceCoverageRate < 80 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Percentage of assignments that have matching work evidence." arrow="left" />
              <span className="kpi-strip__value">{d.summary.evidenceCoverageRate}%</span>
              <span className="kpi-strip__label">Evidence Coverage</span>
              <div className="kpi-strip__progress">
                <div className="kpi-strip__progress-fill" style={{ width: `${d.summary.evidenceCoverageRate}%`, background: d.summary.evidenceCoverageRate >= 80 ? 'var(--color-status-active)' : d.summary.evidenceCoverageRate >= 40 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }} />
              </div>
            </Link>
          </div>

          {/* ── TABS ── */}
          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={DIRECTOR_TABS} />
          </div>

          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <>
              <div className="dashboard-main-grid">
                <SectionCard title="Unit Utilisation" collapsible>
                  {d.unitUtilisation.length === 0 ? (
                    <EmptyState description="No org unit utilisation data available." title="No utilisation data" />
                  ) : (
                    <table className="dash-compact-table">
                      <thead>
                        <tr><th>Org Unit</th><th style={NUM}>Staffed</th><th style={NUM}>Total</th><th style={NUM}>Util %</th><th style={{ width: 80 }}>Bar</th><th style={{ width: 40 }}></th></tr>
                      </thead>
                      <tbody>
                        {d.unitUtilisation.map((item) => (
                          <tr key={item.orgUnitId}>
                            <td style={{ fontWeight: 500 }}>{item.orgUnitName}</td>
                            <td style={NUM}>{item.staffedCount}</td>
                            <td style={NUM}>{item.memberCount}</td>
                            <td style={{ ...NUM, fontWeight: 600, color: item.utilisation >= 80 ? 'var(--color-status-active)' : item.utilisation >= 40 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }}>{item.utilisation}%</td>
                            <td>
                              <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(item.utilisation, 100)}%`, borderRadius: 2, background: item.utilisation >= 80 ? 'var(--color-status-active)' : item.utilisation >= 40 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }} />
                              </div>
                            </td>
                            <td><Link to={`/teams?orgUnitId=${item.orgUnitId}`} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </SectionCard>

                <SectionCard title="Portfolio Summary" collapsible>
                  {portfolioLoading ? (
                    <LoadingState variant="skeleton" skeletonType="table" />
                  ) : portfolioRows.length === 0 ? (
                    <EmptyState description="No projects found." title="No projects" />
                  ) : (
                    <div style={{ overflow: 'auto' }}>
                      <table className="dash-compact-table" data-testid="portfolio-summary-table">
                        <thead>
                          <tr><th>Project</th><th style={{ width: 60 }}>Status</th><th style={{ width: 70 }}>Health</th><th style={NUM}>Staff</th><th style={{ width: 40 }}></th></tr>
                        </thead>
                        <tbody>
                          {portfolioRows.map((row) => (
                            <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${row.id}`)}>
                              <td style={{ fontWeight: 500 }}>{row.name}</td>
                              <td><span style={{ fontSize: 11, fontWeight: 600 }}>{row.status}</span></td>
                              <td>{row.health ? <ProjectHealthBadge grade={row.health.grade} score={row.health.score} size="sm" /> : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span>}</td>
                              <td style={NUM}>{row.assignmentCount}</td>
                              <td><Link to={`/projects/${row.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </div>

              {capEnabled && costData.length > 0 && (
                <SectionCard title="Cost Distribution by Project" collapsible chartExport={{
                  headers: ['Project', 'Total Hours'],
                  rows: costData.map((cd) => ({ Project: cd.projectName, 'Total Hours': String(cd.totalHours) })),
                }}>
                  <CostDistributionPie data={costData} />
                </SectionCard>
              )}

              {avgAllocation !== null && (
                <SectionCard title="Org-Wide Average Utilisation" collapsible>
                  <WorkloadGauge allocationPercent={avgAllocation} />
                </SectionCard>
              )}
            </>
          )}

          {/* ── Staffing tab ── */}
          {activeTab === 'staffing' && (
            <>
              <SectionCard title="8-Week Staffing Trend" collapsible>
                {!d.weeklyTrend || d.weeklyTrend.length === 0 ? (
                  <EmptyState description="No weekly trend data available." title="No trend data" />
                ) : (
                  <WeeklyTrendChart points={d.weeklyTrend} />
                )}
              </SectionCard>

              {overallocated.length > 0 && (
                <div className="dash-action-section" style={{ position: 'relative' }}>
                  <TipBalloon tip="People allocated above 100% across all assignments." arrow="left" />
                  <div className="dash-action-section__header">
                    <span className="dash-action-section__title">Overallocated Resources ({overallocated.length})</span>
                  </div>
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table">
                      <thead>
                        <tr><th>Person</th><th style={NUM}>Alloc %</th><th style={{ width: 80 }}>Bar</th><th style={{ width: 40 }}></th></tr>
                      </thead>
                      <tbody>
                        {overallocated.map((person) => (
                          <tr key={person.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${person.id}`)}>
                            <td style={{ fontWeight: 500, color: 'var(--color-status-danger)' }}>{person.displayName}</td>
                            <td style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-danger)' }}>{person.totalPercent}%</td>
                            <td>
                              <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: '100%', borderRadius: 2, background: 'var(--color-status-danger)' }} />
                              </div>
                            </td>
                            <td><Link to={`/people/${person.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <SectionCard title="Unstaffed Active People" collapsible>
                <EmptyState
                  description={`${d.summary.unstaffedActivePersonCount} active people have no current assignment.`}
                  title={`${d.summary.unstaffedActivePersonCount} unstaffed`}
                  action={{ label: 'View people', href: '/people?filter=unassigned' }}
                />
              </SectionCard>
            </>
          )}

          {/* ── Trends tab ── */}
          {activeTab === 'trends' && (
            <SectionCard title="Total FTE by Month (12-month trend)" collapsible chartExport={fteTrend.length > 0 ? {
              headers: ['Month', 'FTE'],
              rows: fteTrend.map((f) => ({ Month: f.month, FTE: String(f.fte) })),
            } : undefined}>
              {fteTrend.length === 0 ? (
                <EmptyState description="FTE trend data will appear once assignment history is available." title="No FTE trend data" />
              ) : (
                <FteTrendChart data={fteTrend} />
              )}
            </SectionCard>
          )}

          {/* ── Evidence tab ── */}
          {activeTab === 'evidence' && (
            <SectionCard title="Evidence Coverage" collapsible>
              <EmptyState
                description={`Current evidence coverage rate: ${d.summary.evidenceCoverageRate}%. Review unmatched evidence entries or active assignments without logged evidence.`}
                title={`${d.summary.evidenceCoverageRate}% coverage`}
                action={{ label: 'View evidence', href: '/work-evidence' }}
              />
            </SectionCard>
          )}

          {/* ── DATA FRESHNESS ── */}
          <div className="data-freshness">
            Updated {formatDistanceToNow(lastFetch, { addSuffix: true })} {'\u00B7'}{' '}
            <button onClick={refetch} type="button">Refresh</button>
            {' '}
            <TipBalloon tip="Shows when data was last loaded. Click Refresh to pull the latest numbers." arrow="top" />
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}

/* ── Helper functions ────────────────────────────────────────────── */

function deriveFteTrend(weeklyTrend: WeeklyTrendPoint[]): FteTrendPoint[] {
  if (weeklyTrend.length === 0) return [];
  const byMonth = new Map<string, number[]>();
  for (const point of weeklyTrend) {
    const monthKey = point.weekStarting.slice(0, 7);
    const existing = byMonth.get(monthKey) ?? [];
    existing.push(point.staffedPersonCount);
    byMonth.set(monthKey, existing);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({
      fte: Math.round(counts.reduce((s, v) => s + v, 0) / counts.length),
      month,
    }));
}

function WeeklyTrendChart({ points }: { points: WeeklyTrendPoint[] }): JSX.Element {
  const maxStaffed = Math.max(...points.map((p) => p.staffedPersonCount), 1);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80, marginBottom: 8 }}>
        {points.map((point) => {
          const barHeight = Math.max((point.staffedPersonCount / maxStaffed) * 72, 4);
          const coverage = point.evidenceCoverageRate;
          const barColor = coverage >= 80 ? 'var(--color-status-active)' : coverage >= 40 ? 'var(--color-status-warning)' : 'var(--color-status-danger)';
          return (
            <div key={point.weekStarting} style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4 }}
              title={`Week ${point.weekStarting}: ${point.staffedPersonCount} staffed, ${point.evidenceCoverageRate}% coverage`}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div style={{ backgroundColor: barColor, borderRadius: '3px 3px 0 0', height: barHeight, width: '100%' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {points.map((point) => (
          <div key={point.weekStarting} style={{ flex: 1, fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', overflow: 'hidden' }}>
            {point.weekStarting.slice(5)}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Bar height = staffed people {'\u00B7'} Color: green {'\u2265'}80% evidence, amber {'\u2265'}40%, red below
      </div>
    </div>
  );
}
