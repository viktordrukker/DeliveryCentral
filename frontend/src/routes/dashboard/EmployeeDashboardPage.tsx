import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { AssignmentList } from '@/components/dashboard/AssignmentList';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { WorkloadGauge } from '@/components/charts/WorkloadGauge';
import { WeeklyAllocationArea } from '@/components/charts/WeeklyAllocationArea';
import { EvidenceTimelineBar } from '@/components/charts/EvidenceTimelineBar';
import { PulseWidget } from '@/components/common/PulseWidget';
import { useEmployeeDashboard } from '@/features/dashboard/useEmployeeDashboard';
import { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { WorkEvidenceItem } from '@/lib/api/work-evidence';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { DraggableKpiGrid } from '@/components/dashboard/DraggableKpiGrid';

const ELEVATED_ROLES = ['hr_manager', 'director', 'admin'];

/** Build an array of ISO date strings for the last N weeks */
function buildWeeks(count: number, asOf: string): string[] {
  const base = new Date(asOf);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (count - 1 - i) * 7);
    return d.toISOString().slice(0, 10);
  });
}

/** Build assignment-like objects for WeeklyAllocationArea from AssignmentDirectoryItem */
function toAllocationItems(
  assignments: AssignmentDirectoryItem[],
): Array<{ allocationPercent: number; projectName: string; validFrom: string; validTo: string | null }> {
  return assignments.map((a) => ({
    allocationPercent: a.allocationPercent,
    projectName: a.project.displayName,
    validFrom: a.startDate,
    validTo: a.endDate ?? null,
  }));
}

/** Build day-by-day evidence data for the last 14 days */
function buildEvidenceDayData(
  items: WorkEvidenceItem[],
  asOf: string,
): Array<{ date: string; hours: number }> {
  const base = new Date(asOf);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const map = new Map<string, number>();
  for (const item of items) {
    const day = item.activityDate?.slice(0, 10) ?? item.recordedAt.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + item.effortHours);
  }
  return days.map((date) => ({ date, hours: map.get(date) ?? 0 }));
}

export function EmployeeDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useAuth();
  const isElevated = principal?.roles.some((r) => ELEVATED_ROLES.includes(r)) ?? false;

  // Employees can only see their own dashboard; elevated roles can switch person
  const ownPersonId = principal?.personId;
  const requestedPersonId = searchParams.get('personId');
  const effectivePersonId = isElevated
    ? (requestedPersonId ?? ownPersonId)
    : ownPersonId;

  const state = useEmployeeDashboard(effectivePersonId);

  function handlePersonChange(value: string): void {
    if (!isElevated) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('personId', value);
      return next;
    });
    state.setPersonId(value);
  }

  const weeks = buildWeeks(12, state.asOf);
  const allAssignments = state.data
    ? toAllocationItems([
        ...state.data.currentAssignments,
        ...state.data.futureAssignments,
      ])
    : [];
  const evidenceDayData = state.data
    ? buildEvidenceDayData(state.data.recentWorkEvidenceSummary.recentItems, state.asOf)
    : [];

  return (
    <PageContainer testId="employee-dashboard-page">
      <PageHeader
        actions={
          <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {state.data?.person.currentLineManager ? (
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                Manager:{' '}
                <Link
                  style={{ color: '#4f46e5', fontWeight: 500 }}
                  to={`/people/${state.data.person.currentLineManager.id}`}
                >
                  {state.data.person.currentLineManager.displayName}
                </Link>
              </span>
            ) : null}
            <Link className="button button--secondary" to="/people">
              Open employee directory
            </Link>
          </div>
        }
        eyebrow="Dashboard"
        title={state.data?.person.displayName ?? 'Employee Dashboard'}
      />

      <FilterBar>
        {isElevated ? (
          <label className="field">
            <span className="field__label">Employee</span>
            <select
              className="field__control"
              onChange={(event) => handlePersonChange(event.target.value)}
              value={state.personId}
            >
              {state.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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

      {!state.isLoading && !state.error && !state.data && isElevated ? (
        <SectionCard>
          <EmptyState
            description="Use the Employee selector above to pick a person."
            title="Select a person to view their dashboard"
          />
        </SectionCard>
      ) : null}

      {state.isLoading ? <LoadingState label="Loading employee dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <SectionCard title="Weekly Pulse Check">
            <PulseWidget />
          </SectionCard>

          <DraggableKpiGrid storageKey={`${ownPersonId ?? 'employee'}:employee`}>
            <WorkloadCard
              href="#assignments"
              label="Current Assignments"
              value={String(state.data.currentAssignments.length)}
            />
            <WorkloadCard
              href="#future-assignments"
              label="Future Assignments"
              value={String(state.data.futureAssignments.length)}
            />
            <WorkloadCard
              href="#workload-gauge"
              label="Allocation"
              supportingText={
                state.data.currentWorkloadSummary.isOverallocated
                  ? 'Overallocated — exceeds 100%.'
                  : 'Current allocation across active assignments.'
              }
              value={`${state.data.currentWorkloadSummary.totalAllocationPercent}%`}
              variant={state.data.currentWorkloadSummary.isOverallocated ? 'danger' : 'default'}
            />
            <WorkloadCard
              href="/work-evidence"
              label="Recent Evidence Hours"
              value={`${state.data.recentWorkEvidenceSummary.totalEffortHours}h`}
            />
          </DraggableKpiGrid>

          <DashboardGrid>
            <SectionCard collapsible id="workload-gauge" title="Workload Gauge">
              <WorkloadGauge
                allocationPercent={state.data.currentWorkloadSummary.totalAllocationPercent}
              />
            </SectionCard>

            <SectionCard collapsible title="Evidence Last 14 Days">
              <EvidenceTimelineBar data={evidenceDayData} />
            </SectionCard>
          </DashboardGrid>

          {allAssignments.length > 0 ? (
            <SectionCard collapsible title="Weekly Allocation (12 Weeks)">
              <WeeklyAllocationArea assignments={allAssignments} weeks={weeks} />
            </SectionCard>
          ) : null}

          <div className="details-grid">
            <SectionCard id="assignments" title="Assignments">
              <AssignmentList
                emptyDescription="This employee has no current assignments for the selected date."
                emptyTitle="No current assignments"
                items={state.data.currentAssignments}
              />
            </SectionCard>

            <SectionCard id="future-assignments" title="Future Assignments">
              <AssignmentList
                emptyDescription="There are no future assignments queued yet."
                emptyTitle="No future assignments"
                items={state.data.futureAssignments}
              />
            </SectionCard>

            <SectionCard title="Workload">
              <dl className="details-list">
                <div>
                  <dt>Active assignment count</dt>
                  <dd>{state.data.currentWorkloadSummary.activeAssignmentCount}</dd>
                </div>
                <div>
                  <dt>Future assignment count</dt>
                  <dd>{state.data.currentWorkloadSummary.futureAssignmentCount}</dd>
                </div>
                <div>
                  <dt>Pending self workflow items</dt>
                  <dd>{state.data.currentWorkloadSummary.pendingSelfWorkflowItemCount}</dd>
                </div>
                <div>
                  <dt>Overallocated</dt>
                  <dd>{state.data.currentWorkloadSummary.isOverallocated ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Evidence">
              {effectivePersonId ? (
                <div className="section-card__actions-row">
                  <Link
                    className="button button--secondary"
                    to={`/work-evidence?personId=${effectivePersonId}`}
                  >
                    View all evidence
                  </Link>
                </div>
              ) : null}
              {state.data.recentWorkEvidenceSummary.recentItems.length === 0 ? (
                <EmptyState
                  description="No recent work evidence exists for the selected employee."
                  title="No evidence"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.recentWorkEvidenceSummary.recentItems.map((item) => (
                    <div className="monitoring-list__item" key={item.id}>
                      <div className="monitoring-list__title">
                        {item.summary ?? item.sourceRecordKey}
                      </div>
                      <p className="monitoring-list__summary">
                        {item.sourceType} · {item.effortHours}h ·{' '}
                        {new Date(item.recordedAt).toLocaleDateString('en-US')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Pending Workflow Items">
              {state.data.pendingWorkflowItems.itemCount === 0 ? (
                <EmptyState
                  description="No assignment requests are pending your approval or action."
                  title="No pending items"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.pendingWorkflowItems.items.map((item) => (
                    <div className="monitoring-list__item" key={item.id}>
                      <div className="monitoring-list__title">{item.title}</div>
                      {item.detail ? (
                        <p className="monitoring-list__summary">{item.detail}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
