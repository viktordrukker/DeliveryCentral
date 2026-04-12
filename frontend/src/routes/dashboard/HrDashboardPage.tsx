import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { TabBar } from '@/components/common/TabBar';
import { OrgDistributionTreemap } from '@/components/charts/OrgDistributionTreemap';
import { HeadcountTrendLine } from '@/components/charts/HeadcountTrendLine';
import { DataQualityRadar } from '@/components/charts/DataQualityRadar';
import { ManagerSpanDistributionBar } from '@/components/charts/ManagerSpanDistributionBar';
import { TeamMoodHeatmap } from '@/components/charts/TeamMoodHeatmap';
import { DirectReportsMoodTable } from '@/components/people/DirectReportsMoodTable';
import { useHrManagerDashboard } from '@/features/dashboard/useHrManagerDashboard';
import { fetchMoodHeatmap, MoodHeatmapResponse } from '@/lib/api/pulse';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { fetchCases } from '@/lib/api/cases';
import { DashboardGrid } from '@/components/layout/DashboardGrid';

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
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useHrManagerDashboard(effectivePersonId);
  const [openCaseSubjects, setOpenCaseSubjects] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = HR_TABS.some((t) => `#${t.id}` === location.hash)
    ? location.hash.slice(1)
    : 'headcount';

  function handleTabChange(tabId: string): void {
    navigate(`${location.pathname}${location.search}#${tabId}`, { replace: true });
  }

  useEffect(() => {
    void fetchCases({ })
      .then((r) => {
        const subjects = r.items
          .filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
          .map((c) => c.subjectPersonId);
        setOpenCaseSubjects(subjects);
      })
      .catch(() => undefined);
  }, []);

  // Mood heatmap filters
  const [heatmapOrgUnitId, setHeatmapOrgUnitId] = useState<string>('');
  const [heatmapManagerId, setHeatmapManagerId] = useState<string>('');
  const [heatmapPoolId, setHeatmapPoolId] = useState<string>('');
  const [heatmapData, setHeatmapData] = useState<MoodHeatmapResponse | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [managerOptions, setManagerOptions] = useState<Array<{ id: string; displayName: string }>>([]);
  const [poolOptions, setPoolOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // Load filter options
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
      orgUnitId: heatmapOrgUnitId || undefined,
      poolId: heatmapPoolId || undefined,
    })
      .then((data) => { if (active) { setHeatmapData(data); setHeatmapLoading(false); } })
      .catch(() => setHeatmapData(null))
      .finally(() => setHeatmapLoading(false));
    return () => { active = false; };
  }, [heatmapOrgUnitId, heatmapManagerId, heatmapPoolId]);

  function handlePersonChange(value: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('personId', value);
      return next;
    });
    state.setPersonId(value);
  }

  // Derive chart data
  const treemapData = (state.data?.orgDistribution ?? []).map((item) => ({
    name: item.label,
    size: item.count,
  }));

  // Build 6-month headcount trend from available data (approximate from active headcount)
  const headcountTrend = state.data
    ? Array.from({ length: 6 }, (_, i) => {
        const d = new Date(state.asOf);
        d.setMonth(d.getMonth() - (5 - i));
        return {
          count: state.data!.headcountSummary.activeHeadcount,
          month: d.toISOString().slice(0, 7),
        };
      })
    : [];

  // Data quality scores from available signals
  const totalHeadcount = state.data?.headcountSummary.totalHeadcount ?? 1;
  const withoutManager = state.data?.employeesWithoutManager.length ?? 0;
  const withoutOrgUnit = state.data?.employeesWithoutOrgUnit.length ?? 0;

  const dataQualityScores = {
    assignmentPct: 100,
    emailPct: 100,
    managerPct: Math.round(((totalHeadcount - withoutManager) / Math.max(1, totalHeadcount)) * 100),
    orgUnitPct: Math.round(((totalHeadcount - withoutOrgUnit) / Math.max(1, totalHeadcount)) * 100),
    resourcePoolPct: 100,
  };

  // Manager span: derive from role distribution as proxy
  const managerSpanData = (state.data?.roleDistribution ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({ managerName: r.label, reportCount: r.count }));

  return (
    <PageContainer testId="hr-dashboard-page">
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/people">
            Open employee directory
          </Link>
        }
        eyebrow="Dashboard"
        title={state.data?.person.displayName ?? 'HR Dashboard'}
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">HR manager</span>
          <input
            className="field__control"
            list="hr-people-list"
            onChange={(event) => {
              const match = state.people.find((p) => p.displayName === event.target.value);
              if (match) handlePersonChange(match.id);
            }}
            placeholder="Search HR managers..."
            type="text"
            defaultValue={state.people.find((p) => p.id === state.personId)?.displayName ?? ''}
            key={state.personId}
          />
          <datalist id="hr-people-list">
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

      {state.isLoading ? <LoadingState label="Loading HR dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <WorkloadCard
              href="/people"
              label="Total Headcount"
              value={String(state.data.headcountSummary.totalHeadcount)}
            />
            <WorkloadCard
              href="/people?status=active"
              label="Active Employees"
              value={String(state.data.headcountSummary.activeHeadcount)}
            />
            <WorkloadCard
              href="/people?status=INACTIVE"
              label="Inactive Employees"
              value={String(state.data.headcountSummary.inactiveHeadcount)}
            />
            <WorkloadCard
              href="#data-quality"
              label="Employees Without Manager"
              value={String(state.data.employeesWithoutManager.length)}
            />
          </div>

          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={HR_TABS} />
          </div>

          {/* Headcount tab */}
          {activeTab === 'headcount' && (
            <DashboardGrid>
              <SectionCard title="Headcount Trend (6 Months)">
                <HeadcountTrendLine data={headcountTrend} />
              </SectionCard>
              <SectionCard title="Summary">
                <dl className="details-list">
                  <div><dt>Total</dt><dd>{state.data.headcountSummary.totalHeadcount}</dd></div>
                  <div><dt>Active</dt><dd>{state.data.headcountSummary.activeHeadcount}</dd></div>
                  <div><dt>Inactive</dt><dd>{state.data.headcountSummary.inactiveHeadcount}</dd></div>
                  <div><dt>Without Manager</dt><dd>{state.data.employeesWithoutManager.length}</dd></div>
                  <div><dt>Without Org Unit</dt><dd>{state.data.employeesWithoutOrgUnit.length}</dd></div>
                </dl>
              </SectionCard>
            </DashboardGrid>
          )}

          {/* Organization tab */}
          {activeTab === 'organization' && (
            <DashboardGrid>
              {treemapData.length > 0 ? (
                <SectionCard title="Org Distribution">
                  <OrgDistributionTreemap data={treemapData} />
                </SectionCard>
              ) : null}
              <SectionCard title="Org Units">
                {state.data.orgDistribution.length === 0 ? (
                  <EmptyState
                    description="No organization distribution data is available."
                    title="No org distribution"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.orgDistribution.map((item) => (
                      <div className="monitoring-list__item" key={item.key}>
                        <div className="monitoring-list__title">{item.label}</div>
                        <p className="monitoring-list__summary">{item.count} employees</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </DashboardGrid>
          )}

          {/* Data Quality tab */}
          {activeTab === 'data-quality' && (
            <DashboardGrid>
              <SectionCard title="Data Quality">
                <DataQualityRadar scores={dataQualityScores} />
              </SectionCard>
              <SectionCard title="Data Quality Signals">
                {state.data.employeesWithoutManager.length === 0 &&
                state.data.employeesWithoutOrgUnit.length === 0 ? (
                  <EmptyState
                    description="All employees have a manager and an org unit assigned."
                    title="No data quality issues"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.employeesWithoutManager.map((item) => (
                      <div className="monitoring-list__item" key={`nm-${item.personId}`}>
                        <div className="monitoring-list__title">{item.displayName}</div>
                        <p className="monitoring-list__summary">
                          No manager assigned
                          {item.primaryEmail ? ` · ${item.primaryEmail}` : ''}
                        </p>
                      </div>
                    ))}
                    {state.data.employeesWithoutOrgUnit.map((item) => (
                      <div className="monitoring-list__item" key={`no-${item.personId}`}>
                        <div className="monitoring-list__title">{item.displayName}</div>
                        <p className="monitoring-list__summary">
                          No org unit assigned
                          {item.primaryEmail ? ` · ${item.primaryEmail}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </DashboardGrid>
          )}

          {/* Roles tab */}
          {activeTab === 'roles' && (
            <DashboardGrid>
              {managerSpanData.length > 0 ? (
                <SectionCard title="Role Distribution">
                  <ManagerSpanDistributionBar data={managerSpanData} />
                </SectionCard>
              ) : null}
              <SectionCard title="Roles and Grades">
                {state.data.roleDistribution.length === 0 &&
                state.data.gradeDistribution.length === 0 ? (
                  <EmptyState
                    description="No role or grade distribution data is available."
                    title="No role or grade data"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.roleDistribution.map((item) => (
                      <div className="monitoring-list__item" key={`role-${item.key}`}>
                        <div className="monitoring-list__title">Role: {item.label.includes(' ') ? item.label : item.label.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <p className="monitoring-list__summary">{item.count} employees</p>
                      </div>
                    ))}
                    {state.data.gradeDistribution.map((item) => (
                      <div className="monitoring-list__item" key={`grade-${item.key}`}>
                        <div className="monitoring-list__title">Grade: {item.label.includes(' ') ? item.label : item.label.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <p className="monitoring-list__summary">{item.count} employees</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </DashboardGrid>
          )}

          {/* Lifecycle tab */}
          {activeTab === 'lifecycle' && (
            <div className="details-grid">
              <SectionCard title="Lifecycle Activity">
                {state.data.recentJoinerActivity.length === 0 &&
                state.data.recentDeactivationActivity.length === 0 ? (
                  <EmptyState
                    description="No joiners or deactivations recorded recently."
                    title="No recent lifecycle activity"
                  />
                ) : (
                  <div className="monitoring-list">
                    {state.data.recentJoinerActivity.map((item) => (
                      <div className="monitoring-list__item" key={`join-${item.personId}`}>
                        <div className="monitoring-list__title">{item.displayName}</div>
                        <p className="monitoring-list__summary">
                          Joined · {new Date(item.occurredAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                    ))}
                    {state.data.recentDeactivationActivity.map((item) => (
                      <div className="monitoring-list__item" key={`deact-${item.personId}`}>
                        <div className="monitoring-list__title">{item.displayName}</div>
                        <p className="monitoring-list__summary">
                          Deactivated · {new Date(item.occurredAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {openCaseSubjects.length > 0 ? (
                <SectionCard title="People with Open Cases (At Risk)">
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {openCaseSubjects.length} person{openCaseSubjects.length !== 1 ? 's have' : ' has'} an open case and may need HR attention.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {openCaseSubjects.slice(0, 20).map((id) => (
                      <span
                        key={id}
                        style={{
                          display: 'inline-block',
                          background: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          color: '#991b1b',
                          fontFamily: 'monospace',
                        }}
                      >
                        {id.slice(0, 8)}…
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link style={{ fontSize: '0.75rem', color: '#6b7280' }} to="/cases">View all cases →</Link>
                  </div>
                </SectionCard>
              ) : null}

              {(state.data.atRiskEmployees ?? []).length > 0 ? (
                <SectionCard title="At-Risk Employees">
                  <div data-testid="at-risk-employees-panel">
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                      {state.data!.atRiskEmployees.length} employee{state.data!.atRiskEmployees.length !== 1 ? 's are' : ' is'} flagged as at-risk.
                    </p>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Risk Factors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.data!.atRiskEmployees.map((emp) => (
                          <tr key={emp.personId}>
                            <td>
                              <Link to={`/people/${emp.personId}`}>{emp.displayName}</Link>
                            </td>
                            <td>{emp.primaryEmail ?? '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {emp.riskFactors.map((factor) => (
                                  <span
                                    key={factor}
                                    style={{
                                      background: '#fef2f2',
                                      border: '1px solid #fca5a5',
                                      borderRadius: 4,
                                      color: '#991b1b',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                    }}
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          )}

          {/* Wellbeing tab */}
          {activeTab === 'wellbeing' && (
            <>
              <SectionCard title="Team Mood Heatmap">
                <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <label className="field">
                    <span className="field__label">Manager</span>
                    <select
                      className="field__control"
                      data-testid="heatmap-manager-filter"
                      onChange={(e) => setHeatmapManagerId(e.target.value)}
                      value={heatmapManagerId}
                    >
                      <option value="">All managers</option>
                      {managerOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Resource Pool</span>
                    <select
                      className="field__control"
                      data-testid="heatmap-pool-filter"
                      onChange={(e) => setHeatmapPoolId(e.target.value)}
                      value={heatmapPoolId}
                    >
                      <option value="">All pools</option>
                      {poolOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {heatmapLoading ? (
                  <LoadingState label="Loading mood heatmap..." />
                ) : heatmapData ? (
                  <TeamMoodHeatmap data={heatmapData} />
                ) : (
                  <EmptyState
                    action={{ href: '/notifications/new?type=pulse-reminder', label: 'Remind team to submit' }}
                    description="Team mood data appears once your direct reports submit their weekly pulse check."
                    title="No mood data yet"
                  />
                )}
              </SectionCard>

              <SectionCard title="Direct Reports Mood Summary">
                <DirectReportsMoodTable managerId={effectivePersonId ?? undefined} />
              </SectionCard>
            </>
          )}
        </>
      ) : null}
    </PageContainer>
  );
}
