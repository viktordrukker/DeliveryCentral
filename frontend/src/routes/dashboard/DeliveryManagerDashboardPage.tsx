import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { TabBar } from '@/components/common/TabBar';
import { formatDate } from '@/lib/format-date';
import { PortfolioHealthHeatmap } from '@/components/charts/PortfolioHealthHeatmap';
import { BurnRateTrendPoint, fetchScorecardHistory, ProjectHealthItem, ProjectScorecardHistoryItem, StaffingGapItem, OpenRequestsByProjectItem } from '@/lib/api/dashboard-delivery-manager';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { useDeliveryManagerDashboard } from '@/features/dashboard/useDeliveryManagerDashboard';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

export function DeliveryManagerDashboardPage(): JSX.Element {
  const state = useDeliveryManagerDashboard();
  const { setActions } = useTitleBarActions();
  const [lastFetch, setLastFetch] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'scorecard', label: 'Scorecard' },
  ];
  const activeTab = tabs.some((t) => `#${t.id}` === location.hash)
    ? location.hash.slice(1)
    : 'portfolio';

  function handleTabChange(tabId: string): void {
    navigate(`${location.pathname}${location.search}#${tabId}`, { replace: true });
  }

  const [healthScores, setHealthScores] = useState<Map<string, ProjectHealthDto>>(new Map());

  useEffect(() => {
    if (!state.data || state.data.portfolioHealth.length === 0) return;
    let active = true;
    void Promise.allSettled(
      state.data.portfolioHealth.map((item) =>
        fetchProjectHealth(item.projectId).then((h) => ({ health: h, id: item.projectId })),
      ),
    ).then((results) => {
      if (!active) return;
      const next = new Map<string, ProjectHealthDto>();
      for (const result of results) {
        if (result.status === 'fulfilled') next.set(result.value.id, result.value.health);
      }
      setHealthScores(next);
    });
    return () => { active = false; };
  }, [state.data]);

  // Title bar actions
  useEffect(() => {
    setActions(
      <>
        <PeriodSelector onAsOfChange={state.setAsOf} value={state.asOf} />
        <Link className="button button--secondary button--sm" to="/projects">Projects</Link>
        <Link className="button button--secondary button--sm" to="/assignments">Assignments</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.asOf]);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  /* ── Derived data ────────────────────────────────────────────── */
  const d = state.data;
  const activeProjects = d?.summary.totalActiveProjects ?? 0;
  const activeAssignments = d?.summary.totalActiveAssignments ?? 0;
  const noStaff = d?.summary.projectsWithNoStaff ?? 0;
  const issues = noStaff;

  const heatmapData = (d?.portfolioHealth ?? []).map((item) => {
    const flags = item.anomalyFlags.map((f) => f.toLowerCase());
    return {
      name: `${item.projectCode} — ${item.name}`,
      staffing: (item.staffingCount === 0 ? 'red' : flags.some((f) => f.includes('staff')) ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
      time: (item.approvedHours === 0 ? 'red' : flags.some((f) => f.includes('time')) ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
      timeline: (flags.some((f) => f.includes('timeline') || f.includes('overdue')) ? 'red' : 'green') as 'green' | 'yellow' | 'red',
    };
  });

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="delivery-manager-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading delivery manager dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/projects?status=active" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Total projects with active status in your portfolio." arrow="left" />
              <span className="kpi-strip__value">{activeProjects}</span>
              <span className="kpi-strip__label">Active Projects</span>
            </Link>

            <Link className="kpi-strip__item" to="/assignments?status=active" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="People currently assigned to active projects." arrow="left" />
              <span className="kpi-strip__value">{activeAssignments}</span>
              <span className="kpi-strip__label">Active Assignments</span>
            </Link>

            <Link className="kpi-strip__item" to="#unstaffed-projects" onClick={(e) => { e.preventDefault(); handleTabChange('portfolio'); }}
              style={{ borderLeft: `3px solid ${noStaff > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Projects with no staff assigned — at risk and need immediate attention." arrow="left" />
              <span className="kpi-strip__value">{noStaff}</span>
              <span className="kpi-strip__label">Unstaffed</span>
              <span className="kpi-strip__context" style={{ color: noStaff > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>
                {noStaff === 0 ? 'All staffed' : 'needs attention'}
              </span>
            </Link>

          </div>

          {/* ── TABS ── */}
          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={tabs} />
          </div>

          {/* ── Portfolio tab ── */}
          {activeTab === 'portfolio' && (
            <>
              {heatmapData.length > 0 && (
                <div className="dashboard-hero" style={{ position: 'relative' }}>
                  <TipBalloon tip="Portfolio health heatmap showing staffing and timeline status per project." arrow="left" />
                  <div className="dashboard-hero__header">
                    <div>
                      <div className="dashboard-hero__title">Portfolio Health Overview</div>
                      <div className="dashboard-hero__subtitle">Green = healthy, yellow = watch, red = action needed</div>
                    </div>
                  </div>
                  <div className="dashboard-hero__chart">
                    <PortfolioHealthHeatmap projects={heatmapData} />
                  </div>
                </div>
              )}

              <SectionCard title="Portfolio Health" collapsible chartExport={{
                headers: ['Project', 'Code', 'Status', 'Staff', 'Flags'],
                rows: (d.portfolioHealth).map((i) => ({ Project: i.name, Code: i.projectCode, Status: i.status, Staff: String(i.staffingCount), Flags: i.anomalyFlags.join(', ') })),
              }}>
                {d.portfolioHealth.length === 0 ? (
                  <EmptyState description="No active projects found for this period." title="No portfolio data" />
                ) : (
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th style={{ width: 70 }}>Code</th>
                          <th style={{ width: 60 }}>Status</th>
                          <th style={NUM}>Staff</th>
                          <th style={{ width: 120 }}>Flags</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.portfolioHealth.map((item) => (
                          <tr key={item.projectId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${item.projectId}/dashboard`)}>
                            <td style={{ fontWeight: 500 }}>{item.name}</td>
                            <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{item.projectCode}</td>
                            <td style={{ fontSize: 11 }}>{item.status}</td>
                            <td style={{ ...NUM, color: item.staffingCount === 0 ? 'var(--color-status-danger)' : 'inherit' }}>{item.staffingCount}</td>
                            <td>
                              {item.anomalyFlags.length > 0 ? (
                                <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>
                                  {item.anomalyFlags.length} flag{item.anomalyFlags.length !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-status-active)', fontSize: 11 }}>OK</span>
                              )}
                            </td>
                            <td><Link to={`/projects/${item.projectId}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {(d.staffingGaps ?? []).length > 0 && (
                <SectionCard id="unstaffed-projects" title="Staffing Gaps — Assignments Ending Soon" collapsible>
                  <StaffingGapsTable gaps={d.staffingGaps ?? []} />
                </SectionCard>
              )}

              {(d.openRequestsByProject ?? []).length > 0 && (
                <SectionCard title="Open Staffing Requests by Project" collapsible>
                  <OpenRequestsByProjectTable rows={d.openRequestsByProject ?? []} />
                </SectionCard>
              )}
            </>
          )}

          {/* ── Scorecard tab ── */}
          {activeTab === 'scorecard' && (
            d.portfolioHealth.length > 0 ? (
              <SectionCard title="Project Health Scorecard" collapsible>
                <ProjectHealthScorecardTable
                  asOf={state.asOf}
                  healthScores={healthScores}
                  projects={d.portfolioHealth}
                />
              </SectionCard>
            ) : (
              <EmptyState description="No active projects found for this period." title="No scorecard data" />
            )
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

/* ── Helper components ───────────────────────────────────────────── */

interface ProjectHealthScorecardTableProps {
  asOf: string;
  healthScores: Map<string, ProjectHealthDto>;
  projects: ProjectHealthItem[];
}

function scoreIndicator(score: number): JSX.Element {
  const color = score >= 30 ? 'var(--color-status-active)' : score >= 15 ? 'var(--color-status-warning)' : 'var(--color-status-danger)';
  return (
    <span style={{ background: color, borderRadius: 3, color: '#fff', display: 'inline-block', fontSize: 11, fontWeight: 600, minWidth: 28, padding: '1px 6px', textAlign: 'center' }}>
      {score}
    </span>
  );
}

function ProjectHealthScorecardTable({ asOf, healthScores, projects }: ProjectHealthScorecardTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Map<string, ProjectScorecardHistoryItem>>(new Map());

  useEffect(() => {
    if (!expandedId || historyMap.has(expandedId)) return;
    let active = true;
    void fetchScorecardHistory({ asOf, projectId: expandedId, weeks: 12 }).then((items) => {
      if (!active) return;
      const item = items.find((i) => i.projectId === expandedId);
      if (item) setHistoryMap((prev) => new Map(prev).set(expandedId, item));
    });
    return () => { active = false; };
  }, [expandedId, asOf, historyMap]);

  return (
    <div style={{ overflow: 'auto' }}>
      <table className="dash-compact-table">
        <thead>
          <tr>
            <th>Project</th>
            <th style={{ width: 80 }}>Health</th>
            <th style={{ width: 60 }}>Staff</th>
            <th style={{ width: 60 }}>Time</th>
            <th style={{ width: 60 }}>Timeline</th>
            <th style={{ width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((item) => {
            const h = healthScores.get(item.projectId);
            const isExpanded = expandedId === item.projectId;
            const history = historyMap.get(item.projectId);
            return (
              <>
                <tr key={item.projectId}>
                  <td style={{ fontWeight: 500 }}>
                    <Link to={`/projects/${item.projectId}/dashboard`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.projectCode} — {item.name}
                    </Link>
                  </td>
                  <td>{h ? <ProjectHealthBadge grade={h.grade} score={h.score} size="sm" /> : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span>}</td>
                  <td>{h ? <Link style={{ textDecoration: 'none' }} to={`/assignments?projectId=${item.projectId}&status=active`}>{scoreIndicator(h.staffingScore)}</Link> : '\u2014'}</td>
                  <td>{h ? <Link style={{ textDecoration: 'none' }} to={`/time-management?tab=compliance`}>{scoreIndicator(h.timeScore)}</Link> : '\u2014'}</td>
                  <td>{h ? <Link style={{ textDecoration: 'none' }} to={`/projects/${item.projectId}`}>{scoreIndicator(h.timelineScore)}</Link> : '\u2014'}</td>
                  <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : item.projectId)}
                      className="button button--secondary button--sm"
                      style={{ fontSize: 10, padding: '2px 8px' }}
                      type="button"
                    >
                      History {isExpanded ? '\u25B4' : '\u25BE'}
                    </button>
                    <Link className="button button--secondary button--sm" style={{ fontSize: 10, padding: '2px 8px' }} to={`/projects/${item.projectId}/dashboard`}>View</Link>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr key={`${item.projectId}-history`}>
                    <td colSpan={6} style={{ background: 'var(--color-surface-alt)', padding: '12px 16px' }}>
                      {history ? (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>12-Week Health Trend</div>
                          <ResponsiveContainer height={120} width="100%">
                            <LineChart data={history.history} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                              <Tooltip formatter={(v: unknown) => [`${String(v)}%`, '']} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Line dataKey="staffingPct" dot={false} name="Staffing" stroke="var(--color-chart-5, #6366f1)" strokeWidth={2} type="monotone" />
                              <Line dataKey="timePct" dot={false} name="Time" stroke="var(--color-status-active)" strokeWidth={2} type="monotone" />
                              <Line dataKey="timelinePct" dot={false} name="Timeline" stroke="var(--color-status-warning)" strokeWidth={2} type="monotone" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Loading history...</span>
                      )}
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StaffingGapsTable({ gaps }: { gaps: StaffingGapItem[] }): JSX.Element {
  return (
    <div style={{ overflow: 'auto' }} data-testid="staffing-gaps-table">
      <table className="dash-compact-table">
        <thead>
          <tr>
            <th>Project</th>
            <th style={{ width: 90 }}>Person</th>
            <th style={{ width: 90 }}>End Date</th>
            <th style={NUM}>Days Left</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap) => (
            <tr key={gap.assignmentId}>
              <td style={{ fontWeight: 500 }}>{gap.projectCode} — {gap.projectName}</td>
              <td><Link to={`/people/${gap.personId}`} style={{ fontSize: 11, color: 'var(--color-accent)' }}>{gap.personId.slice(0, 8)}...</Link></td>
              <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{gap.endDate}</td>
              <td style={{ ...NUM, color: gap.daysUntilEnd <= 7 ? 'var(--color-status-danger)' : gap.daysUntilEnd <= 14 ? 'var(--color-status-warning)' : 'var(--color-status-active)', fontWeight: 600 }}>
                {gap.daysUntilEnd}d
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpenRequestsByProjectTable({ rows }: { rows: OpenRequestsByProjectItem[] }): JSX.Element {
  return (
    <div style={{ overflow: 'auto' }} data-testid="open-requests-by-project-table">
      <table className="dash-compact-table">
        <thead>
          <tr>
            <th>Project</th>
            <th style={NUM}>Open Requests</th>
            <th style={NUM}>Headcount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId}>
              <td style={{ fontWeight: 500 }}>{row.projectCode} — {row.projectName}</td>
              <td style={NUM}>{row.openRequestCount}</td>
              <td style={NUM}>{row.totalHeadcountFulfilled}/{row.totalHeadcountRequired}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BurnRateTrendChart({ data }: { data: BurnRateTrendPoint[] }): JSX.Element {
  return (
    <div data-testid="burn-rate-trend-chart" style={{ height: 240 }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ bottom: 0, left: 0, right: 16, top: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="approvedEntryCount" dot={false} name="Time entries" stroke="var(--color-chart-5, #6366f1)" strokeWidth={2} type="monotone" />
          <Line dataKey="projectCount" dot={false} name="Active projects" stroke="var(--color-status-active)" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
