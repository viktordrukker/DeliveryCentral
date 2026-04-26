import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { DateRangePreset } from '@/components/common/DateRangePreset';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { Sparkline } from '@/components/charts/Sparkline';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import {
  WorkforceOverviewChart,
  type WorkforceWeekData,
} from '@/components/charts/WorkforceOverviewChart';
import {
  WorkloadDashboardSummary,
  fetchWorkloadDashboardSummary,
  fetchWorkloadTrend,
} from '@/lib/api/workload-dashboard';
import { QueryState } from '@/lib/api/query-state';

/* ── Threshold color helper ──────────────────────────────────────── */
const tc = (val: number, warn: number, danger: number, higherIsBad = true): string => {
  if (higherIsBad) {
    if (val >= danger) return 'var(--color-status-danger, #ef4444)';
    if (val >= warn) return 'var(--color-status-warning, #f59e0b)';
    return 'var(--color-status-active, #22c55e)';
  }
  if (val <= danger) return 'var(--color-status-danger, #ef4444)';
  if (val <= warn) return 'var(--color-status-warning, #f59e0b)';
  return 'var(--color-status-active, #22c55e)';
};

interface DashboardActionItem {
  code: string;
  entity: string;
  href: string;
  id: string;
  impact: string;
  index: number;
  portfolioPercent: number;
  severity: 'High' | 'Med' | 'Low';
  severityTone: StatusTone;
  status: string;
  suggestedAction: string;
  type: string;
}

export function DashboardPage(): JSX.Element {
  const { principal } = useAuth();
  const { setActions } = useTitleBarActions();
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [state, setState] = useState<QueryState<WorkloadDashboardSummary>>({ isLoading: true });
  const [trendRaw, setTrendRaw] = useState<Array<{ week: string; activeAssignments: number }>>([]);
  const [lastFetch, setLastFetch] = useState(new Date());

  // Inject controls + tips toggle into the page title bar
  useEffect(() => {
    setActions(
      <>
        <DateRangePreset
          compact
          value={{ from: rangeFrom, to: rangeTo }}
          onChange={(r) => { setRangeFrom(r.from); setRangeTo(r.to); }}
        />
        <Link className="button button--secondary button--sm" to="/projects">Projects</Link>
        <Link className="button button--secondary button--sm" to="/assignments">Assignments</Link>
        <Link className="button button--secondary button--sm" to="/dashboard/planned-vs-actual">Planned vs actual</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, rangeFrom, rangeTo]);

  const refetch = (): void => {
    setState({ isLoading: true });
    void fetchWorkloadDashboardSummary()
      .then((data) => { setState({ data, isLoading: false }); setLastFetch(new Date()); })
      .catch((err: unknown) => setState({ error: err instanceof Error ? err.message : 'Failed to load.', isLoading: false }));
  };

  useEffect(() => { refetch(); }, []);

  useEffect(() => {
    let active = true;
    void fetchWorkloadTrend(24)
      .then((pts) => { if (active) setTrendRaw(pts); })
      .catch(() => { if (active) setTrendRaw([]); });
    return () => { active = false; };
  }, []);

  /* ── Derived metrics ───────────────────────────────────────────── */
  const d = state.data;
  const activeProjects = d?.totalActiveProjects ?? 0;
  const activeAssignments = d?.totalActiveAssignments ?? 0;
  const unassigned = d?.unassignedActivePeopleCount ?? 0;
  const totalPeople = activeAssignments + unassigned;
  const utilizationPct = totalPeople > 0 ? Math.round((activeAssignments / totalPeople) * 100) : 0;
  const noStaffCount = d?.projectsWithNoStaffCount ?? 0;
  const issues = noStaffCount;
  const projectsWithNoStaff = d?.projectsWithNoStaff ?? [];

  const assignmentSpark = useMemo(() => trendRaw.slice(-12).map((p) => p.activeAssignments), [trendRaw]);
  const utilSpark = useMemo(() => {
    if (totalPeople === 0) return [];
    return trendRaw.slice(-12).map((p) => Math.round((p.activeAssignments / Math.max(totalPeople, 1)) * 100));
  }, [trendRaw, totalPeople]);

  const heroData: WorkforceWeekData[] = useMemo(() => {
    if (trendRaw.length === 0 || totalPeople === 0) return [];
    let filtered = trendRaw;
    if (rangeFrom) filtered = filtered.filter((p) => p.week >= rangeFrom);
    if (rangeTo) filtered = filtered.filter((p) => p.week <= rangeTo);
    return filtered.map((pt) => {
      const allocated = pt.activeAssignments;
      const idle = Math.max(0, totalPeople - allocated);
      return { week: pt.week, allocated, idle, utilizationPct: Math.round((allocated / Math.max(totalPeople, 1)) * 100) };
    });
  }, [trendRaw, totalPeople, rangeFrom, rangeTo]);

  const nav = useNavigate();

  const actionItems = useMemo<DashboardActionItem[]>(() => {
    const items: DashboardActionItem[] = [];

    projectsWithNoStaff.forEach((project) => {
      items.push({
        code: project.projectCode,
        entity: project.name,
        href: `/projects/${project.id}`,
        id: `unstaffed-${project.id}`,
        impact: 'No staff assigned — delivery at risk',
        index: items.length + 1,
        portfolioPercent: activeProjects > 0 ? Math.round((1 / activeProjects) * 100) : 0,
        severity: 'High',
        severityTone: 'danger',
        status: 'Open',
        suggestedAction: 'Create staffing request',
        type: 'Unstaffed Project',
      });
    });

    if (unassigned > 3) {
      items.push({
        code: '\u2014',
        entity: `${unassigned} people`,
        href: '/people',
        id: 'idle-workforce',
        impact: 'Available people not assigned to any project',
        index: items.length + 1,
        portfolioPercent: totalPeople > 0 ? Math.round((unassigned / totalPeople) * 100) : 0,
        severity: 'Low',
        severityTone: 'info',
        status: 'Info',
        suggestedAction: 'Review for assignment',
        type: 'Idle Workforce',
      });
    }

    return items;
  }, [activeProjects, projectsWithNoStaff, totalPeople, unassigned]);

  const actionColumns = useMemo<DataTableColumn<DashboardActionItem>[]>(() => [
    {
      key: 'index',
      render: (item) => <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{item.index}</span>,
      title: '#',
      width: 28,
    },
    {
      key: 'severity',
      render: (item) => <StatusBadge label={item.severity} size="small" tone={item.severityTone} variant="dot" />,
      title: 'Severity',
      width: 88,
    },
    {
      key: 'type',
      render: (item) => item.type,
      title: 'Category',
      width: 140,
    },
    {
      key: 'entity',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.entity}</span>,
      title: 'Entity',
    },
    {
      key: 'code',
      render: (item) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
          {item.code}
        </span>
      ),
      title: 'Code',
      width: 72,
    },
    {
      key: 'impact',
      render: (item) => <span style={{ fontSize: 11 }}>{item.impact}</span>,
      title: 'Impact',
      width: 220,
    },
    {
      key: 'portfolioPercent',
      align: 'right',
      render: (item) => (
        <span
          style={{
            color: item.severityTone === 'danger' ? 'var(--color-status-danger)' : 'var(--color-text-muted)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
          }}
        >
          {item.portfolioPercent}%
        </span>
      ),
      title: 'Portfolio %',
      width: 90,
    },
    {
      key: 'status',
      render: (item) => <StatusBadge label={item.status} size="small" tone={item.severityTone} />,
      title: 'Status',
      width: 80,
    },
    {
      key: 'suggestedAction',
      render: (item) => <span style={{ fontSize: 11 }}>{item.suggestedAction}</span>,
      title: 'Suggested Action',
      width: 170,
    },
    {
      key: 'go',
      render: (item) => (
        <Link
          onClick={(event) => event.stopPropagation()}
          style={{ color: 'var(--color-accent)', fontSize: 10 }}
          to={item.href}
        >
          View
        </Link>
      ),
      title: '',
      width: 40,
    },
  ], []);

  /* ── Role redirect ─────────────────────────────────────────────── */
  // This page is the Workload Overview landing at `/`. Admins (and directors,
  // who share the director dashboard) stay here. Every other role bounces to
  // their role-specific dashboard. Previously compared to `/admin` which never
  // matched what `getDashboardPath` returned, so admins always redirected away.
  if (principal && !principal.roles.includes('admin') && !principal.roles.includes('director')) {
    const home = getDashboardPath(principal.roles);
    return <Navigate replace to={home} />;
  }

  return (
    <PageContainer>
      {state.isLoading ? <LoadingState label="Loading dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          <OnboardingChecklist />
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/workload"
              style={{ borderLeft: `3px solid ${utilizationPct < 60 ? 'var(--color-status-warning)' : tc(utilizationPct, 90, 100)}` }}>
              <TipBalloon tip="Ratio of assigned people to total headcount. Target is 80%. Green = healthy, amber = watch, red = over-capacity." arrow="left" />
              <span className="kpi-strip__value">{utilizationPct}%</span>
              <span className="kpi-strip__label">Utilization</span>
              <div className="kpi-strip__progress">
                <div className="kpi-strip__progress-fill" style={{ width: `${Math.min(utilizationPct, 100)}%`, background: tc(utilizationPct, 90, 100) }} />
              </div>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>target 80%</span>
              {utilSpark.length > 3 && <div className="kpi-strip__sparkline"><Sparkline data={utilSpark} height={24} width={72} /></div>}
            </Link>

            <Link className="kpi-strip__item" to="/projects" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Total projects with status 'Active'. Click to view the full project registry." arrow="left" />
              <span className="kpi-strip__value">{activeProjects}</span>
              <span className="kpi-strip__label">Active Projects</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>across all teams</span>
            </Link>

            <Link className="kpi-strip__item" to="/assignments" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="People currently assigned to projects. The sparkline shows the 12-week trend." arrow="left" />
              <span className="kpi-strip__value">{activeAssignments}</span>
              <span className="kpi-strip__label">Active Assignments</span>
              {assignmentSpark.length > 3 && <div className="kpi-strip__sparkline"><Sparkline data={assignmentSpark} height={24} width={72} color="var(--color-chart-5, #8b5cf6)" /></div>}
            </Link>

            <Link className="kpi-strip__item" to="/people" style={{ borderLeft: `3px solid ${tc(unassigned, 3, 1, false)}` }}>
              <TipBalloon tip="People without any active assignment. Red if zero (no capacity), green if available." arrow="left" />
              <span className="kpi-strip__value">{unassigned}</span>
              <span className="kpi-strip__label">Available People</span>
              <span className="kpi-strip__context" style={{ color: tc(unassigned, 3, 1, false) }}>
                {unassigned === 0 ? 'No spare capacity' : 'ready to assign'}
              </span>
            </Link>

            <Link className="kpi-strip__item" to="/exceptions" style={{ borderLeft: `3px solid ${tc(issues, 2, 5)}` }}>
              <TipBalloon tip="Unstaffed projects requiring action. Zero means all clear." arrow="left" />
              <span className="kpi-strip__value">{issues}</span>
              <span className="kpi-strip__label">Open Issues</span>
              <span className="kpi-strip__context" style={{ color: issues === 0 ? 'var(--color-status-active)' : 'var(--color-status-danger)' }}>
                {issues === 0 ? '\u2713 All clear' : `${noStaffCount} unstaffed`}
              </span>
            </Link>
          </div>

          {/* ── HERO CHART ── */}
          <div className="dashboard-hero" style={{ position: 'relative' }}>
            <TipBalloon
              tip="Bars = headcount (purple = allocated, grey = idle). Amber line = utilization %. Dashed red line = 80% target. Hover any bar for details. Click to drill into that week."
              arrow="left"
            />
            <div className="dashboard-hero__header">
              <div>
                <div className="dashboard-hero__title">Workforce Overview</div>
                <div className="dashboard-hero__subtitle">
                  Headcount &amp; utilization — hover for detail, click to drill down
                </div>
              </div>
            </div>
            <div className="dashboard-hero__chart">
              {heroData.length > 0 ? (
                <WorkforceOverviewChart data={heroData} targetUtilization={80} />
              ) : (
                <EmptyState description="No trend data available for the selected range." title="No data" />
              )}
            </div>
          </div>

          {/* ── ACTION ITEMS ── enriched table ── */}
          {actionItems.length > 0 && (
            <div className="dash-action-section" style={{ position: 'relative' }}>
              <TipBalloon tip="All items that need attention. Sorted by severity. Impact column shows what fraction of your portfolio is affected. Click any row to act." arrow="left" />
              <div className="dash-action-section__header">
                <span className="dash-action-section__title">
                  Action Items ({actionItems.length})
                </span>
              </div>
              <DataTable
                caption="Workforce action items requiring attention"
                columns={actionColumns}
                getRowKey={(item) => item.id}
                items={actionItems}
                minWidth={780}
                onRowClick={(item) => nav(item.href)}
                variant="compact"
              />
              <div className="dash-action-section__summary">
                <span>{actionItems.length} total items</span>
                <span>
                  {activeProjects > 0 ? Math.round((noStaffCount / activeProjects) * 100) : 0}% affected
                </span>
              </div>
            </div>
          )}

          {/* ── System healthy ── */}
          {noStaffCount === 0 && unassigned <= 3 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-status-active)' }}>
              <span style={{ fontSize: 22 }}>{'\u2713'}</span>{' '}
              <span style={{ fontWeight: 600 }}>System healthy</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>No staffing gaps detected</span>
            </div>
          )}

          {/* ── DATA FRESHNESS ── */}
          <div className="data-freshness">
            Updated {formatDistanceToNow(lastFetch, { addSuffix: true })} {'\u00B7'}{' '}
            <button onClick={refetch} type="button">Refresh</button>
            {' '}
            <TipBalloon tip="Shows when data was last loaded. Click Refresh to pull the latest numbers from the server." arrow="top" />
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
