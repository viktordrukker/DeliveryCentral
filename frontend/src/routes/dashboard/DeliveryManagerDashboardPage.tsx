import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { SectionCard } from '@/components/common/SectionCard';
import { TabBar } from '@/components/common/TabBar';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { PortfolioHealthHeatmap } from '@/components/charts/PortfolioHealthHeatmap';
import { EvidenceVsAssignmentBars } from '@/components/charts/EvidenceVsAssignmentBars';
import { BurnRateTrendPoint, fetchScorecardHistory, ProjectHealthItem, ProjectScorecardHistoryItem, StaffingGapItem, OpenRequestsByProjectItem } from '@/lib/api/dashboard-delivery-manager';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { useDeliveryManagerDashboard } from '@/features/dashboard/useDeliveryManagerDashboard';
import { DashboardGrid } from '@/components/layout/DashboardGrid';

const DM_TABS = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'scorecard', label: 'Scorecard' },
];

export function DeliveryManagerDashboardPage(): JSX.Element {
  const state = useDeliveryManagerDashboard();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = DM_TABS.some((t) => `#${t.id}` === location.hash)
    ? location.hash.slice(1)
    : 'portfolio';

  function handleTabChange(tabId: string): void {
    navigate(`${location.pathname}${location.search}#${tabId}`, { replace: true });
  }

  const [healthScores, setHealthScores] = useState<Map<string, ProjectHealthDto>>(new Map());

  useEffect(() => {
    if (!state.data || state.data.portfolioHealth.length === 0) return;
    let active = true;

    void Promise.allSettled(
      state.data.portfolioHealth.map((item) =>
        fetchProjectHealth(item.projectId).then((h) => ({ health: h, id: item.projectId })),
      ),
    ).then((results) => {
      if (!active) return;
      const next = new Map<string, ProjectHealthDto>();
      for (const result of results) {
        if (result.status === 'fulfilled') {
          next.set(result.value.id, result.value.health);
        }
      }
      setHealthScores(next);
    });

    return () => {
      active = false;
    };
  }, [state.data]);

  // Derive heatmap data: use anomalyFlags to determine color
  const heatmapData = (state.data?.portfolioHealth ?? []).map((item) => {
    const flags = item.anomalyFlags.map((f) => f.toLowerCase());
    return {
      evidence: (flags.some((f) => f.includes('evidence')) ? 'red' : 'green') as 'green' | 'yellow' | 'red',
      name: `${item.projectCode} — ${item.name}`,
      staffing: (item.staffingCount === 0 ? 'red' : flags.some((f) => f.includes('staff')) ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
      timeline: (flags.some((f) => f.includes('timeline') || f.includes('overdue')) ? 'red' : 'green') as 'green' | 'yellow' | 'red',
    };
  });

  // Evidence vs assignment bars
  const evidenceBarsData = (state.data?.portfolioHealth ?? []).map((item) => ({
    expected: item.staffingCount * 8,
    logged: item.evidenceCount,
    project: item.name.length > 20 ? `${item.name.slice(0, 18)}…` : item.name,
    projectId: item.projectId,
  }));

  return (
    <PageContainer testId="delivery-manager-dashboard-page">
      <PageHeader
        actions={
          <div className="page-header__actions">
            <Link className="button button--secondary" to="/projects">
              Open projects
            </Link>
            <Link className="button button--secondary" to="/assignments">
              View assignments
            </Link>
          </div>
        }
        eyebrow="Dashboard"
        title="Delivery Manager Dashboard"
      />

      <FilterBar
        actions={
          <button
            className="button button--secondary"
            onClick={() => state.setAsOf(new Date().toISOString())}
            type="button"
          >
            Reset
          </button>
        }
      >
        <PeriodSelector onAsOfChange={state.setAsOf} value={state.asOf} />
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading delivery manager dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <WorkloadCard
              href="/projects?status=active"
              label="Active Projects"
              value={String(state.data.summary.totalActiveProjects)}
            />
            <WorkloadCard
              href="/assignments?status=active"
              label="Active Assignments"
              value={String(state.data.summary.totalActiveAssignments)}
            />
            <WorkloadCard
              href="#unstaffed-projects"
              label="Projects Without Staff"
              value={String(state.data.summary.projectsWithNoStaff)}
            />
            <WorkloadCard
              href="#evidence-anomalies"
              label="Evidence Anomalies"
              value={String(state.data.summary.projectsWithEvidenceAnomalies)}
            />
            <WorkloadCard
              href="#inactive-evidence-projects"
              label="Inactive Evidence Projects"
              value={String(state.data.summary.inactiveEvidenceProjectCount)}
            />
          </div>

          <div className="tab-bar-sticky">
            <TabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={DM_TABS} />
          </div>

          {/* Portfolio tab */}
          {activeTab === 'portfolio' && (
            <>
              {heatmapData.length > 0 ? (
                <SectionCard title="Portfolio Health Overview">
                  <PortfolioHealthHeatmap projects={heatmapData} />
                </SectionCard>
              ) : null}

              <DashboardGrid>
                <SectionCard title="Portfolio Health">
                  {state.data.portfolioHealth.length === 0 ? (
                    <EmptyState
                      description="No active projects found for this period."
                      title="No portfolio data"
                    />
                  ) : (
                    <div className="monitoring-list">
                      {state.data.portfolioHealth.map((item) => (
                        <PortfolioHealthRow key={item.projectId} item={item} />
                      ))}
                    </div>
                  )}
                </SectionCard>

                {(state.data.staffingGaps ?? []).length > 0 ? (
                  <SectionCard id="unstaffed-projects" title="Staffing Gaps — Assignments Ending Soon">
                    <StaffingGapsTable gaps={state.data.staffingGaps ?? []} />
                  </SectionCard>
                ) : null}

                {(state.data.openRequestsByProject ?? []).length > 0 ? (
                  <SectionCard title="Open Staffing Requests by Project">
                    <OpenRequestsByProjectTable rows={state.data.openRequestsByProject ?? []} />
                  </SectionCard>
                ) : null}
              </DashboardGrid>
            </>
          )}

          {/* Evidence tab */}
          {activeTab === 'evidence' && (
            <>
              {evidenceBarsData.length > 0 ? (
                <SectionCard title="Evidence vs Assignment Coverage">
                  <EvidenceVsAssignmentBars data={evidenceBarsData} />
                </SectionCard>
              ) : null}

              {(state.data.burnRateTrend ?? []).length > 0 ? (
                <SectionCard title="Evidence Burn Rate — Last 8 Weeks">
                  <BurnRateTrendChart data={state.data.burnRateTrend ?? []} />
                </SectionCard>
              ) : null}

              <DashboardGrid>
                <SectionCard id="evidence-anomalies" title="Reconciliation Status">
                  <div className="monitoring-list">
                    <div className="monitoring-list__item">
                      <div className="monitoring-list__title" style={{ color: '#16a34a' }}>
                        ✓ Matched
                      </div>
                      <p className="monitoring-list__summary">
                        {state.data.reconciliation.matchedCount} assignment–evidence pairs reconciled
                      </p>
                      <Link
                        className="button button--secondary"
                        style={{ fontSize: '12px', marginTop: '6px', padding: '2px 8px' }}
                        to="/dashboard/planned-vs-actual"
                      >
                        View matched records
                      </Link>
                    </div>
                    <div className="monitoring-list__item">
                      <div className="monitoring-list__title" style={{ color: state.data.reconciliation.assignedButNoEvidenceCount > 0 ? '#f59e0b' : undefined }}>
                        {state.data.reconciliation.assignedButNoEvidenceCount > 0 ? '⚠ ' : ''}Assigned but no evidence
                      </div>
                      <p className="monitoring-list__summary">
                        {state.data.reconciliation.assignedButNoEvidenceCount} active assignments with no
                        work evidence logged
                      </p>
                      {state.data.reconciliation.assignedButNoEvidenceCount > 0 ? (
                        <Link
                          className="button button--secondary"
                          style={{ fontSize: '12px', marginTop: '6px', padding: '2px 8px' }}
                          to="/work-evidence/new"
                        >
                          Log evidence
                        </Link>
                      ) : null}
                    </div>
                    <div className="monitoring-list__item">
                      <div className="monitoring-list__title" style={{ color: state.data.reconciliation.evidenceWithoutAssignmentCount > 0 ? '#ef4444' : undefined }}>
                        {state.data.reconciliation.evidenceWithoutAssignmentCount > 0 ? '✗ ' : ''}Evidence without assignment
                      </div>
                      <p className="monitoring-list__summary">
                        {state.data.reconciliation.evidenceWithoutAssignmentCount} evidence entries
                        without a matching active assignment
                      </p>
                      {state.data.reconciliation.evidenceWithoutAssignmentCount > 0 ? (
                        <Link
                          className="button button--secondary"
                          style={{ fontSize: '12px', marginTop: '6px', padding: '2px 8px' }}
                          to="/assignments/new"
                        >
                          Create assignment
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard id="inactive-evidence-projects" title="Inactive Evidence Projects">
                  {state.data.inactiveEvidenceProjects.length === 0 ? (
                    <EmptyState
                      description="All staffed active projects have recent evidence activity."
                      title="No inactive evidence projects"
                    />
                  ) : (
                    <div className="monitoring-list">
                      {state.data.inactiveEvidenceProjects.map((item) => (
                        <div className="monitoring-list__item" key={item.projectId}>
                          <div className="monitoring-list__title">
                            {item.projectCode} — {item.name}
                          </div>
                          <p className="monitoring-list__summary">
                            {item.activeAssignmentCount} active assignment
                            {item.activeAssignmentCount === 1 ? '' : 's'} ·{' '}
                            {item.lastEvidenceDate
                              ? `last evidence ${new Date(item.lastEvidenceDate).toLocaleDateString('en-US')}`
                              : 'no evidence on record'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </DashboardGrid>
            </>
          )}

          {/* Scorecard tab */}
          {activeTab === 'scorecard' && (
            state.data.portfolioHealth.length > 0 ? (
              <SectionCard title="Project Health Scorecard">
                <ProjectHealthScorecardTable
                  asOf={state.asOf}
                  healthScores={healthScores}
                  projects={state.data.portfolioHealth}
                />
              </SectionCard>
            ) : (
              <EmptyState
                description="No active projects found for this period."
                title="No scorecard data"
              />
            )
          )}
        </>
      ) : null}
    </PageContainer>
  );
}

interface ProjectHealthScorecardTableProps {
  asOf: string;
  healthScores: Map<string, ProjectHealthDto>;
  projects: ProjectHealthItem[];
}

function scoreIndicator(score: number): JSX.Element {
  const color = score >= 30 ? '#22c55e' : score >= 15 ? '#f59e0b' : '#ef4444';
  return (
    <span
      style={{
        background: color,
        borderRadius: 3,
        color: '#fff',
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        minWidth: 28,
        padding: '1px 6px',
        textAlign: 'center',
      }}
    >
      {score}
    </span>
  );
}

function ProjectHealthScorecardTable({
  asOf,
  healthScores,
  projects,
}: ProjectHealthScorecardTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Map<string, ProjectScorecardHistoryItem>>(new Map());

  useEffect(() => {
    if (!expandedId || historyMap.has(expandedId)) return;
    let active = true;
    void fetchScorecardHistory({ asOf, projectId: expandedId, weeks: 12 }).then((items) => {
      if (!active) return;
      const item = items.find((i) => i.projectId === expandedId);
      if (item) setHistoryMap((prev) => new Map(prev).set(expandedId, item));
    });
    return () => { active = false; };
  }, [expandedId, asOf, historyMap]);

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Health Score</th>
            <th>Staffing</th>
            <th>Evidence</th>
            <th>Timeline</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((item) => {
            const h = healthScores.get(item.projectId);
            const isExpanded = expandedId === item.projectId;
            const history = historyMap.get(item.projectId);
            return (
              <>
                <tr key={item.projectId}>
                  <td>
                    <Link to={`/projects/${item.projectId}/dashboard`}>
                      {item.projectCode} — {item.name}
                    </Link>
                  </td>
                  <td>
                    {h ? (
                      <ProjectHealthBadge grade={h.grade} score={h.score} size="sm" />
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    {h ? (
                      <Link style={{ textDecoration: 'none' }} to={`/assignments?projectId=${item.projectId}&status=active`}>
                        {scoreIndicator(h.staffingScore)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>
                    {h ? (
                      <Link style={{ textDecoration: 'none' }} to={`/work-evidence?projectId=${item.projectId}`}>
                        {scoreIndicator(h.evidenceScore)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>
                    {h ? (
                      <Link style={{ textDecoration: 'none' }} to={`/projects/${item.projectId}`}>
                        {scoreIndicator(h.timelineScore)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : item.projectId)}
                      style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: '11px', padding: '2px 8px' }}
                      type="button"
                    >
                      History {isExpanded ? '▴' : '▾'}
                    </button>
                    <Link className="button button--secondary" style={{ fontSize: '12px', padding: '2px 8px' }} to={`/projects/${item.projectId}/dashboard`}>
                      View
                    </Link>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr key={`${item.projectId}-history`}>
                    <td colSpan={6} style={{ background: '#f8fafc', padding: '12px 16px' }}>
                      {history ? (
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 6 }}>12-Week Health Trend</div>
                          <ResponsiveContainer height={120} width="100%">
                            <LineChart data={history.history} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                              <Tooltip formatter={(v: unknown) => [`${String(v)}%`, '']} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Line dataKey="staffingPct" dot={false} name="Staffing" stroke="#6366f1" strokeWidth={2} type="monotone" />
                              <Line dataKey="evidencePct" dot={false} name="Evidence" stroke="#22c55e" strokeWidth={2} type="monotone" />
                              <Line dataKey="timelinePct" dot={false} name="Timeline" stroke="#f59e0b" strokeWidth={2} type="monotone" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Loading history…</span>
                      )}
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StaffingGapsTable({ gaps }: { gaps: StaffingGapItem[] }): JSX.Element {
  return (
    <div className="data-table" data-testid="staffing-gaps-table">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Person ID</th>
            <th>End Date</th>
            <th>Days Until End</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap) => (
            <tr key={gap.assignmentId}>
              <td>{gap.projectCode} — {gap.projectName}</td>
              <td><Link to={`/people/${gap.personId}`}>{gap.personId.slice(0, 8)}…</Link></td>
              <td>{gap.endDate}</td>
              <td>
                <span style={{
                  color: gap.daysUntilEnd <= 7 ? '#ef4444' : gap.daysUntilEnd <= 14 ? '#f59e0b' : '#22c55e',
                  fontWeight: 600,
                }}>
                  {gap.daysUntilEnd}d
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpenRequestsByProjectTable({ rows }: { rows: OpenRequestsByProjectItem[] }): JSX.Element {
  return (
    <div className="data-table" data-testid="open-requests-by-project-table">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Open Requests</th>
            <th>Headcount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId}>
              <td>{row.projectCode} — {row.projectName}</td>
              <td>{row.openRequestCount}</td>
              <td>{row.totalHeadcountFulfilled}/{row.totalHeadcountRequired}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BurnRateTrendChart({ data }: { data: BurnRateTrendPoint[] }): JSX.Element {
  return (
    <div data-testid="burn-rate-trend-chart" style={{ height: 240 }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ bottom: 0, left: 0, right: 16, top: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" style={{ fontSize: 11 }} tick={{ fontSize: 11 }} />
          <YAxis style={{ fontSize: 11 }} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line
            dataKey="evidenceCount"
            dot={false}
            name="Evidence entries"
            stroke="#6366f1"
            strokeWidth={2}
            type="monotone"
          />
          <Line
            dataKey="projectCount"
            dot={false}
            name="Active projects"
            stroke="#22c55e"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PortfolioHealthRowProps {
  item: ProjectHealthItem;
}

function PortfolioHealthRow({ item }: PortfolioHealthRowProps): JSX.Element {
  const hasAnomalies = item.anomalyFlags.length > 0;

  return (
    <div className="monitoring-list__item">
      <div className="monitoring-list__title">
        <Link style={{ color: 'inherit', textDecoration: 'none' }} to={`/projects/${item.projectId}/dashboard`}>
          {item.projectCode} — {item.name}
        </Link>
        {hasAnomalies ? (
          <span
            style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '4px',
              color: '#92400e',
              fontSize: '11px',
              fontWeight: 600,
              marginLeft: '8px',
              padding: '1px 6px',
            }}
          >
            {item.anomalyFlags.length} flag{item.anomalyFlags.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
      <p className="monitoring-list__summary">
        {item.staffingCount} staff · {item.evidenceCount} evidence entries · {item.status}
        {hasAnomalies ? ` · ${item.anomalyFlags.join(', ')}` : ''}
      </p>
    </div>
  );
}
