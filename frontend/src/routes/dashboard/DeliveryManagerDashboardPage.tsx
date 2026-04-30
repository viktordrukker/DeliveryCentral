import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
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
import { Button, Table, type Column } from '@/components/ds';

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
        <Button as={Link} variant="secondary" size="sm" to="/projects">Projects</Button>
        <Button as={Link} variant="secondary" size="sm" to="/assignments">Assignments</Button>
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
                  <Table
                    variant="compact"
                    columns={[
                      { key: 'name', title: 'Project', getValue: (item) => item.name, render: (item) => <span style={{ fontWeight: 500 }}>{item.name}</span> },
                      { key: 'code', title: 'Code', width: 70, getValue: (item) => item.projectCode, render: (item) => <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{item.projectCode}</span> },
                      { key: 'status', title: 'Status', width: 60, getValue: (item) => item.status, render: (item) => <span style={{ fontSize: 11 }}>{item.status}</span> },
                      { key: 'staff', title: 'Staff', align: 'right', getValue: (item) => item.staffingCount, render: (item) => <span style={{ ...NUM, color: item.staffingCount === 0 ? 'var(--color-status-danger)' : 'inherit' }}>{item.staffingCount}</span> },
                      { key: 'flags', title: 'Flags', width: 120, render: (item) => item.anomalyFlags.length > 0 ? (
                        <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>
                          {item.anomalyFlags.length} flag{item.anomalyFlags.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-status-active)', fontSize: 11 }}>OK</span>
                      ) },
                      { key: 'go', title: '', width: 40, render: (item) => <Link to={`/projects/${item.projectId}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
                    ] as Column<typeof d.portfolioHealth[number]>[]}
                    rows={d.portfolioHealth}
                    getRowKey={(item) => item.projectId}
                    onRowClick={(item) => navigate(`/projects/${item.projectId}/dashboard`)}
                  />
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


          <DataFreshness


            lastFetch={lastFetch}


            onRefresh={refetch}


            tip={<TipBalloon tip="Shows when data was last loaded. Click Refresh to pull the latest numbers." arrow="top" />}


          />
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

  const expandedItem = projects.find((p) => p.projectId === expandedId);
  const expandedHistory = expandedId ? historyMap.get(expandedId) : null;

  return (
    <div>
      <Table
        variant="compact"
        columns={[
          { key: 'project', title: 'Project', getValue: (item) => item.name, render: (item) => (
            <span style={{ fontWeight: 500 }}>
              <Link to={`/projects/${item.projectId}/dashboard`} style={{ color: 'inherit', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                {item.projectCode} — {item.name}
              </Link>
            </span>
          ) },
          { key: 'health', title: 'Health', width: 80, render: (item) => {
            const h = healthScores.get(item.projectId);
            return h ? <ProjectHealthBadge grade={h.grade} score={h.score} size="sm" /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
          } },
          { key: 'staff', title: 'Staff', width: 60, render: (item) => {
            const h = healthScores.get(item.projectId);
            return h ? <Link style={{ textDecoration: 'none' }} to={`/assignments?projectId=${item.projectId}&status=active`} onClick={(e) => e.stopPropagation()}>{scoreIndicator(h.staffingScore)}</Link> : '—';
          } },
          { key: 'time', title: 'Time', width: 60, render: (item) => {
            const h = healthScores.get(item.projectId);
            return h ? <Link style={{ textDecoration: 'none' }} to={`/time-management?tab=compliance`} onClick={(e) => e.stopPropagation()}>{scoreIndicator(h.timeScore)}</Link> : '—';
          } },
          { key: 'timeline', title: 'Timeline', width: 60, render: (item) => {
            const h = healthScores.get(item.projectId);
            return h ? <Link style={{ textDecoration: 'none' }} to={`/projects/${item.projectId}`} onClick={(e) => e.stopPropagation()}>{scoreIndicator(h.timelineScore)}</Link> : '—';
          } },
          { key: 'actions', title: '', width: 100, render: (item) => {
            const isExpanded = expandedId === item.projectId;
            return (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <Button aria-expanded={isExpanded} onClick={() => setExpandedId(isExpanded ? null : item.projectId)} variant="secondary" size="sm" style={{ fontSize: 10, padding: '2px 8px' }} type="button">
                  History {isExpanded ? '▴' : '▾'}
                </Button>
                <Button as={Link} variant="secondary" size="sm" style={{ fontSize: 10, padding: '2px 8px' }} to={`/projects/${item.projectId}/dashboard`}>View</Button>
              </div>
            );
          } },
        ] as Column<ProjectHealthItem>[]}
        rows={projects}
        getRowKey={(item) => item.projectId}
      />
      {expandedItem ? (
        <div style={{ background: 'var(--color-surface-alt)', padding: '12px 16px', marginTop: 'var(--space-1)', borderRadius: 4 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            12-Week Health Trend — {expandedItem.projectCode} {expandedItem.name}
          </div>
          {expandedHistory ? (
            <ResponsiveContainer height={120} width="100%">
              <LineChart data={expandedHistory.history} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
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
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Loading history...</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StaffingGapsTable({ gaps }: { gaps: StaffingGapItem[] }): JSX.Element {
  return (
    <Table
      testId="staffing-gaps-table"
      variant="compact"
      columns={[
        { key: 'project', title: 'Project', getValue: (gap) => `${gap.projectCode} — ${gap.projectName}`, render: (gap) => <span style={{ fontWeight: 500 }}>{gap.projectCode} — {gap.projectName}</span> },
        { key: 'person', title: 'Person', width: 90, getValue: (gap) => gap.personId, render: (gap) => <Link to={`/people/${gap.personId}`} style={{ fontSize: 11, color: 'var(--color-accent)' }}>{gap.personId.slice(0, 8)}...</Link> },
        { key: 'endDate', title: 'End Date', width: 90, getValue: (gap) => gap.endDate, render: (gap) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{gap.endDate}</span> },
        { key: 'daysLeft', title: 'Days Left', align: 'right', getValue: (gap) => gap.daysUntilEnd, render: (gap) => <span style={{ ...NUM, color: gap.daysUntilEnd <= 7 ? 'var(--color-status-danger)' : gap.daysUntilEnd <= 14 ? 'var(--color-status-warning)' : 'var(--color-status-active)', fontWeight: 600 }}>{gap.daysUntilEnd}d</span> },
      ] as Column<StaffingGapItem>[]}
      rows={gaps}
      getRowKey={(gap) => gap.assignmentId}
    />
  );
}

function OpenRequestsByProjectTable({ rows }: { rows: OpenRequestsByProjectItem[] }): JSX.Element {
  return (
    <Table
      testId="open-requests-by-project-table"
      variant="compact"
      columns={[
        { key: 'project', title: 'Project', getValue: (row) => `${row.projectCode} — ${row.projectName}`, render: (row) => <span style={{ fontWeight: 500 }}>{row.projectCode} — {row.projectName}</span> },
        { key: 'openCount', title: 'Open Requests', align: 'right', getValue: (row) => row.openRequestCount, render: (row) => <span style={NUM}>{row.openRequestCount}</span> },
        { key: 'hc', title: 'Headcount', align: 'right', render: (row) => <span style={NUM}>{row.totalHeadcountFulfilled}/{row.totalHeadcountRequired}</span> },
      ] as Column<OpenRequestsByProjectItem>[]}
      rows={rows}
      getRowKey={(row) => row.projectId}
    />
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
