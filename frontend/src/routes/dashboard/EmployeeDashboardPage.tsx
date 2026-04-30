import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Table, type Column } from '@/components/ds';
import { DataFreshness } from '@/components/dashboard/DataFreshness';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { AssignmentList } from '@/components/dashboard/AssignmentList';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { WorkloadGauge } from '@/components/charts/WorkloadGauge';
import { WeeklyAllocationArea } from '@/components/charts/WeeklyAllocationArea';
import { PulseWidget } from '@/components/common/PulseWidget';
import { useEmployeeDashboard } from '@/features/dashboard/useEmployeeDashboard';
import { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { HR_DIRECTOR_ADMIN_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Button } from '@/components/ds';

function buildWeeks(count: number, asOf: string): string[] {
  const base = new Date(asOf);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (count - 1 - i) * 7);
    return d.toISOString().slice(0, 10);
  });
}

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

export function EmployeeDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useAuth();
  const { setActions } = useTitleBarActions();
  const isElevated = hasAnyRole(principal?.roles, HR_DIRECTOR_ADMIN_ROLES);
  const [lastFetch, setLastFetch] = useState(new Date());

  const ownPersonId = principal?.personId;
  const requestedPersonId = searchParams.get('personId');
  const effectivePersonId = isElevated ? (requestedPersonId ?? ownPersonId) : ownPersonId;

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

  // Title bar actions
  useEffect(() => {
    setActions(
      <>
        {isElevated ? (
          <label className="field" style={{ minWidth: 160 }}>
            <select className="field__control" onChange={(event) => handlePersonChange(event.target.value)} value={state.personId}>
              {state.people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </select>
          </label>
        ) : null}
        <Button as={Link} variant="secondary" size="sm" to="/my-time">My Time</Button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, isElevated, state.people, state.personId, state.asOf]);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  const d = state.data;
  const weeks = buildWeeks(12, state.asOf);
  const allAssignments = d ? toAllocationItems([...d.currentAssignments, ...d.futureAssignments]) : [];
  const allocPct = d?.currentWorkloadSummary.totalAllocationPercent ?? 0;
  const isOverallocated = d?.currentWorkloadSummary.isOverallocated ?? false;

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="employee-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading employee dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {!state.isLoading && !state.error && !d && isElevated ? (
        <SectionCard><EmptyState description="Use the Employee selector above to pick a person." title="Select a person to view their dashboard" /></SectionCard>
      ) : null}

      {d ? (
        <>
          {/* ── Person header ── */}
          {d.person.displayName && <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{d.person.displayName}</h2>}
          {d.person.currentLineManager ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Manager:{' '}
              <Link style={{ color: 'var(--color-accent)', fontWeight: 500 }} to={`/people/${d.person.currentLineManager.id}`}>
                {d.person.currentLineManager.displayName}
              </Link>
            </div>
          ) : null}

          {/* ── Pulse ── */}
          <SectionCard title="Weekly Pulse Check" collapsible>
            <PulseWidget />
          </SectionCard>

          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="#assignments" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Number of projects you are currently assigned to." arrow="left" />
              <span className="kpi-strip__value">{d.currentAssignments.length}</span>
              <span className="kpi-strip__label">Current Assignments</span>
            </Link>

            <Link className="kpi-strip__item" to="#future-assignments" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="Upcoming assignments that have not started yet." arrow="left" />
              <span className="kpi-strip__value">{d.futureAssignments.length}</span>
              <span className="kpi-strip__label">Future Assignments</span>
            </Link>

            <Link className="kpi-strip__item" to="#workload-gauge"
              style={{ borderLeft: `3px solid ${isOverallocated ? 'var(--color-status-danger)' : allocPct >= 80 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Your combined allocation across all active assignments. Over 100% means you are overbooked." arrow="left" />
              <span className="kpi-strip__value">{allocPct}%</span>
              <span className="kpi-strip__label">Allocation</span>
              <div className="kpi-strip__progress">
                <div className="kpi-strip__progress-fill" style={{ width: `${Math.min(allocPct, 100)}%`, background: isOverallocated ? 'var(--color-status-danger)' : allocPct >= 80 ? 'var(--color-status-warning)' : 'var(--color-status-active)' }} />
              </div>
              {isOverallocated && <span className="kpi-strip__context" style={{ color: 'var(--color-status-danger)' }}>Overallocated</span>}
            </Link>

            {d.pendingWorkflowItems.itemCount > 0 && (
              <Link className="kpi-strip__item" to="#pending-items" style={{ borderLeft: '3px solid var(--color-status-warning)' }}>
                <TipBalloon tip="Items pending your action — assignment approvals, etc." arrow="left" />
                <span className="kpi-strip__value">{d.pendingWorkflowItems.itemCount}</span>
                <span className="kpi-strip__label">Pending Items</span>
              </Link>
            )}
          </div>

          <SectionCard collapsible id="workload-gauge" title="Workload Gauge">
            <WorkloadGauge allocationPercent={allocPct} />
          </SectionCard>

          {/* ── Weekly Allocation ── */}
          {allAssignments.length > 0 && (
            <SectionCard collapsible title="Weekly Allocation (12 Weeks)">
              <WeeklyAllocationArea assignments={allAssignments} weeks={weeks} />
            </SectionCard>
          )}

          {/* ── Assignments tables ── */}
          <SectionCard id="assignments" title="Current Assignments" collapsible>
            <AssignmentList
              emptyDescription="This employee has no current assignments for the selected date."
              emptyTitle="No current assignments"
              items={d.currentAssignments}
            />
          </SectionCard>

          <SectionCard id="future-assignments" title="Future Assignments" collapsible>
            <AssignmentList
              emptyDescription="There are no future assignments queued yet."
              emptyTitle="No future assignments"
              items={d.futureAssignments}
            />
          </SectionCard>

          {/* ── Pending Workflow Items ── */}
          <SectionCard id="pending-items" title="Pending Workflow Items" collapsible>
            {d.pendingWorkflowItems.itemCount === 0 ? (
              <EmptyState description="No assignment requests are pending your approval or action." title="No pending items" />
            ) : (
              <Table
                variant="compact"
                columns={[
                  { key: 'title', title: 'Title', getValue: (item) => item.title, render: (item) => <span style={{ fontWeight: 500 }}>{item.title}</span> },
                  { key: 'detail', title: 'Detail', width: 200, getValue: (item) => item.detail ?? '\u2014', render: (item) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.detail ?? '\u2014'}</span> },
                ] as Column<typeof d.pendingWorkflowItems.items[number]>[]}
                rows={d.pendingWorkflowItems.items}
                getRowKey={(item) => item.id}
              />
            )}
          </SectionCard>

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
