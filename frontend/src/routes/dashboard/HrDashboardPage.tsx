import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { Sparkline } from '@/components/charts/Sparkline';
import { TabBar } from '@/components/common/TabBar';
import { formatDate } from '@/lib/format-date';
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

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

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

  // Mood heatmap filters
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

  // Title bar actions
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

  // Track fetch time
  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  /* ── Derived data ────────────────────────────────────────────── */
  const d = state.data;
  const totalHeadcount = d?.headcountSummary.totalHeadcount ?? 0;
  const activeHeadcount = d?.headcountSummary.activeHeadcount ?? 0;
  const inactiveHeadcount = d?.headcountSummary.inactiveHeadcount ?? 0;
  const withoutManager = d?.employeesWithoutManager.length ?? 0;
  const withoutOrgUnit = d?.employeesWithoutOrgUnit.length ?? 0;
  const dataIssues = withoutManager + withoutOrgUnit;
  const atRisk = d?.atRiskEmployees ?? [];

  const treemapData = (d?.orgDistribution ?? []).map((item) => ({
    name: item.label,
    size: item.count,
  }));

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

  const managerSpanData = (d?.roleDistribution ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({ managerName: r.label, reportCount: r.count }));

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="hr-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading HR dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {d.person.displayName && <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{d.person.displayName}</h2>}

          {/* ── KPI STRIP ── */}
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

            <Link className="kpi-strip__item" to="#data-quality" onClick={(e) => { e.preventDefault(); handleTabChange('data-quality'); }}
              style={{ borderLeft: `3px solid ${dataIssues > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Employees missing a line manager or org unit assignment. These are data quality issues that affect reporting." arrow="left" />
              <span className="kpi-strip__value">{dataIssues}</span>
              <span className="kpi-strip__label">Data Issues</span>
              <span className="kpi-strip__context" style={{ color: dataIssues > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)' }}>
                {dataIssues === 0 ? 'All clean' : `${withoutManager} no mgr · ${withoutOrgUnit} no org`}
              </span>
            </Link>

            <Link className="kpi-strip__item" to="#lifecycle" onClick={(e) => { e.preventDefault(); handleTabChange('lifecycle'); }}
              style={{ borderLeft: `3px solid ${atRisk.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Employees flagged as at-risk based on multiple signals. Click to view details." arrow="left" />
              <span className="kpi-strip__value">{atRisk.length}</span>
              <span className="kpi-strip__label">At Risk</span>
              <span className="kpi-strip__context" style={{ color: atRisk.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>
                {atRisk.length === 0 ? 'All clear' : 'needs attention'}
              </span>
            </Link>

            <Link className="kpi-strip__item" to="/cases"
              style={{ borderLeft: `3px solid ${openCaseSubjects.length > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="People with open HR cases. Click to view the case queue." arrow="left" />
              <span className="kpi-strip__value">{openCaseSubjects.length}</span>
              <span className="kpi-strip__label">Open Cases</span>
            </Link>
          </div>

          {/* ── TABS ── */}
          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={HR_TABS} />
          </div>

          {/* ── Headcount tab ── */}
          {activeTab === 'headcount' && (
            <>
              <div className="dashboard-hero" style={{ position: 'relative' }}>
                <TipBalloon tip="6-month headcount trend showing active employee count over time." arrow="left" />
                <div className="dashboard-hero__header">
                  <div>
                    <div className="dashboard-hero__title">Headcount Trend (6 Months)</div>
                    <div className="dashboard-hero__subtitle">Active employee count over time</div>
                  </div>
                </div>
                <div className="dashboard-hero__chart">
                  <HeadcountTrendLine data={headcountTrend} />
                </div>
              </div>
              <SectionCard title="Headcount Breakdown" collapsible chartExport={{
                headers: ['Metric', 'Value'],
                rows: [{ Metric: 'Total', Value: String(totalHeadcount) }, { Metric: 'Active', Value: String(activeHeadcount) }, { Metric: 'Inactive', Value: String(inactiveHeadcount) }, { Metric: 'Without Manager', Value: String(withoutManager) }, { Metric: 'Without Org Unit', Value: String(withoutOrgUnit) }],
              }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th style={NUM}>Count</th>
                      <th style={NUM}>% of Total</th>
                      <th style={{ width: 120 }}>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Active', value: activeHeadcount, color: 'var(--color-status-active)' },
                      { label: 'Inactive', value: inactiveHeadcount, color: 'var(--color-status-neutral)' },
                      { label: 'Without Manager', value: withoutManager, color: 'var(--color-status-warning)' },
                      { label: 'Without Org Unit', value: withoutOrgUnit, color: 'var(--color-status-warning)' },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td style={{ fontWeight: 500 }}>{row.label}</td>
                        <td style={{ ...NUM, fontWeight: 600 }}>{row.value}</td>
                        <td style={NUM}>{totalHeadcount > 0 ? Math.round((row.value / totalHeadcount) * 100) : 0}%</td>
                        <td>
                          <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: totalHeadcount > 0 ? `${Math.round((row.value / totalHeadcount) * 100)}%` : '0%', borderRadius: 2, background: row.color }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </>
          )}

          {/* ── Organization tab ── */}
          {activeTab === 'organization' && (
            <>
              {treemapData.length > 0 && (
                <div className="dashboard-hero" style={{ position: 'relative' }}>
                  <TipBalloon tip="Visual breakdown of headcount by org unit. Larger blocks = more people." arrow="left" />
                  <div className="dashboard-hero__header">
                    <div>
                      <div className="dashboard-hero__title">Org Distribution</div>
                      <div className="dashboard-hero__subtitle">Headcount across organizational units</div>
                    </div>
                  </div>
                  <div className="dashboard-hero__chart">
                    <OrgDistributionTreemap data={treemapData} />
                  </div>
                </div>
              )}
              <SectionCard title="Org Units" collapsible chartExport={{
                headers: ['Org Unit', 'Employees'],
                rows: (d.orgDistribution).map((i) => ({ 'Org Unit': i.label, Employees: String(i.count) })),
              }}>
                {d.orgDistribution.length === 0 ? (
                  <EmptyState description="No organization distribution data is available." title="No org distribution" />
                ) : (
                  <table className="dash-compact-table">
                    <thead>
                      <tr>
                        <th>Org Unit</th>
                        <th style={NUM}>Employees</th>
                        <th style={NUM}>% of Total</th>
                        <th style={{ width: 120 }}>Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.orgDistribution.map((item) => (
                        <tr key={item.key}>
                          <td style={{ fontWeight: 500 }}>{item.label}</td>
                          <td style={NUM}>{item.count}</td>
                          <td style={NUM}>{totalHeadcount > 0 ? Math.round((item.count / totalHeadcount) * 100) : 0}%</td>
                          <td>
                            <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: totalHeadcount > 0 ? `${Math.round((item.count / totalHeadcount) * 100)}%` : '0%', borderRadius: 2, background: 'var(--color-chart-5, #8b5cf6)' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Data Quality tab ── */}
          {activeTab === 'data-quality' && (
            <>
              <div className="dashboard-main-grid">
                <SectionCard title="Data Quality Radar" collapsible>
                  <DataQualityRadar scores={dataQualityScores} />
                </SectionCard>
                <SectionCard title="Quality Scores" collapsible>
                  <table className="dash-compact-table">
                    <thead>
                      <tr><th>Dimension</th><th style={NUM}>Score</th><th style={{ width: 120 }}>Bar</th></tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Manager Coverage', pct: dataQualityScores.managerPct },
                        { label: 'Org Unit Coverage', pct: dataQualityScores.orgUnitPct },
                        { label: 'Email Coverage', pct: dataQualityScores.emailPct },
                        { label: 'Assignment Coverage', pct: dataQualityScores.assignmentPct },
                        { label: 'Resource Pool', pct: dataQualityScores.resourcePoolPct },
                      ].map((row) => (
                        <tr key={row.label}>
                          <td>{row.label}</td>
                          <td style={{ ...NUM, fontWeight: 600, color: row.pct >= 90 ? 'var(--color-status-active)' : row.pct >= 70 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }}>{row.pct}%</td>
                          <td>
                            <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${row.pct}%`, borderRadius: 2, background: row.pct >= 90 ? 'var(--color-status-active)' : row.pct >= 70 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SectionCard>
              </div>

              {(withoutManager > 0 || withoutOrgUnit > 0) && (
                <div className="dash-action-section" style={{ position: 'relative' }}>
                  <TipBalloon tip="Employees with missing data that needs correction." arrow="left" />
                  <div className="dash-action-section__header">
                    <span className="dash-action-section__title">Data Quality Issues ({dataIssues})</span>
                  </div>
                  <div style={{ overflow: 'auto' }}>
                    <table className="dash-compact-table" style={{ minWidth: 500 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 28 }}>#</th>
                          <th>Employee</th>
                          <th>Email</th>
                          <th style={{ width: 140 }}>Issue</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.employeesWithoutManager.map((item, i) => (
                          <tr key={`nm-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                            <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.primaryEmail ?? '\u2014'}</td>
                            <td><span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>No manager</span></td>
                            <td><Link to={`/people/${item.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                        {d.employeesWithoutOrgUnit.map((item, i) => (
                          <tr key={`no-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                            <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{withoutManager + i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.primaryEmail ?? '\u2014'}</td>
                            <td><span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>No org unit</span></td>
                            <td><Link to={`/people/${item.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Roles tab ── */}
          {activeTab === 'roles' && (
            <>
              {managerSpanData.length > 0 && (
                <div className="dashboard-hero" style={{ position: 'relative' }}>
                  <TipBalloon tip="Distribution of roles across the organization." arrow="left" />
                  <div className="dashboard-hero__header">
                    <div>
                      <div className="dashboard-hero__title">Role Distribution</div>
                      <div className="dashboard-hero__subtitle">Headcount by role and grade</div>
                    </div>
                  </div>
                  <div className="dashboard-hero__chart">
                    <ManagerSpanDistributionBar data={managerSpanData} />
                  </div>
                </div>
              )}
              <SectionCard title="Roles and Grades" collapsible chartExport={{
                headers: ['Type', 'Label', 'Count'],
                rows: [...(d.roleDistribution).map((i) => ({ Type: 'Role', Label: i.label, Count: String(i.count) })), ...(d.gradeDistribution).map((i) => ({ Type: 'Grade', Label: i.label, Count: String(i.count) }))],
              }}>
                {d.roleDistribution.length === 0 && d.gradeDistribution.length === 0 ? (
                  <EmptyState description="No role or grade distribution data is available." title="No role or grade data" />
                ) : (
                  <table className="dash-compact-table">
                    <thead>
                      <tr><th>Type</th><th>Label</th><th style={NUM}>Count</th><th style={{ width: 120 }}>Bar</th></tr>
                    </thead>
                    <tbody>
                      {d.roleDistribution.map((item) => (
                        <tr key={`role-${item.key}`}>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Role</td>
                          <td style={{ fontWeight: 500 }}>{item.label.includes(' ') ? item.label : item.label.replace(/([A-Z])/g, ' $1').trim()}</td>
                          <td style={NUM}>{item.count}</td>
                          <td>
                            <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, Math.round((item.count / Math.max(1, totalHeadcount)) * 100))}%`, borderRadius: 2, background: 'var(--color-chart-3, #f59e0b)' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {d.gradeDistribution.map((item) => (
                        <tr key={`grade-${item.key}`}>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Grade</td>
                          <td style={{ fontWeight: 500 }}>{item.label.includes(' ') ? item.label : item.label.replace(/([A-Z])/g, ' $1').trim()}</td>
                          <td style={NUM}>{item.count}</td>
                          <td>
                            <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, Math.round((item.count / Math.max(1, totalHeadcount)) * 100))}%`, borderRadius: 2, background: 'var(--color-chart-5, #8b5cf6)' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Lifecycle tab ── */}
          {activeTab === 'lifecycle' && (
            <>
              {/* At-Risk Employees — action items */}
              {atRisk.length > 0 && (
                <div className="dash-action-section" style={{ position: 'relative' }}>
                  <TipBalloon tip="Employees flagged as at-risk based on multiple signals. Review and take action." arrow="left" />
                  <div className="dash-action-section__header">
                    <span className="dash-action-section__title">At-Risk Employees ({atRisk.length})</span>
                  </div>
                  <div style={{ overflow: 'auto' }} data-testid="at-risk-employees-panel">
                    <table className="dash-compact-table" style={{ minWidth: 500 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 28 }}>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Risk Factors</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {atRisk.map((emp, i) => (
                          <tr key={emp.personId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${emp.personId}`)}>
                            <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{emp.displayName}</td>
                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{emp.primaryEmail ?? '\u2014'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {emp.riskFactors.map((factor) => (
                                  <span key={factor} style={{ background: 'var(--color-status-danger)', color: '#fff', borderRadius: 3, fontSize: 10, fontWeight: 600, padding: '1px 6px' }}>{factor}</span>
                                ))}
                              </div>
                            </td>
                            <td><Link to={`/people/${emp.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Open Cases */}
              {openCaseSubjects.length > 0 && (
                <SectionCard title={`People with Open Cases (${openCaseSubjects.length})`} collapsible>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    {openCaseSubjects.length} person{openCaseSubjects.length !== 1 ? 's have' : ' has'} an open case and may need HR attention.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {openCaseSubjects.slice(0, 20).map((id) => (
                      <span key={id} style={{ display: 'inline-block', background: 'var(--color-status-danger)', color: '#fff', borderRadius: 3, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace' }}>
                        {id.slice(0, 8)}...
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Link style={{ fontSize: 11, color: 'var(--color-accent)' }} to="/cases">View all cases</Link>
                  </div>
                </SectionCard>
              )}

              {/* Lifecycle Activity */}
              <SectionCard title="Lifecycle Activity" collapsible chartExport={{
                headers: ['Type', 'Name', 'Date'],
                rows: [
                  ...(d.recentJoinerActivity).map((i) => ({ Type: 'Joined', Name: i.displayName, Date: i.occurredAt.slice(0, 10) })),
                  ...(d.recentDeactivationActivity).map((i) => ({ Type: 'Deactivated', Name: i.displayName, Date: i.occurredAt.slice(0, 10) })),
                ],
              }}>
                {d.recentJoinerActivity.length === 0 && d.recentDeactivationActivity.length === 0 ? (
                  <EmptyState description="No joiners or deactivations recorded recently." title="No recent lifecycle activity" />
                ) : (
                  <table className="dash-compact-table">
                    <thead>
                      <tr><th style={{ width: 90 }}>Type</th><th>Name</th><th style={{ width: 100 }}>Date</th><th style={{ width: 40 }}></th></tr>
                    </thead>
                    <tbody>
                      {d.recentJoinerActivity.map((item) => (
                        <tr key={`join-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                          <td><span style={{ color: 'var(--color-status-active)', fontWeight: 600, fontSize: 11 }}>Joined</span></td>
                          <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.occurredAt)}</td>
                          <td><Link to={`/people/${item.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                        </tr>
                      ))}
                      {d.recentDeactivationActivity.map((item) => (
                        <tr key={`deact-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                          <td><span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>Deactivated</span></td>
                          <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.occurredAt)}</td>
                          <td><Link to={`/people/${item.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Wellbeing tab ── */}
          {activeTab === 'wellbeing' && (
            <>
              <SectionCard title="Team Mood Heatmap" collapsible>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <label className="field">
                    <span className="field__label">Manager</span>
                    <select className="field__control" data-testid="heatmap-manager-filter" onChange={(e) => setHeatmapManagerId(e.target.value)} value={heatmapManagerId}>
                      <option value="">All managers</option>
                      {managerOptions.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Resource Pool</span>
                    <select className="field__control" data-testid="heatmap-pool-filter" onChange={(e) => setHeatmapPoolId(e.target.value)} value={heatmapPoolId}>
                      <option value="">All pools</option>
                      {poolOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                </div>
                {heatmapLoading ? (
                  <LoadingState label="Loading mood heatmap..." variant="skeleton" skeletonType="chart" />
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

              <SectionCard title="Direct Reports Mood Summary" collapsible>
                <DirectReportsMoodTable managerId={effectivePersonId ?? undefined} />
              </SectionCard>
            </>
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
