import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DateRangePreset } from '@/components/common/DateRangePreset';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { Sparkline } from '@/components/charts/Sparkline';
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
  const evidenceMismatch = d?.projectsWithEvidenceButNoApprovedAssignmentCount ?? 0;
  const issues = noStaffCount + evidenceMismatch;
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

  /* ── Role redirect ─────────────────────────────────────────────── */
  if (principal) {
    const home = getDashboardPath(principal.roles);
    if (home !== '/admin') return <Navigate replace to={home} />;
  }

  return (
    <PageContainer>
      {state.isLoading ? <LoadingState label="Loading dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
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
              <TipBalloon tip="Unstaffed projects + evidence mismatches combined. Zero means all clear." arrow="left" />
              <span className="kpi-strip__value">{issues}</span>
              <span className="kpi-strip__label">Open Issues</span>
              <span className="kpi-strip__context" style={{ color: issues === 0 ? 'var(--color-status-active)' : 'var(--color-status-danger)' }}>
                {issues === 0 ? '\u2713 All clear' : `${noStaffCount} unstaffed \u00B7 ${evidenceMismatch} mismatched`}
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
          {(noStaffCount > 0 || evidenceMismatch > 0 || unassigned > 0) && (
            <div className="dash-action-section" style={{ position: 'relative' }}>
              <TipBalloon tip="All items that need attention. Sorted by severity. Impact column shows what fraction of your portfolio is affected. Click any row to act." arrow="left" />
              <div className="dash-action-section__header">
                <span className="dash-action-section__title">
                  Action Items ({noStaffCount + (d?.projectsWithEvidenceButNoApprovedAssignment ?? []).length + (unassigned > 3 ? 1 : 0)})
                </span>
              </div>
              <div style={{ overflow: 'auto' }}>
              <table className="dash-compact-table" style={{ minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>#</th>
                    <th style={{ width: 70 }}>Severity</th>
                    <th style={{ width: 120 }}>Category</th>
                    <th>Entity</th>
                    <th style={{ width: 72 }}>Code</th>
                    <th style={{ width: 180 }}>Impact</th>
                    <th style={{ textAlign: 'right', width: 80 }}>Portfolio %</th>
                    <th style={{ width: 50 }}>Status</th>
                    <th style={{ width: 140 }}>Suggested Action</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Unstaffed projects — High severity */}
                  {projectsWithNoStaff.map((p, i) => (
                    <tr key={`unstaffed-${p.id}`} data-href={`/projects/${p.id}`} onClick={() => nav(`/projects/${p.id}`)}>
                      <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-danger)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>High</span>
                        </span>
                      </td>
                      <td>Unstaffed Project</td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', fontSize: 11 }}>{p.projectCode}</td>
                      <td style={{ fontSize: 11 }}>No staff assigned — delivery at risk</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: noStaffCount / Math.max(activeProjects, 1) > 0.2 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>
                        {activeProjects > 0 ? Math.round((1 / activeProjects) * 100) : 0}%
                      </td>
                      <td><span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--color-status-danger)', color: '#fff' }}>Open</span></td>
                      <td style={{ fontSize: 11 }}>Create staffing request</td>
                      <td><Link to={`/projects/${p.id}`} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                    </tr>
                  ))}

                  {/* Evidence mismatch projects — Medium severity */}
                  {(d?.projectsWithEvidenceButNoApprovedAssignment ?? []).map((p, i) => (
                    <tr key={`evidence-${p.id}`} data-href={`/projects/${p.id}`} onClick={() => nav(`/projects/${p.id}`)}>
                      <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{noStaffCount + i + 1}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-warning)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>Med</span>
                        </span>
                      </td>
                      <td>Evidence Mismatch</td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', fontSize: 11 }}>{p.projectCode}</td>
                      <td style={{ fontSize: 11 }}>Work logged without approved assignment</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {activeProjects > 0 ? Math.round((1 / activeProjects) * 100) : 0}%
                      </td>
                      <td><span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--color-status-warning)', color: '#fff' }}>Open</span></td>
                      <td style={{ fontSize: 11 }}>Approve or create assignment</td>
                      <td><Link to={`/projects/${p.id}`} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                    </tr>
                  ))}

                  {/* Idle people — Low severity (only if significant) */}
                  {unassigned > 3 && (
                    <tr data-href="/people" onClick={() => nav('/people')}>
                      <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{noStaffCount + (d?.projectsWithEvidenceButNoApprovedAssignment ?? []).length + 1}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-info)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--color-status-info)', fontWeight: 600, fontSize: 11 }}>Low</span>
                        </span>
                      </td>
                      <td>Idle Workforce</td>
                      <td style={{ fontWeight: 500 }}>{unassigned} people</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{'\u2014'}</td>
                      <td style={{ fontSize: 11 }}>Available people not assigned to any project</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {totalPeople > 0 ? Math.round((unassigned / totalPeople) * 100) : 0}%
                      </td>
                      <td><span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--color-status-info)', color: '#fff' }}>Info</span></td>
                      <td style={{ fontSize: 11 }}>Review for assignment</td>
                      <td><Link to="/people" style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td></td>
                    <td colSpan={2} style={{ fontSize: 11 }}>
                      {noStaffCount + (d?.projectsWithEvidenceButNoApprovedAssignment ?? []).length + (unassigned > 3 ? 1 : 0)} total items
                    </td>
                    <td colSpan={3}></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                      {activeProjects > 0 ? Math.round(((noStaffCount + evidenceMismatch) / activeProjects) * 100) : 0}% affected
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          )}

          {/* ── System healthy ── */}
          {noStaffCount === 0 && evidenceMismatch === 0 && unassigned <= 3 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-status-active)' }}>
              <span style={{ fontSize: 22 }}>{'\u2713'}</span>{' '}
              <span style={{ fontWeight: 600 }}>System healthy</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>No staffing gaps or evidence mismatches</span>
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
