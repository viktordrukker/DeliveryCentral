import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { formatChangeType } from '@/lib/labels';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { TabBar } from '@/components/common/TabBar';
import { AnomalyPanel } from '@/components/projects/AnomalyPanel';
import { ProjectStaffingCoverageChart } from '@/components/charts/ProjectStaffingCoverageChart';
import { ProjectTimelineGantt } from '@/components/charts/ProjectTimelineGantt';
import { useProjectManagerDashboard } from '@/features/dashboard/useProjectManagerDashboard';
import { StaffingRequestStatusBadge } from '@/components/staffing/StaffingRequestStatusBadge';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { DashboardGrid } from '@/components/layout/DashboardGrid';

const PM_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'anomalies', label: 'Anomalies' },
];

export function ProjectManagerDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal, isLoading: authLoading } = useAuth();
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useProjectManagerDashboard(effectivePersonId);

  const location = useLocation();
  const navigate = useNavigate();
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

  // Derive chart data from managed projects
  const coverageData = (state.data?.managedProjects ?? []).map((p) => ({
    allocated: p.staffingCount,
    name: p.name,
    projectId: p.id,
    required: Math.max(p.staffingCount, 1),
  }));

  const ganttData = (state.data?.managedProjects ?? []).map((p) => ({
    endDate: p.plannedEndDate,
    name: p.name,
    startDate: p.plannedStartDate,
    status: p.status,
  }));

  return (
    <PageContainer testId="project-manager-dashboard-page">
      <PageHeader
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link className="button button--primary" to="/assignments/new">
              Quick assignment
            </Link>
            <Link className="button button--secondary" to="/staffing-requests/new">
              Staffing request
            </Link>
            <Link className="button button--secondary" to="/projects">
              Open projects
            </Link>
          </div>
        }
        eyebrow="Dashboard"
        title={state.data?.person.displayName ?? 'Project Manager Dashboard'}
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Project manager</span>
          <input
            className="field__control"
            list="pm-people-list"
            onChange={(event) => {
              const match = state.people.find((p) => p.displayName === event.target.value);
              if (match) handlePersonChange(match.id);
            }}
            placeholder="Search project managers..."
            type="text"
            defaultValue={state.people.find((p) => p.id === state.personId)?.displayName ?? ''}
            key={state.personId}
          />
          <datalist id="pm-people-list">
            {state.people.map((person) => (
              <option key={person.id} value={person.displayName} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span className="field__label">As of</span>
          <input
            className="field__control"
            onChange={(event) => state.setAsOf(`${event.target.value}:00.000Z`)}
            type="datetime-local"
            value={state.asOf.slice(0, 16)}
          />
        </label>
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading project manager dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <WorkloadCard
              href="/projects"
              label="Managed Projects"
              value={String(state.data.staffingSummary.managedProjectCount)}
            />
            <WorkloadCard
              href="/assignments?status=active"
              label="Active Assignments"
              value={String(state.data.staffingSummary.activeAssignmentCount)}
            />
            <WorkloadCard
              href="/staffing-requests"
              label="Staffing Gaps"
              value={String(state.data.staffingSummary.projectsWithStaffingGapsCount)}
            />
            <WorkloadCard
              href="/staffing-requests"
              label="Evidence Anomalies"
              value={String(state.data.staffingSummary.projectsWithEvidenceAnomaliesCount)}
            />
            <WorkloadCard
              href="/projects?closingInDays=30"
              label="Closing in 30 Days"
              supportingText={state.data.attentionProjects.length > 0 ? 'Review and prepare closure.' : undefined}
              value={String(state.data.attentionProjects.length)}
              variant={state.data.attentionProjects.length > 0 ? 'warning' : 'default'}
            />
          </div>

          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={PM_TABS} />
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              {coverageData.length > 0 ? (
                <SectionCard
                  chartExport={{
                    headers: ['Project', 'Allocated', 'Required'],
                    rows: coverageData.map((d) => ({ Project: d.name, Allocated: d.allocated, Required: d.required })),
                  }}
                  title="Staffing Coverage"
                >
                  <ProjectStaffingCoverageChart data={coverageData} />
                </SectionCard>
              ) : null}
              <SectionCard title="Projects">
                {state.data.managedProjects.length === 0 ? (
                  <EmptyState
                    description="This project manager does not currently own any projects."
                    title="No managed projects"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.managedProjects.map((project) => (
                      <div className="monitoring-list__item" key={project.id}>
                        <div className="monitoring-list__title">{project.name}</div>
                        <p className="monitoring-list__summary">
                          {project.projectCode} · {project.status} · {project.staffingCount} staffed
                        </p>
                        <div style={{ margin: '6px 0 4px', width: '100%' }}>
                          <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                            Evidence: {project.evidenceCount} entries
                          </div>
                          <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden', width: '100%' }}>
                            <div
                              style={{
                                background: project.evidenceCount > 0 ? '#22c55e' : '#ef4444',
                                height: '100%',
                                width: `${Math.min(100, project.evidenceCount > 0 ? 100 : 0)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <Link
                          className="button button--secondary"
                          style={{ marginTop: '6px' }}
                          to={`/projects/${project.id}/dashboard`}
                        >
                          Open dashboard
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <DashboardGrid>
              <SectionCard title="Project Timeline">
                <ProjectTimelineGantt projects={ganttData} />
              </SectionCard>
              <SectionCard title="Nearing Closure">
                {state.data.attentionProjects.length === 0 ? (
                  <EmptyState
                    description="No active projects are approaching their planned end date within 30 days."
                    title="No projects nearing closure"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.attentionProjects.map((item) => (
                      <div className="monitoring-list__item" key={item.projectId}>
                        <div className="monitoring-list__title">{item.projectCode} — {item.projectName}</div>
                        <p className="monitoring-list__summary">
                          {item.reason} · {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </DashboardGrid>
          )}

          {/* Staffing tab */}
          {activeTab === 'staffing' && (
            <div className="details-grid">
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

              <SectionCard title="Staffing Gaps">
                {state.data.projectsWithStaffingGaps.length === 0 ? (
                  <EmptyState
                    description="No staffing gaps were reported for managed projects."
                    title="No staffing gaps"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.projectsWithStaffingGaps.map((item) => (
                      <div className="monitoring-list__item" key={`${item.projectId}-${item.reason}`}>
                        <div className="monitoring-list__title">{item.projectName}</div>
                        <p className="monitoring-list__summary">
                          {item.reason} · {item.detail}
                        </p>
                        <Link
                          className="button button--secondary"
                          style={{ marginTop: '6px' }}
                          to={`/assignments/new?projectId=${item.projectId}`}
                        >
                          Request resource
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Recently Changed Assignments">
                {state.data.recentlyChangedAssignments.length === 0 ? (
                  <EmptyState
                    description="No recent assignment changes were found for managed projects."
                    title="No recent changes"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.recentlyChangedAssignments.map((item) => (
                      <div className="monitoring-list__item" key={item.assignmentId}>
                        <div className="monitoring-list__title">{item.projectName}</div>
                        <p className="monitoring-list__summary">
                          {item.personDisplayName} · {formatChangeType(item.changeType)} ·{' '}
                          {new Date(item.changedAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {(state.data.openRequests ?? []).length > 0 ? (
                <SectionCard title="Open Staffing Requests">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Priority</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Start</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Headcount</th>
                        <th style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {state.data!.openRequests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 500 }}>{req.role}</td>
                          <td style={{ padding: '6px 10px' }}><PriorityBadge priority={req.priority} /></td>
                          <td style={{ padding: '6px 10px' }}>{req.startDate}</td>
                          <td style={{ padding: '6px 10px' }}>{req.headcountFulfilled}/{req.headcountRequired}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <Link style={{ fontSize: '0.75rem', color: '#2563eb' }} to={`/staffing-requests/${req.id}`}>View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link style={{ fontSize: '0.75rem', color: '#6b7280' }} to="/staffing-requests">View all staffing requests →</Link>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          )}

          {/* Anomalies tab */}
          {activeTab === 'anomalies' && (
            <SectionCard title="Anomalies">
              <AnomalyPanel
                items={state.data.projectsWithEvidenceAnomalies.map((item) => ({
                  message: item.detail,
                  person: {
                    displayName: state.data!.person.displayName,
                    id: state.data!.person.id,
                  },
                  project: {
                    id: item.projectId,
                    name: item.projectName,
                    projectCode: item.projectCode,
                  },
                  type: item.reason,
                }))}
              />
            </SectionCard>
          )}
        </>
      ) : null}
    </PageContainer>
  );
}
