import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DateRangePreset } from '@/components/common/DateRangePreset';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TabBar } from '@/components/common/TabBar';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { AnomalyStrip } from '@/components/dashboard/AnomalyStrip';
import { RecentActivityRail } from '@/components/dashboard/RecentActivityRail';
import { useProjectManagerDashboard } from '@/features/dashboard/useProjectManagerDashboard';
import { fetchWorkloadMatrix } from '@/lib/api/workload';

import { PmOverviewTab } from './pm-tabs/OverviewTab';
import { PmTimelineTab } from './pm-tabs/TimelineTab';
import { PmStaffingTab, type OverallocatedPerson } from './pm-tabs/StaffingTab';
import { PmVarianceTab } from './pm-tabs/VarianceTab';
import { Button } from '@/components/ds';

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
        <Button as={Link} variant="secondary" size="sm" to="/projects">Projects</Button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.asOf, state.personId, state.people]);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  const [overallocated, setOverallocated] = useState<OverallocatedPerson[]>([]);
  useEffect(() => {
    void fetchWorkloadMatrix()
      .then((matrix) => {
        const over = matrix.people
          .map((p) => ({
            id: p.id,
            displayName: p.displayName,
            totalPercent: p.allocations.reduce((s, a) => s + a.allocationPercent, 0),
          }))
          .filter((p) => p.totalPercent > 100)
          .sort((a, b) => b.totalPercent - a.totalPercent);
        setOverallocated(over);
      })
      .catch(() => undefined);
  }, []);

  const d = state.data;
  const managedProjects = d?.managedProjects ?? [];
  const staffingGaps = d?.staffingSummary.projectsWithStaffingGapsCount ?? 0;
  const attentionProjects = d?.attentionProjects ?? [];
  const openRequests = d?.openRequests ?? [];
  const recentChanges = d?.recentlyChangedAssignments ?? [];

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="project-manager-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading project manager dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {d.person.displayName && (
            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
              {d.person.displayName}
            </h2>
          )}

          <AnomalyStrip
            alerts={[
              ...(staffingGaps > 0
                ? [{ id: 'staffing-gaps', severity: 'high' as const, message: `${staffingGaps} project(s) have staffing gaps`, href: '/staffing-requests' }]
                : []),
            ]}
          />

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

            <Link
              className="kpi-strip__item"
              to="/staffing-requests"
              style={{ borderLeft: `3px solid ${staffingGaps > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}
            >
              <TipBalloon tip="Projects missing required staffing roles. Red means immediate action needed." arrow="left" />
              <span className="kpi-strip__value">{staffingGaps}</span>
              <span className="kpi-strip__label">Staffing Gaps</span>
              <span
                className="kpi-strip__context"
                style={{ color: staffingGaps > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}
              >
                {staffingGaps === 0 ? 'All covered' : 'needs attention'}
              </span>
            </Link>

            <Link
              className="kpi-strip__item"
              to="/projects?closingInDays=30"
              style={{ borderLeft: `3px solid ${attentionProjects.length > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}
            >
              <TipBalloon tip="Active projects whose planned end date is within the next 30 days." arrow="left" />
              <span className="kpi-strip__value">{attentionProjects.length}</span>
              <span className="kpi-strip__label">Closing in 30d</span>
            </Link>
          </div>

          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={PM_TABS} />
          </div>

          {activeTab === 'overview' && (
            <PmOverviewTab
              managedProjects={managedProjects}
              onRowClick={(id) => navigate(`/projects/${id}/dashboard`)}
            />
          )}

          {activeTab === 'timeline' && (
            <PmTimelineTab
              managedProjects={managedProjects}
              attentionProjects={attentionProjects}
              onRowClick={(id) => navigate(`/projects/${id}/dashboard`)}
            />
          )}

          {activeTab === 'staffing' && (
            <PmStaffingTab
              overallocated={overallocated}
              projectsWithStaffingGaps={d.projectsWithStaffingGaps ?? []}
              openRequests={openRequests}
              recentChanges={recentChanges}
              onPersonClick={(id) => navigate(`/people/${id}`)}
              onProjectClick={(id) => navigate(`/projects/${id}/dashboard`)}
              onRequestClick={(id) => navigate(`/staffing-requests/${id}`)}
            />
          )}

          {activeTab === 'variance' && (
            <PmVarianceTab
              projectsWithTimeVariance={d.projectsWithTimeVariance ?? []}
              person={d.person}
            />
          )}

          <RecentActivityRail role="pm" />

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
