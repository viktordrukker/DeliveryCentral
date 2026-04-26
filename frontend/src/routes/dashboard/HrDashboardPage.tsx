import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TabBar } from '@/components/common/TabBar';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { RecentActivityRail } from '@/components/dashboard/RecentActivityRail';
import { useHrManagerDashboard } from '@/features/dashboard/useHrManagerDashboard';
import { fetchMoodHeatmap, MoodHeatmapResponse } from '@/lib/api/pulse';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { fetchCases } from '@/lib/api/cases';

import { HrHeadcountTab } from './hr-tabs/HeadcountTab';
import { HrOrganizationTab } from './hr-tabs/OrganizationTab';
import { HrDataQualityTab } from './hr-tabs/DataQualityTab';
import { HrRolesTab } from './hr-tabs/RolesTab';
import { HrLifecycleTab } from './hr-tabs/LifecycleTab';
import { HrWellbeingTab } from './hr-tabs/WellbeingTab';

const HR_TABS = [
  { id: 'headcount', label: 'Headcount' },
  { id: 'organization', label: 'Organization' },
  { id: 'data-quality', label: 'Data Quality' },
  { id: 'roles', label: 'Roles' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'wellbeing', label: 'Wellbeing' },
];

export function HrDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal, isLoading: authLoading } = useAuth();
  const { setActions } = useTitleBarActions();
  const navigate = useNavigate();
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useHrManagerDashboard(effectivePersonId);
  const [openCaseSubjects, setOpenCaseSubjects] = useState<string[]>([]);
  const [lastFetch, setLastFetch] = useState(new Date());

  const location = useLocation();
  const activeTab = HR_TABS.some((t) => `#${t.id}` === location.hash)
    ? location.hash.slice(1)
    : 'headcount';

  function handleTabChange(tabId: string): void {
    navigate(`${location.pathname}${location.search}#${tabId}`, { replace: true });
  }

  useEffect(() => {
    void fetchCases({})
      .then((r) => {
        const subjects = r.items
          .filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
          .map((c) => c.subjectPersonId);
        setOpenCaseSubjects(subjects);
      })
      .catch(() => undefined);
  }, []);

  const [heatmapManagerId, setHeatmapManagerId] = useState<string>('');
  const [heatmapPoolId, setHeatmapPoolId] = useState<string>('');
  const [heatmapData, setHeatmapData] = useState<MoodHeatmapResponse | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [managerOptions, setManagerOptions] = useState<Array<{ id: string; displayName: string }>>([]);
  const [poolOptions, setPoolOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    void fetchPersonDirectory({ page: 1, pageSize: 100 })
      .then((r) => setManagerOptions(r.items.map((p) => ({ id: p.id, displayName: p.displayName }))))
      .catch(() => undefined);
    void fetchResourcePools()
      .then((r) => setPoolOptions(r.items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setHeatmapLoading(true);
    void fetchMoodHeatmap({
      managerId: heatmapManagerId || undefined,
      poolId: heatmapPoolId || undefined,
    })
      .then((data) => { if (active) { setHeatmapData(data); setHeatmapLoading(false); } })
      .catch(() => setHeatmapData(null))
      .finally(() => setHeatmapLoading(false));
    return () => { active = false; };
  }, [heatmapManagerId, heatmapPoolId]);

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
        <label className="field field--inline" style={{ fontSize: 12 }}>
          <input
            className="field__control"
            list="hr-people-list-tb"
            onChange={(event) => {
              const match = state.people.find((p) => p.displayName === event.target.value);
              if (match) handlePersonChange(match.id);
            }}
            placeholder="Search HR managers..."
            type="text"
            defaultValue={state.people.find((p) => p.id === state.personId)?.displayName ?? ''}
            key={state.personId}
          />
          <datalist id="hr-people-list-tb">
            {state.people.map((person) => (
              <option key={person.id} value={person.displayName} />
            ))}
          </datalist>
        </label>
        <Link className="button button--secondary button--sm" to="/people">Employee directory</Link>
        <Link className="button button--secondary button--sm" to="/cases">Cases</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.people, state.personId, state.asOf]);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  const d = state.data;
  const totalHeadcount = d?.headcountSummary.totalHeadcount ?? 0;
  const activeHeadcount = d?.headcountSummary.activeHeadcount ?? 0;
  const inactiveHeadcount = d?.headcountSummary.inactiveHeadcount ?? 0;
  const withoutManager = d?.employeesWithoutManager.length ?? 0;
  const withoutOrgUnit = d?.employeesWithoutOrgUnit.length ?? 0;
  const dataIssues = withoutManager + withoutOrgUnit;
  const atRisk = d?.atRiskEmployees ?? [];

  const headcountTrend = d
    ? Array.from({ length: 6 }, (_, i) => {
        const dt = new Date(state.asOf);
        dt.setMonth(dt.getMonth() - (5 - i));
        return { count: d.headcountSummary.activeHeadcount, month: dt.toISOString().slice(0, 7) };
      })
    : [];

  const dataQualityScores = {
    assignmentPct: 100,
    emailPct: 100,
    managerPct: Math.round(((totalHeadcount - withoutManager) / Math.max(1, totalHeadcount)) * 100),
    orgUnitPct: Math.round(((totalHeadcount - withoutOrgUnit) / Math.max(1, totalHeadcount)) * 100),
    resourcePoolPct: 100,
  };

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="hr-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading HR dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {d.person.displayName && (
            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
              {d.person.displayName}
            </h2>
          )}

          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/people" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Total number of people in the system regardless of status. Click to view the employee directory." arrow="left" />
              <span className="kpi-strip__value">{totalHeadcount}</span>
              <span className="kpi-strip__label">Total Headcount</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>{activeHeadcount} active · {inactiveHeadcount} inactive</span>
            </Link>

            <Link className="kpi-strip__item" to="/people?status=active" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <TipBalloon tip="Employees currently active and eligible for assignment." arrow="left" />
              <span className="kpi-strip__value">{activeHeadcount}</span>
              <span className="kpi-strip__label">Active Employees</span>
              <div className="kpi-strip__progress">
                <div className="kpi-strip__progress-fill" style={{ width: totalHeadcount > 0 ? `${Math.round((activeHeadcount / totalHeadcount) * 100)}%` : '0%', background: 'var(--color-status-active)' }} />
              </div>
            </Link>

            <Link
              className="kpi-strip__item"
              to="#data-quality"
              onClick={(e) => { e.preventDefault(); handleTabChange('data-quality'); }}
              style={{ borderLeft: `3px solid ${dataIssues > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}
            >
              <TipBalloon tip="Employees missing a line manager or org unit assignment. These are data quality issues that affect reporting." arrow="left" />
              <span className="kpi-strip__value">{dataIssues}</span>
              <span className="kpi-strip__label">Data Issues</span>
              <span className="kpi-strip__context" style={{ color: dataIssues > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)' }}>
                {dataIssues === 0 ? 'All clean' : `${withoutManager} no mgr · ${withoutOrgUnit} no org`}
              </span>
            </Link>

            <Link
              className="kpi-strip__item"
              to="#lifecycle"
              onClick={(e) => { e.preventDefault(); handleTabChange('lifecycle'); }}
              style={{ borderLeft: `3px solid ${atRisk.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}
            >
              <TipBalloon tip="Employees flagged as at-risk based on multiple signals. Click to view details." arrow="left" />
              <span className="kpi-strip__value">{atRisk.length}</span>
              <span className="kpi-strip__label">At Risk</span>
              <span className="kpi-strip__context" style={{ color: atRisk.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>
                {atRisk.length === 0 ? 'All clear' : 'needs attention'}
              </span>
            </Link>

            <Link
              className="kpi-strip__item"
              to="/cases"
              style={{ borderLeft: `3px solid ${openCaseSubjects.length > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}
            >
              <TipBalloon tip="People with open HR cases. Click to view the case queue." arrow="left" />
              <span className="kpi-strip__value">{openCaseSubjects.length}</span>
              <span className="kpi-strip__label">Open Cases</span>
            </Link>
          </div>

          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={HR_TABS} />
          </div>

          {activeTab === 'headcount' && (
            <HrHeadcountTab
              totalHeadcount={totalHeadcount}
              activeHeadcount={activeHeadcount}
              inactiveHeadcount={inactiveHeadcount}
              withoutManager={withoutManager}
              withoutOrgUnit={withoutOrgUnit}
              headcountTrend={headcountTrend}
            />
          )}

          {activeTab === 'organization' && (
            <HrOrganizationTab orgDistribution={d.orgDistribution} totalHeadcount={totalHeadcount} />
          )}

          {activeTab === 'data-quality' && (
            <HrDataQualityTab
              scores={dataQualityScores}
              employeesWithoutManager={d.employeesWithoutManager}
              employeesWithoutOrgUnit={d.employeesWithoutOrgUnit}
              onPersonClick={(id) => navigate(`/people/${id}`)}
            />
          )}

          {activeTab === 'roles' && (
            <HrRolesTab
              roleDistribution={d.roleDistribution}
              gradeDistribution={d.gradeDistribution}
              totalHeadcount={totalHeadcount}
            />
          )}

          {activeTab === 'lifecycle' && (
            <HrLifecycleTab
              atRisk={atRisk}
              openCaseSubjects={openCaseSubjects}
              recentJoinerActivity={d.recentJoinerActivity}
              recentDeactivationActivity={d.recentDeactivationActivity}
              onPersonClick={(id) => navigate(`/people/${id}`)}
            />
          )}

          {activeTab === 'wellbeing' && (
            <HrWellbeingTab
              heatmapLoading={heatmapLoading}
              heatmapData={heatmapData}
              heatmapManagerId={heatmapManagerId}
              heatmapPoolId={heatmapPoolId}
              managerOptions={managerOptions}
              poolOptions={poolOptions}
              onHeatmapManagerChange={setHeatmapManagerId}
              onHeatmapPoolChange={setHeatmapPoolId}
              directReportsManagerId={effectivePersonId ?? undefined}
            />
          )}

          <RecentActivityRail role="hr" />

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
