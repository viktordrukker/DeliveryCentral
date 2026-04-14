import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { AssignmentList } from '@/components/dashboard/AssignmentList';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { formatDate } from '@/lib/format-date';
import { WorkloadGauge } from '@/components/charts/WorkloadGauge';
import { WeeklyAllocationArea } from '@/components/charts/WeeklyAllocationArea';
import { EvidenceTimelineBar } from '@/components/charts/EvidenceTimelineBar';
import { PulseWidget } from '@/components/common/PulseWidget';
import { useEmployeeDashboard } from '@/features/dashboard/useEmployeeDashboard';
import { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { WorkEvidenceItem } from '@/lib/api/work-evidence';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
const ELEVATED_ROLES = ['hr_manager', 'director', 'admin'];

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

function buildEvidenceDayData(items: WorkEvidenceItem[], asOf: string): Array<{ date: string; hours: number }> {
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
  const { setActions } = useTitleBarActions();
  const isElevated = principal?.roles.some((r) => ELEVATED_ROLES.includes(r)) ?? false;
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
        <Link className="button button--secondary button--sm" to="/timesheets">Timesheets</Link>
        <Link className="button button--secondary button--sm" to="/work-evidence">Evidence</Link>
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
  const evidenceDayData = d ? buildEvidenceDayData(d.recentWorkEvidenceSummary.recentItems, state.asOf) : [];
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

            <Link className="kpi-strip__item" to="/work-evidence" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <TipBalloon tip="Total hours of work evidence logged recently." arrow="left" />
              <span className="kpi-strip__value">{d.recentWorkEvidenceSummary.totalEffortHours}h</span>
              <span className="kpi-strip__label">Recent Evidence</span>
            </Link>

            {d.pendingWorkflowItems.itemCount > 0 && (
              <Link className="kpi-strip__item" to="#pending-items" style={{ borderLeft: '3px solid var(--color-status-warning)' }}>
                <TipBalloon tip="Items pending your action — assignment approvals, etc." arrow="left" />
                <span className="kpi-strip__value">{d.pendingWorkflowItems.itemCount}</span>
                <span className="kpi-strip__label">Pending Items</span>
              </Link>
            )}
          </div>

          {/* ── HERO: Workload Gauge + Evidence ── */}
          <div className="dashboard-main-grid">
            <SectionCard collapsible id="workload-gauge" title="Workload Gauge">
              <WorkloadGauge allocationPercent={allocPct} />
            </SectionCard>
            <SectionCard collapsible title="Evidence Last 14 Days">
              <EvidenceTimelineBar data={evidenceDayData} />
            </SectionCard>
          </div>

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

          {/* ── Evidence table ── */}
          <SectionCard title="Recent Evidence" collapsible chartExport={{
            headers: ['Summary', 'Source', 'Hours', 'Date'],
            rows: d.recentWorkEvidenceSummary.recentItems.map((i) => ({ Summary: i.summary ?? i.sourceRecordKey, Source: i.sourceType, Hours: String(i.effortHours), Date: i.recordedAt.slice(0, 10) })),
          }}>
            {effectivePersonId ? (
              <div style={{ marginBottom: 8 }}>
                <Link className="button button--secondary button--sm" to={`/work-evidence?personId=${effectivePersonId}`}>View all evidence</Link>
              </div>
            ) : null}
            {d.recentWorkEvidenceSummary.recentItems.length === 0 ? (
              <EmptyState description="No recent work evidence exists." title="No evidence" />
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr><th>Summary</th><th style={{ width: 80 }}>Source</th><th style={NUM}>Hours</th><th style={{ width: 90 }}>Date</th></tr>
                  </thead>
                  <tbody>
                    {d.recentWorkEvidenceSummary.recentItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.summary ?? item.sourceRecordKey}</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.sourceType}</td>
                        <td style={NUM}>{item.effortHours}h</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.recordedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ── Pending Workflow Items ── */}
          <SectionCard id="pending-items" title="Pending Workflow Items" collapsible>
            {d.pendingWorkflowItems.itemCount === 0 ? (
              <EmptyState description="No assignment requests are pending your approval or action." title="No pending items" />
            ) : (
              <table className="dash-compact-table">
                <thead>
                  <tr><th>Title</th><th style={{ width: 200 }}>Detail</th></tr>
                </thead>
                <tbody>
                  {d.pendingWorkflowItems.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.title}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.detail ?? '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

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
