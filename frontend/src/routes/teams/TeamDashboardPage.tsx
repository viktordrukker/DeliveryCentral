import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useDrilldown } from '@/app/drilldown-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { useTeamDashboard } from '@/features/teams/useTeamDashboard';
import { Button, DescriptionList, Table, type Column } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

export function TeamDashboardPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useTeamDashboard(id);
  const d = state.data;
  const { setCurrentLabel } = useDrilldown();

  useEffect(() => {
    if (d?.team.name) setCurrentLabel(d.team.name);
  }, [d?.team.name, setCurrentLabel]);

  return (
    <PageContainer testId="team-dashboard-page">
      <PageHeader
        actions={
          id ? (
            <>
              <Button as={Link} variant="secondary" size="sm" to="/teams">Back to teams</Button>
              <Button as={Link} variant="secondary" size="sm" to="/assignments">Assignments</Button>
            </>
          ) : null
        }
        eyebrow="Teams"
        subtitle="Operational view of team capacity, active delivery involvement, and members needing attention."
        title={d?.team.name ?? 'Team Dashboard'}
      />

      {state.isLoading ? <LoadingState label="Loading team dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.notFound ? (
        <SectionCard><EmptyState description={`No team dashboard was found for ${id ?? 'the requested team'}.`} title="Team not found" /></SectionCard>
      ) : null}

      {d ? (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/people" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <span className="kpi-strip__value">{d.teamMemberCount}</span>
              <span className="kpi-strip__label">Members</span>
            </Link>

            <Link className="kpi-strip__item" to="/assignments" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <span className="kpi-strip__value">{d.activeAssignmentsCount}</span>
              <span className="kpi-strip__label">Active Assignments</span>
            </Link>

            <Link className="kpi-strip__item" to="/projects" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <span className="kpi-strip__value">{d.projectCount}</span>
              <span className="kpi-strip__label">Projects</span>
            </Link>

            <Link className="kpi-strip__item" to="/people?status=unassigned"
              style={{ borderLeft: `3px solid ${d.peopleWithNoAssignments.length > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Team members without any active assignment." arrow="left" />
              <span className="kpi-strip__value">{d.peopleWithNoAssignments.length}</span>
              <span className="kpi-strip__label">Unassigned</span>
            </Link>

            <Link className="kpi-strip__item" to="/exceptions"
              style={{ borderLeft: `3px solid ${d.anomalySummary.openExceptionCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{d.anomalySummary.openExceptionCount}</span>
              <span className="kpi-strip__label">Exceptions</span>
            </Link>
          </div>

          {/* ── Team Summary ── */}
          <SectionCard title="Team Summary" collapsible>
            <DescriptionList items={[
              { label: 'Team', value: d.team.name },
              { label: 'Code', value: d.team.code },
              { label: 'Linked Org Unit', value: d.team.orgUnit?.name ?? 'Not linked' },
              { label: 'Description', value: <span style={{ color: 'var(--color-text-muted)' }}>{d.team.description ?? 'No description available'}</span> },
            ]} />
          </SectionCard>

          {/* ── Anomaly Summary ── */}
          <SectionCard title="Anomaly Summary" collapsible>
            <Table
              variant="compact"
              columns={[
                { key: 'label', title: 'Anomaly Type', getValue: (r) => r.label, render: (r) => r.label },
                { key: 'count', title: 'Count', align: 'right', getValue: (r) => r.count, render: (r) => <span style={{ ...NUM, fontWeight: 600, color: r.color }}>{r.count}</span> },
              ] as Column<{ label: string; count: number; color: string }>[]}
              rows={[
                { label: 'Open exceptions', count: d.anomalySummary.openExceptionCount, color: d.anomalySummary.openExceptionCount > 0 ? 'var(--color-status-danger)' : 'inherit' },
                { label: 'Stale approvals', count: d.anomalySummary.staleApprovalCount, color: d.anomalySummary.staleApprovalCount > 0 ? 'var(--color-status-warning)' : 'inherit' },
                { label: 'Project closure conflicts', count: d.anomalySummary.projectClosureConflictCount, color: d.anomalySummary.projectClosureConflictCount > 0 ? 'var(--color-status-danger)' : 'inherit' },
              ]}
              getRowKey={(r) => r.label}
            />
          </SectionCard>

          {/* ── Projects & Cross-Project ── */}
          <div className="dashboard-main-grid">
            <SectionCard title="Projects Involved" collapsible>
              {d.projectsInvolved.length === 0 ? (
                <EmptyState description="No active project involvement recorded." title="No projects" />
              ) : (
                <Table
                  variant="compact"
                  columns={[
                    { key: 'name', title: 'Project', getValue: (p) => p.name, render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
                    { key: 'go', title: '', width: 40, render: (p) => <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
                  ] as Column<typeof d.projectsInvolved[number]>[]}
                  rows={d.projectsInvolved}
                  getRowKey={(p) => p.id}
                  onRowClick={(p) => navigate(`/projects/${p.id}`)}
                />
              )}
            </SectionCard>

            <SectionCard title={`Cross-Project Members (${d.crossProjectSpread.membersOnMultipleProjectsCount})`} collapsible>
              {d.crossProjectSpread.membersOnMultipleProjects.length === 0 ? (
                <EmptyState description="No team members staffed across multiple active projects." title="No cross-project spread" />
              ) : (
                <Table
                  variant="compact"
                  columns={[
                    { key: 'person', title: 'Person', getValue: (p) => p.displayName, render: (p) => <span style={{ fontWeight: 500 }}>{p.displayName}</span> },
                    { key: 'projects', title: 'Projects', align: 'right', getValue: (p) => p.activeProjectCount, render: (p) => <span style={NUM}>{p.activeProjectCount}</span> },
                    { key: 'go', title: '', width: 40, render: (p) => <Link to={`/people/${p.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
                  ] as Column<typeof d.crossProjectSpread.membersOnMultipleProjects[number]>[]}
                  rows={d.crossProjectSpread.membersOnMultipleProjects}
                  getRowKey={(p) => p.id}
                  onRowClick={(p) => navigate(`/people/${p.id}`)}
                />
              )}
            </SectionCard>
          </div>

          {/* ── Unassigned People ── */}
          <SectionCard id="unassigned" title={`People With No Assignments (${d.peopleWithNoAssignments.length})`} collapsible>
            {d.peopleWithNoAssignments.length === 0 ? (
              <EmptyState description="Everyone in this team currently has at least one assignment." title="No unassigned people" />
            ) : (
              <Table
                variant="compact"
                columns={[
                  { key: 'person', title: 'Person', getValue: (p) => p.displayName, render: (p) => <span style={{ fontWeight: 500 }}>{p.displayName}</span> },
                  { key: 'orgUnit', title: 'Org Unit', getValue: (p) => p.currentOrgUnitName ?? '\u2014', render: (p) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.currentOrgUnitName ?? '\u2014'}</span> },
                  { key: 'email', title: 'Email', getValue: (p) => p.primaryEmail ?? '\u2014', render: (p) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.primaryEmail ?? '\u2014'}</span> },
                  { key: 'go', title: '', width: 40, render: (p) => <Link to={`/people/${p.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
                ] as Column<typeof d.peopleWithNoAssignments[number]>[]}
                rows={d.peopleWithNoAssignments}
                getRowKey={(p) => p.id}
                onRowClick={(p) => navigate(`/people/${p.id}`)}
              />
            )}
          </SectionCard>

        </>
      ) : null}
    </PageContainer>
  );
}
