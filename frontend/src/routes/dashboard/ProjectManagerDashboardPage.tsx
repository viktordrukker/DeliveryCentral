import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { formatChangeType } from '@/lib/labels';
import { DateRangePreset } from '@/components/common/DateRangePreset';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TabBar } from '@/components/common/TabBar';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { formatDate } from '@/lib/format-date';
import { AnomalyPanel } from '@/components/projects/AnomalyPanel';
import { AnomalyStrip } from '@/components/dashboard/AnomalyStrip';
import { ProjectStaffingCoverageChart } from '@/components/charts/ProjectStaffingCoverageChart';
import { ProjectTimelineGantt } from '@/components/charts/ProjectTimelineGantt';
import { useProjectManagerDashboard } from '@/features/dashboard/useProjectManagerDashboard';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { fetchWorkloadMatrix } from '@/lib/api/workload';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const PM_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'variance', label: 'Time Variance' },
];

export function ProjectManagerDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal, isLoading: authLoading } = useAuth();
  const { setActions } = useTitleBarActions();
  const navigate = useNavigate();
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useProjectManagerDashboard(effectivePersonId);
  const [lastFetch, setLastFetch] = useState(new Date());

  const location = useLocation();
  const activeTab = PM_TABS.some((t) => `#${t.id}` === location.hash)
    ? location.hash.slice(1)
    : 'overview';

  function handleTabChange(tabId: string): void {
    navigate(`${location.pathname}${location.search}#${tabId}`, { replace: true });
  }

  function handlePersonChange(value: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('personId', value);
      return next;
    });
    state.setPersonId(value);
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
        <label className="field field--inline" style={{ fontSize: 12 }}>
          <input
            className="field__control"
            list="pm-people-list-tb"
            onChange={(event) => {
              const match = state.people.find((p) => p.displayName === event.target.value);
              if (match) handlePersonChange(match.id);
            }}
            placeholder="Project manager..."
            type="text"
            defaultValue={state.people.find((p) => p.id === state.personId)?.displayName ?? ''}
            key={state.personId}
          />
          <datalist id="pm-people-list-tb">
            {state.people.map((person) => (
              <option key={person.id} value={person.displayName} />
            ))}
          </datalist>
        </label>
        <Link className="button button--secondary button--sm" to="/projects">Projects</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.asOf, state.personId, state.people]);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  // Overallocated resources
  const [overallocated, setOverallocated] = useState<Array<{ id: string; displayName: string; totalPercent: number }>>([]);
  useEffect(() => {
    void fetchWorkloadMatrix()
      .then((matrix) => {
        const over = matrix.people
          .map((p) => ({ id: p.id, displayName: p.displayName, totalPercent: p.allocations.reduce((s, a) => s + a.allocationPercent, 0) }))
          .filter((p) => p.totalPercent > 100)
          .sort((a, b) => b.totalPercent - a.totalPercent);
        setOverallocated(over);
      })
      .catch(() => undefined);
  }, []);

  /* ── Derived data ────────────────────────────────────────────── */
  const d = state.data;
  const managedProjects = d?.managedProjects ?? [];
  const staffingGaps = d?.staffingSummary.projectsWithStaffingGapsCount ?? 0;
  const attentionProjects = d?.attentionProjects ?? [];
  const openRequests = d?.openRequests ?? [];
  const recentChanges = d?.recentlyChangedAssignments ?? [];

  const coverageData = managedProjects.map((p) => ({
    allocated: p.staffingCount,
    name: p.name,
    projectId: p.id,
    required: Math.max(p.staffingCount, 1),
  }));

  const ganttData = managedProjects.map((p) => ({
    endDate: p.plannedEndDate,
    name: p.name,
    startDate: p.plannedStartDate,
    status: p.status,
  }));

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="project-manager-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading project manager dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {d.person.displayName && <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{d.person.displayName}</h2>}

          {/* ── ANOMALY STRIP ── */}
          <AnomalyStrip
            alerts={[
              ...(staffingGaps > 0
                ? [{ id: 'staffing-gaps', severity: 'high' as const, message: `${staffingGaps} project(s) have staffing gaps`, href: '/staffing-requests' }]
                : []),
            ]}
          />

          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/projects" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Total projects you manage. Click to view the full project registry." arrow="left" />
              <span className="kpi-strip__value">{d.staffingSummary.managedProjectCount}</span>
              <span className="kpi-strip__label">Managed Projects</span>
            </Link>

            <Link className="kpi-strip__item" to="/assignments?status=active" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="People currently assigned to your projects with active status." arrow="left" />
              <span className="kpi-strip__value">{d.staffingSummary.activeAssignmentCount}</span>
              <span className="kpi-strip__label">Active Assignments</span>
            </Link>

            <Link className="kpi-strip__item" to="/staffing-requests"
              style={{ borderLeft: `3px solid ${staffingGaps > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Projects missing required staffing roles. Red means immediate action needed." arrow="left" />
              <span className="kpi-strip__value">{staffingGaps}</span>
              <span className="kpi-strip__label">Staffing Gaps</span>
              <span className="kpi-strip__context" style={{ color: staffingGaps > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>
                {staffingGaps === 0 ? 'All covered' : 'needs attention'}
              </span>
            </Link>

            <Link className="kpi-strip__item" to="/projects?closingInDays=30"
              style={{ borderLeft: `3px solid ${attentionProjects.length > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Active projects whose planned end date is within the next 30 days." arrow="left" />
              <span className="kpi-strip__value">{attentionProjects.length}</span>
              <span className="kpi-strip__label">Closing in 30d</span>
            </Link>
          </div>

          {/* ── TABS ── */}
          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={PM_TABS} />
          </div>

          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <>
              {coverageData.length > 0 && (
                <div className="dashboard-hero" style={{ position: 'relative' }}>
                  <TipBalloon tip="Staffing coverage across your projects. Bars show allocated vs required headcount." arrow="left" />
                  <div className="dashboard-hero__header">
                    <div>
                      <div className="dashboard-hero__title">Staffing Coverage</div>
                      <div className="dashboard-hero__subtitle">Allocated vs required headcount per project</div>
                    </div>
                  </div>
                  <div className="dashboard-hero__chart">
                    <ProjectStaffingCoverageChart data={coverageData} />
                  </div>
                </div>
              )}
              <SectionCard title="Managed Projects" collapsible chartExport={{
                headers: ['Project', 'Code', 'Status', 'Staff'],
                rows: managedProjects.map((p) => ({ Project: p.name, Code: p.projectCode, Status: p.status, Staff: String(p.staffingCount) })),
              }}>
                {managedProjects.length === 0 ? (
                  <EmptyState description="This project manager does not currently own any projects." title="No managed projects" action={{ label: 'Create project', href: '/projects/new' }} />
                ) : (
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th style={{ width: 80 }}>Code</th>
                          <th style={{ width: 70 }}>Status</th>
                          <th style={NUM}>Staff</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {managedProjects.map((p) => (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}/dashboard`)}>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{p.projectCode}</td>
                            <td><span style={{ fontSize: 11, fontWeight: 600 }}>{p.status}</span></td>
                            <td style={NUM}>{p.staffingCount}</td>
                            <td><Link to={`/projects/${p.id}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Timeline tab ── */}
          {activeTab === 'timeline' && (
            <>
              <div className="dashboard-hero" style={{ position: 'relative' }}>
                <TipBalloon tip="Gantt chart showing project timelines. Hover for dates." arrow="left" />
                <div className="dashboard-hero__header">
                  <div>
                    <div className="dashboard-hero__title">Project Timeline</div>
                    <div className="dashboard-hero__subtitle">Planned start and end dates for managed projects</div>
                  </div>
                </div>
                <div className="dashboard-hero__chart">
                  <ProjectTimelineGantt projects={ganttData} />
                </div>
              </div>

              <SectionCard title="Nearing Closure" collapsible>
                {attentionProjects.length === 0 ? (
                  <EmptyState description="No active projects are approaching their planned end date within 30 days." title="No projects nearing closure" />
                ) : (
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table">
                      <thead>
                        <tr><th>Code</th><th>Project</th><th style={{ width: 140 }}>Reason</th><th style={{ width: 200 }}>Detail</th><th style={{ width: 40 }}></th></tr>
                      </thead>
                      <tbody>
                        {attentionProjects.map((item) => (
                          <tr key={item.projectId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${item.projectId}/dashboard`)}>
                            <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{item.projectCode}</td>
                            <td style={{ fontWeight: 500 }}>{item.projectName}</td>
                            <td style={{ fontSize: 11 }}>{item.reason}</td>
                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.detail}</td>
                            <td><Link to={`/projects/${item.projectId}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Staffing tab ── */}
          {activeTab === 'staffing' && (
            <>
              {/* Action items: overallocated + staffing gaps */}
              {(overallocated.length > 0 || (d.projectsWithStaffingGaps ?? []).length > 0) && (
                <div className="dash-action-section" style={{ position: 'relative' }}>
                  <TipBalloon tip="Staffing issues needing attention — overallocated people and projects with gaps." arrow="left" />
                  <div className="dash-action-section__header">
                    <span className="dash-action-section__title">Staffing Issues ({overallocated.length + (d.projectsWithStaffingGaps ?? []).length})</span>
                  </div>
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table" style={{ minWidth: 600 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 28 }}>#</th>
                          <th style={{ width: 70 }}>Severity</th>
                          <th style={{ width: 100 }}>Category</th>
                          <th>Entity</th>
                          <th style={{ width: 160 }}>Detail</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {overallocated.map((person, i) => (
                          <tr key={`over-${person.id}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${person.id}`)}>
                            <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-danger)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>High</span>
                              </span>
                            </td>
                            <td>Overallocated</td>
                            <td style={{ fontWeight: 500 }}>{person.displayName}</td>
                            <td style={{ fontSize: 11 }}>{person.totalPercent}% total allocation</td>
                            <td><Link to={`/people/${person.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                        {(d.projectsWithStaffingGaps ?? []).map((item, i) => (
                          <tr key={`gap-${item.projectId}-${item.reason}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${item.projectId}/dashboard`)}>
                            <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{overallocated.length + i + 1}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-warning)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>Med</span>
                              </span>
                            </td>
                            <td>Staffing Gap</td>
                            <td style={{ fontWeight: 500 }}>{item.projectName}</td>
                            <td style={{ fontSize: 11 }}>{item.reason} · {item.detail}</td>
                            <td><Link to={`/assignments/new?projectId=${item.projectId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Fill</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Open Staffing Requests */}
              {openRequests.length > 0 && (
                <SectionCard title={`Open Staffing Requests (${openRequests.length})`} collapsible>
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th style={{ width: 80 }}>Priority</th>
                          <th style={{ width: 90 }}>Start</th>
                          <th style={NUM}>Headcount</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {openRequests.map((req) => (
                          <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staffing-requests/${req.id}`)}>
                            <td style={{ fontWeight: 500 }}>{req.role}</td>
                            <td><PriorityBadge priority={req.priority} /></td>
                            <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{req.startDate}</td>
                            <td style={NUM}>{req.headcountFulfilled}/{req.headcountRequired}</td>
                            <td><Link to={`/staffing-requests/${req.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Link style={{ fontSize: 11, color: 'var(--color-text-muted)' }} to="/staffing-requests">View all staffing requests</Link>
                  </div>
                </SectionCard>
              )}

              {/* Recently Changed Assignments */}
              <SectionCard title="Recently Changed Assignments" collapsible chartExport={{
                headers: ['Project', 'Person', 'Change', 'Date'],
                rows: recentChanges.map((i) => ({ Project: i.projectName, Person: i.personDisplayName, Change: i.changeType, Date: i.changedAt.slice(0, 10) })),
              }}>
                {recentChanges.length === 0 ? (
                  <EmptyState description="No recent assignment changes were found for managed projects." title="No recent changes" />
                ) : (
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Person</th>
                          <th style={{ width: 100 }}>Change</th>
                          <th style={{ width: 90 }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentChanges.map((item) => (
                          <tr key={item.assignmentId}>
                            <td style={{ fontWeight: 500 }}>{item.projectName}</td>
                            <td>{item.personDisplayName}</td>
                            <td style={{ fontSize: 11 }}>{formatChangeType(item.changeType)}</td>
                            <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.changedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Variance tab ── */}
          {activeTab === 'variance' && (
            <SectionCard title="Time Variance" collapsible>
              <AnomalyPanel
                items={(d.projectsWithTimeVariance ?? []).map((item) => ({
                  message: item.detail,
                  person: { displayName: d.person.displayName, id: d.person.id },
                  project: { id: item.projectId, name: item.projectName, projectCode: item.projectCode },
                  type: item.reason,
                }))}
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
