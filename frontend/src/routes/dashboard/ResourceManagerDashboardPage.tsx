import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { TeamCapacityHeatmap } from '@/components/charts/TeamCapacityHeatmap';
import { ResourcePoolUtilizationDonut } from '@/components/charts/ResourcePoolUtilizationDonut';
import { DemandPipelineChart } from '@/components/charts/DemandPipelineChart';
import { useResourceManagerDashboard } from '@/features/dashboard/useResourceManagerDashboard';
import { createAssignment } from '@/lib/api/assignments';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';
import { ResourcePersonAllocationIndicator } from '@/lib/api/dashboard-resource-manager';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { DashboardGrid } from '@/components/layout/DashboardGrid';

interface QuickAssignForm {
  allocationPercent: string;
  error: string | null;
  isSubmitting: boolean;
  personId: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
  success: string | null;
}

/** Build 8 week labels starting from asOf */
function buildWeekLabels(asOf: string): string[] {
  const base = new Date(asOf);
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

/** Compute allocation per week for a person from pipeline */
function allocationByWeek(
  personId: string,
  indicators: ResourcePersonAllocationIndicator[],
  weeks: string[],
): number[] {
  const indicator = indicators.find((p) => p.personId === personId);
  if (!indicator) return weeks.map(() => 0);
  return weeks.map(() => indicator.totalAllocationPercent);
}

export function ResourceManagerDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal, isLoading: authLoading } = useAuth();
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useResourceManagerDashboard(effectivePersonId);
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [quickForm, setQuickForm] = useState<QuickAssignForm>({
    allocationPercent: '100',
    error: null,
    isSubmitting: false,
    personId: '',
    projectId: '',
    staffingRole: '',
    startDate: '',
    success: null,
  });

  useEffect(() => {
    void fetchProjectDirectory({ status: 'ACTIVE' }).then((res) => setProjects(res.items));
  }, []);

  function handlePersonChange(value: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('personId', value);
      return next;
    });
    state.setPersonId(value);
  }

  const managedPeople = [
    ...(state.data?.allocationIndicators ?? []).map((p) => ({ id: p.personId, displayName: p.displayName })),
    ...(state.data?.peopleWithoutAssignments ?? []).map((p) => ({ id: p.personId, displayName: p.displayName })),
  ].filter((person, idx, arr) => arr.findIndex((p) => p.id === person.id) === idx);

  async function handleQuickAssign(e: FormEvent): Promise<void> {
    e.preventDefault();
    setQuickForm((prev) => ({ ...prev, error: null, isSubmitting: true, success: null }));
    try {
      await createAssignment({
        actorId: principal?.personId ?? '',
        allocationPercent: Number(quickForm.allocationPercent),
        personId: quickForm.personId,
        projectId: quickForm.projectId,
        staffingRole: quickForm.staffingRole,
        startDate: `${quickForm.startDate}T00:00:00.000Z`,
      });
      setQuickForm((prev) => ({
        ...prev,
        allocationPercent: '100',
        isSubmitting: false,
        personId: '',
        projectId: '',
        staffingRole: '',
        startDate: '',
        success: 'Assignment request created.',
      }));
    } catch (err) {
      setQuickForm((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to create assignment.',
        isSubmitting: false,
      }));
    }
  }

  // Build heatmap data
  const weeks = buildWeekLabels(state.asOf);
  const heatmapPeople = (state.data?.allocationIndicators ?? []).map((p) => ({
    allocationByWeek: allocationByWeek(p.personId, state.data?.allocationIndicators ?? [], weeks),
    name: p.displayName,
    personId: p.personId,
  }));

  // Utilization donut
  const totalPeople = (state.data?.summary.totalManagedPeopleCount ?? 0);
  const idlePeople = (state.data?.summary.peopleWithoutAssignmentsCount ?? 0);
  const allocatedPeople = Math.max(0, totalPeople - idlePeople);

  // Demand pipeline from future assignments grouped by week
  const pipelineData: Array<Record<string, number | string> & { week: string }> = weeks.slice(0, 4).map((week) => {
    const weekDate = new Date(week);
    const nextWeek = new Date(weekDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const row: Record<string, number | string> & { week: string } = { week };
    for (const item of (state.data?.futureAssignmentPipeline ?? [])) {
      const startDate = new Date(item.startDate);
      if (startDate >= weekDate && startDate < nextWeek) {
        const role = item.projectName;
        row[role] = ((row[role] as number | undefined) ?? 0) + 1;
      }
    }
    return row;
  });

  return (
    <PageContainer testId="resource-manager-dashboard-page">
      <PageHeader
        actions={
          <>
            <button
              className="button"
              onClick={() => { setShowModal(true); setQuickForm((p) => ({ ...p, error: null, success: null })); }}
              type="button"
            >
              Quick assignment
            </button>
            <Link className="button button--secondary" to="/resource-pools">
              Resource pools
            </Link>
            <Link className="button button--secondary" to="/teams">
              Open teams
            </Link>
          </>
        }
        eyebrow="Dashboard"
        title={state.data?.person.displayName ?? 'Resource Manager Dashboard'}
      />

      {showModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Quick Assignment</h2>
              <button className="button button--secondary" onClick={() => setShowModal(false)} type="button">✕ Close</button>
            </div>
            {quickForm.error ? <ErrorState description={quickForm.error} /> : null}
            {quickForm.success ? <div className="success-banner" style={{ marginBottom: '12px' }}>{quickForm.success}</div> : null}
            <form onSubmit={(e) => { void handleQuickAssign(e); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="field">
                <span className="field__label">Person</span>
                {managedPeople.length > 0 ? (
                  <select
                    className="field__control"
                    onChange={(e) => setQuickForm((p) => ({ ...p, personId: e.target.value }))}
                    required
                    value={quickForm.personId}
                  >
                    <option value="">Select person…</option>
                    {managedPeople.map((p) => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="field__control"
                    onChange={(e) => setQuickForm((p) => ({ ...p, personId: e.target.value }))}
                    placeholder="Person UUID"
                    required
                    type="text"
                    value={quickForm.personId}
                  />
                )}
              </label>
              <label className="field">
                <span className="field__label">Project</span>
                {projects.length > 0 ? (
                  <select
                    className="field__control"
                    onChange={(e) => setQuickForm((p) => ({ ...p, projectId: e.target.value }))}
                    required
                    value={quickForm.projectId}
                  >
                    <option value="">Select project…</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>{proj.name} ({proj.projectCode})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="field__control"
                    onChange={(e) => setQuickForm((p) => ({ ...p, projectId: e.target.value }))}
                    placeholder="Project UUID"
                    required
                    type="text"
                    value={quickForm.projectId}
                  />
                )}
              </label>
              <label className="field">
                <span className="field__label">Staffing Role</span>
                <input
                  className="field__control"
                  onChange={(e) => setQuickForm((p) => ({ ...p, staffingRole: e.target.value }))}
                  placeholder="e.g. Lead Engineer"
                  required
                  type="text"
                  value={quickForm.staffingRole}
                />
              </label>
              <label className="field">
                <span className="field__label">Allocation %</span>
                <input
                  className="field__control"
                  max={100}
                  min={1}
                  onChange={(e) => setQuickForm((p) => ({ ...p, allocationPercent: e.target.value }))}
                  required
                  type="number"
                  value={quickForm.allocationPercent}
                />
              </label>
              <label className="field">
                <span className="field__label">Start Date</span>
                <input
                  className="field__control"
                  onChange={(e) => setQuickForm((p) => ({ ...p, startDate: e.target.value }))}
                  required
                  type="date"
                  value={quickForm.startDate}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button className="button" disabled={quickForm.isSubmitting} type="submit">
                  {quickForm.isSubmitting ? 'Submitting…' : 'Create assignment'}
                </button>
                <button className="button button--secondary" onClick={() => setShowModal(false)} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <FilterBar>
        <label className="field">
          <span className="field__label">Resource manager</span>
          <input
            className="field__control"
            list="rm-people-list"
            onChange={(event) => {
              const match = state.people.find((p) => p.displayName === event.target.value);
              if (match) handlePersonChange(match.id);
            }}
            placeholder="Search resource managers..."
            type="text"
            defaultValue={state.people.find((p) => p.id === state.personId)?.displayName ?? ''}
            key={state.personId}
          />
          <datalist id="rm-people-list">
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

      {state.isLoading ? <LoadingState label="Loading resource manager dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <WorkloadCard href="/teams" label="Managed Teams" value={String(state.data.summary.managedTeamCount)} />
            <WorkloadCard href="/people" label="Managed People" value={String(state.data.summary.totalManagedPeopleCount)} />
            <WorkloadCard href="/people?filter=idle" label="Idle Resources" value={String(state.data.summary.peopleWithoutAssignmentsCount)} />
            <WorkloadCard href="/assignments" label="Future Pipeline" value={String(state.data.summary.futureAssignmentPipelineCount)} />
            <WorkloadCard
              alertSeverity="danger"
              alertThreshold={0}
              href="/workload"
              label="Overallocated Resources"
              value={String(state.data.allocationIndicators.filter((i) => i.indicator === 'OVERALLOCATED').length)}
            />
          </div>

          <DashboardGrid>
            <SectionCard title="Resource Pool Utilization">
              <ResourcePoolUtilizationDonut allocated={allocatedPeople} idle={idlePeople} />
            </SectionCard>

            {pipelineData.some((row) => Object.keys(row).length > 1) ? (
              <SectionCard title="Demand Pipeline (Next 4 Weeks)">
                <DemandPipelineChart data={pipelineData} />
              </SectionCard>
            ) : null}
          </DashboardGrid>

          <SectionCard title="Team Capacity Heatmap (8 Weeks)">
            {heatmapPeople.length > 0 ? (
              <TeamCapacityHeatmap people={heatmapPeople} weeks={weeks} />
            ) : (
              <EmptyState
                description="No active assignments found for the selected filters. Try adjusting the Resource Pool or Org Unit filter."
                title="No workload data"
              />
            )}
          </SectionCard>

          <div className="details-grid">
            <SectionCard title="Team Capacity (by Org Unit)">
              {state.data.teamCapacitySummary.length === 0 ? (
                <EmptyState description="This manager does not currently own any teams." title="No team capacity data" />
              ) : (
                <div className="monitoring-list">
                  {state.data.teamCapacitySummary.map((team) => (
                    <div className="monitoring-list__item" key={team.teamId}>
                      <div className="monitoring-list__title">{team.teamName}</div>
                      <p className="monitoring-list__summary">
                        {team.memberCount} org unit members · {team.activeAssignmentCount} active assignments ·{' '}
                        {team.activeProjectCount} active projects
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Idle Resources">
              {state.data.peopleWithoutAssignments.length === 0 ? (
                <EmptyState description="All managed people currently have assignment coverage." title="No idle resources" />
              ) : (
                <div className="monitoring-list">
                  {state.data.peopleWithoutAssignments.map((person) => (
                    <div className="monitoring-list__item" key={person.personId}>
                      <div className="monitoring-list__title">{person.displayName}</div>
                      <p className="monitoring-list__summary">
                        {person.teamName} · {person.indicator} · {person.totalAllocationPercent}% allocated
                      </p>
                      <button
                        className="button button--secondary"
                        onClick={() => {
                          setQuickForm((p) => ({ ...p, personId: person.personId }));
                          setShowModal(true);
                        }}
                        style={{ marginTop: '6px' }}
                        type="button"
                      >
                        Quick assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Pipeline">
              {state.data.futureAssignmentPipeline.length === 0 ? (
                <EmptyState description="No future assignments are queued for managed resources." title="No future pipeline" />
              ) : (
                <div className="monitoring-list">
                  {state.data.futureAssignmentPipeline.map((item) => (
                    <div className="monitoring-list__item" key={item.assignmentId}>
                      <div className="monitoring-list__title">{item.projectName}</div>
                      <p className="monitoring-list__summary">
                        {item.personDisplayName} · {item.approvalState} · starts{' '}
                        {new Date(item.startDate).toLocaleDateString('en-US')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Overallocated Resources">
              {state.data.allocationIndicators.filter((i) => i.indicator === 'OVERALLOCATED').length === 0 ? (
                <EmptyState description="No team members are currently overallocated." title="No overallocations" />
              ) : (
                <div className="monitoring-list">
                  {state.data.allocationIndicators
                    .filter((i) => i.indicator === 'OVERALLOCATED')
                    .map((item) => (
                      <div className="monitoring-list__item" key={item.personId} style={{ borderLeft: '3px solid #ef4444' }}>
                        <div className="monitoring-list__title" style={{ color: '#dc2626' }}>{item.displayName}</div>
                        <p className="monitoring-list__summary">
                          {item.teamName} · {item.totalAllocationPercent}% allocated (over 100%)
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="All Allocation Indicators">
              {state.data.allocationIndicators.length === 0 ? (
                <EmptyState description="No allocation indicators were calculated." title="No allocation indicators" />
              ) : (
                <div className="monitoring-list">
                  {state.data.allocationIndicators.map((item) => (
                    <div className="monitoring-list__item" key={item.personId}>
                      <div className="monitoring-list__title">{item.displayName}</div>
                      <p className="monitoring-list__summary">
                        {item.teamName} · {item.indicator} · {item.totalAllocationPercent}% allocated
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      ) : null}

      {(state.data?.incomingRequests ?? []).length > 0 ? (
        <SectionCard title="Incoming Request Queue">
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
              {state.data!.incomingRequests.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 500 }}>{req.role}</td>
                  <td style={{ padding: '6px 10px' }}><PriorityBadge priority={req.priority} /></td>
                  <td style={{ padding: '6px 10px' }}>{req.startDate}</td>
                  <td style={{ padding: '6px 10px' }}>{req.headcountFulfilled}/{req.headcountRequired}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <Link style={{ fontSize: '0.75rem', color: '#2563eb' }} to={`/staffing-requests/${req.id}`}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
