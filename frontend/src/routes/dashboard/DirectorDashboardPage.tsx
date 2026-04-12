import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { SectionCard } from '@/components/common/SectionCard';
import { TabBar } from '@/components/common/TabBar';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
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
  const location = useLocation();
  const navigate = useNavigate();
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

  // FTE trend — derive from director weekly trend converted to monthly points
  const fteTrend: FteTrendPoint[] = deriveFteTrend(state.data?.weeklyTrend ?? []);

  // Portfolio summary table
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

        const rows: PortfolioProjectRow[] = projects.map((p, idx) => {
          const healthResult = healthResults[idx];
          return {
            assignmentCount: p.assignmentCount,
            health: healthResult.status === 'fulfilled' ? healthResult.value : null,
            id: p.id,
            name: p.name,
            projectCode: p.projectCode,
            status: p.status,
          };
        });

        setPortfolioRows(rows);
      })
      .catch(() => {
        // portfolio section silently degrades
      })
      .finally(() => {
        setPortfolioLoading(false);
      });
  }, []);

  useEffect(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);

    void fetchCapitalisationReport({ from, to })
      .then((report) => {
        if (report.byProject.length > 0) {
          setCapEnabled(true);
          setCostData(
            report.byProject.map((row) => ({
              projectName: row.projectName,
              totalHours: row.totalHours,
            })),
          );
        }
      })
      .catch(() => {
        // capitalisation may not be enabled
      });
  }, []);

  useEffect(() => {
    void fetchWorkloadMatrix()
      .then((matrix) => {
        const allAllocations: number[] = [];
        const overallocatedPeople: Array<{ id: string; displayName: string; totalPercent: number }> = [];

        for (const person of matrix.people) {
          const total = person.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
          allAllocations.push(total);
          if (total > 100) {
            overallocatedPeople.push({ id: person.id, displayName: person.displayName, totalPercent: total });
          }
        }

        if (allAllocations.length > 0) {
          const avg = Math.round(
            allAllocations.reduce((sum, v) => sum + v, 0) / allAllocations.length,
          );
          setAvgAllocation(avg);
        }

        setOverallocated(overallocatedPeople.sort((a, b) => b.totalPercent - a.totalPercent));
      })
      .catch(() => {
        // workload matrix silently degrades
      });
  }, []);

  // Sparkline + trend change derived from weeklyTrend
  const trend = state.data?.weeklyTrend ?? [];
  const projectsTrend = trend.map((t) => t.activeProjectCount);
  const staffedTrend = trend.map((t) => t.staffedPersonCount);
  const coverageTrend = trend.map((t) => t.evidenceCoverageRate);

  function trendChange(values: number[]): number | undefined {
    if (values.length < 2) return undefined;
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (prev === 0) return undefined;
    return Math.round(((last - prev) / prev) * 100);
  }

  return (
    <PageContainer testId="director-dashboard-page">
      <PageHeader
        actions={
          <div className="page-header__actions">
            {state.data ? (
              <button className="button button--secondary" onClick={handleExportSummary} type="button">
                Export Summary
              </button>
            ) : null}
            <Link className="button button--secondary" to="/projects">
              Open projects
            </Link>
            <Link className="button button--secondary" to="/org">
              Open org chart
            </Link>
          </div>
        }
        eyebrow="Dashboard"
        title="Director Dashboard"
      />

      <FilterBar
        actions={
          <button
            className="button button--secondary"
            onClick={() => state.setAsOf(new Date().toISOString())}
            type="button"
          >
            Reset
          </button>
        }
      >
        <PeriodSelector onAsOfChange={state.setAsOf} value={state.asOf} />
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading director dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <WorkloadCard
              href="/projects?status=active"
              label="Active Projects"
              trendChange={trendChange(projectsTrend)}
              trendData={projectsTrend}
              value={String(state.data.summary.activeProjectCount)}
            />
            <WorkloadCard
              href="/assignments?status=active"
              label="Active Assignments"
              value={String(state.data.summary.activeAssignmentCount)}
            />
            <WorkloadCard
              href="/people"
              label="Staffed People"
              trendChange={trendChange(staffedTrend)}
              trendData={staffedTrend}
              value={String(state.data.summary.staffedPersonCount)}
            />
            <WorkloadCard
              href="/people?filter=unassigned"
              label="Unstaffed Active People"
              value={String(state.data.summary.unstaffedActivePersonCount)}
              variant={state.data.summary.unstaffedActivePersonCount > 0 ? 'warning' : 'default'}
            />
            <WorkloadCard
              href="/work-evidence?filter=unmatched"
              label="Evidence Coverage"
              trendChange={trendChange(coverageTrend)}
              trendData={coverageTrend}
              value={`${state.data.summary.evidenceCoverageRate}%`}
              variant={
                state.data.summary.evidenceCoverageRate < 40
                  ? 'danger'
                  : state.data.summary.evidenceCoverageRate < 80
                    ? 'warning'
                    : 'default'
              }
            />
          </div>

          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={DIRECTOR_TABS} />
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              <div className="details-grid">
                <SectionCard title="Unit Utilisation">
                  {state.data.unitUtilisation.length === 0 ? (
                    <EmptyState
                      description="No org unit utilisation data available for this period."
                      title="No utilisation data"
                    />
                  ) : (
                    <div className="monitoring-list">
                      {state.data.unitUtilisation.map((item) => (
                        <UnitUtilisationRow key={item.orgUnitId} item={item} />
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Portfolio Summary Table */}
                <SectionCard title="Portfolio Summary">
                  {portfolioLoading ? (
                    <LoadingState label="Loading portfolio..." />
                  ) : portfolioRows.length === 0 ? (
                    <EmptyState description="No projects found." title="No projects" />
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" data-testid="portfolio-summary-table">
                        <thead>
                          <tr>
                            <th>Project</th>
                            <th>Status</th>
                            <th>Health</th>
                            <th>Staffing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioRows.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <Link to={`/projects/${row.id}`}>{row.name}</Link>
                              </td>
                              <td>
                                <span className={`badge badge--${row.status.toLowerCase()}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td>
                                {row.health ? (
                                  <ProjectHealthBadge grade={row.health.grade} score={row.health.score} />
                                ) : (
                                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                                )}
                              </td>
                              <td>
                                <Link to={`/assignments?projectId=${row.id}`}>
                                  {row.assignmentCount} assignment{row.assignmentCount !== 1 ? 's' : ''}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Cost Distribution Pie — only when capitalisation data available */}
              {capEnabled && costData.length > 0 ? (
                <SectionCard
                  chartExport={{
                    headers: ['Project', 'Total Hours'],
                    rows: costData.map((d) => ({ Project: d.projectName, 'Total Hours': d.totalHours })),
                  }}
                  title="Cost Distribution by Project"
                >
                  <CostDistributionPie data={costData} />
                </SectionCard>
              ) : null}

              {/* Utilisation Rate Gauge */}
              {avgAllocation !== null ? (
                <SectionCard title="Org-Wide Average Utilisation">
                  <WorkloadGauge allocationPercent={avgAllocation} />
                </SectionCard>
              ) : null}
            </>
          )}

          {/* Staffing tab */}
          {activeTab === 'staffing' && (
            <div className="details-grid">
              <SectionCard title="8-Week Staffing Trend">
                {!state.data.weeklyTrend || state.data.weeklyTrend.length === 0 ? (
                  <EmptyState
                    description="No weekly trend data available."
                    title="No trend data"
                  />
                ) : (
                  <WeeklyTrendChart points={state.data.weeklyTrend} />
                )}
              </SectionCard>
              <SectionCard title="Unstaffed Active People">
                <EmptyState
                  description={`${state.data.summary.unstaffedActivePersonCount} active people have no current assignment. Review the org chart or assignments list.`}
                  title={`${state.data.summary.unstaffedActivePersonCount} unstaffed`}
                />
              </SectionCard>
              <SectionCard title="Overallocated Resources">
                {overallocated.length === 0 ? (
                  <EmptyState description="No people are currently overallocated (>100%)." title="No overallocations" />
                ) : (
                  <div className="monitoring-list">
                    {overallocated.map((person) => (
                      <div className="monitoring-list__item" key={person.id} style={{ borderLeft: '3px solid #ef4444' }}>
                        <div className="monitoring-list__title" style={{ color: '#dc2626' }}>{person.displayName}</div>
                        <p className="monitoring-list__summary">{person.totalPercent}% total allocation (over 100%)</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* Trends tab */}
          {activeTab === 'trends' && (
            <SectionCard
              chartExport={fteTrend.length > 0 ? {
                headers: ['Month', 'FTE'],
                rows: fteTrend.map((d) => ({ Month: d.month, FTE: d.fte })),
              } : undefined}
              title="Total FTE by Month (12-month trend)"
            >
              {fteTrend.length === 0 ? (
                <EmptyState description="FTE trend data will appear once assignment history is available. Ensure active assignments exist." title="No FTE trend data" />
              ) : (
                <FteTrendChart data={fteTrend} />
              )}
            </SectionCard>
          )}

          {/* Evidence tab */}
          {activeTab === 'evidence' && (
            <SectionCard title="Evidence Coverage">
              <EmptyState
                description={`Current evidence coverage rate: ${state.data.summary.evidenceCoverageRate}%. Review unmatched evidence entries or active assignments without logged evidence.`}
                title={`${state.data.summary.evidenceCoverageRate}% coverage`}
              />
            </SectionCard>
          )}
        </>
      ) : null}
    </PageContainer>
  );
}

/** Derive monthly FTE from weekly trend data, then pad to 12 months if needed. */
function deriveFteTrend(weeklyTrend: WeeklyTrendPoint[]): FteTrendPoint[] {
  if (weeklyTrend.length === 0) {
    return [];
  }

  // Group by YYYY-MM
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

interface WeeklyTrendChartProps {
  points: WeeklyTrendPoint[];
}

function WeeklyTrendChart({ points }: WeeklyTrendChartProps): JSX.Element {
  const maxStaffed = Math.max(...points.map((p) => p.staffedPersonCount), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '80px', marginBottom: '8px' }}>
        {points.map((point) => {
          const barHeight = Math.max((point.staffedPersonCount / maxStaffed) * 72, 4);
          const coverage = point.evidenceCoverageRate;
          const barColor = coverage >= 80 ? '#22c55e' : coverage >= 40 ? '#f59e0b' : '#ef4444';

          return (
            <div
              key={point.weekStarting}
              style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', gap: '4px' }}
              title={`Week ${point.weekStarting}: ${point.staffedPersonCount} staffed, ${point.evidenceCoverageRate}% coverage`}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div
                  style={{
                    backgroundColor: barColor,
                    borderRadius: '3px 3px 0 0',
                    height: `${barHeight}px`,
                    width: '100%',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {points.map((point) => (
          <div
            key={point.weekStarting}
            style={{ flex: 1, fontSize: '10px', color: '#6b7280', textAlign: 'center', overflow: 'hidden' }}
          >
            {point.weekStarting.slice(5)}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
        Bar height = staffed people · Color: green ≥80% evidence, amber ≥40%, red below
      </div>
    </div>
  );
}

interface UnitUtilisationRowProps {
  item: UnitUtilisationItem;
}

function UnitUtilisationRow({ item }: UnitUtilisationRowProps): JSX.Element {
  const pct = item.utilisation;
  const barColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="monitoring-list__item">
      <div className="monitoring-list__title" style={{ alignItems: 'center', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
        <span style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
          {item.orgUnitName}
          <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 400 }}>
            {item.staffedCount}/{item.memberCount} staffed
          </span>
        </span>
        <Link
          className="button button--secondary"
          style={{ fontSize: '12px', padding: '2px 10px' }}
          to={`/teams?orgUnitId=${item.orgUnitId}`}
        >
          View team
        </Link>
      </div>
      <div style={{ alignItems: 'center', display: 'flex', gap: '8px', marginTop: '4px' }}>
        <div
          style={{
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            flex: 1,
            height: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: barColor,
              borderRadius: '4px',
              height: '100%',
              transition: 'width 0.3s ease',
              width: `${Math.min(pct, 100)}%`,
            }}
          />
        </div>
        <span style={{ color: '#374151', fontSize: '12px', fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}
