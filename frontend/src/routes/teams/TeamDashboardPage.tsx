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
              <Link className="button button--secondary button--sm" to="/teams">Back to teams</Link>
              <Link className="button button--secondary button--sm" to="/assignments">Assignments</Link>
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

            <Link className="kpi-strip__item" to="#unassigned"
              style={{ borderLeft: `3px solid ${d.peopleWithNoAssignments.length > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Team members without any active assignment." arrow="left" />
              <span className="kpi-strip__value">{d.peopleWithNoAssignments.length}</span>
              <span className="kpi-strip__label">Unassigned</span>
            </Link>

            <Link className="kpi-strip__item" to="#evidence-gaps"
              style={{ borderLeft: `3px solid ${d.peopleWithEvidenceAlignmentGaps.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Members with evidence-assignment mismatches." arrow="left" />
              <span className="kpi-strip__value">{d.peopleWithEvidenceAlignmentGaps.length}</span>
              <span className="kpi-strip__label">Evidence Gaps</span>
            </Link>

            <Link className="kpi-strip__item" to="/exceptions"
              style={{ borderLeft: `3px solid ${d.anomalySummary.openExceptionCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{d.anomalySummary.openExceptionCount}</span>
              <span className="kpi-strip__label">Exceptions</span>
            </Link>
          </div>

          {/* ── Team Summary ── */}
          <SectionCard title="Team Summary" collapsible>
            <table className="dash-compact-table">
              <tbody>
                <tr><td style={{ fontWeight: 500, width: 140 }}>Team</td><td>{d.team.name}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Code</td><td>{d.team.code}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Linked Org Unit</td><td>{d.team.orgUnit?.name ?? 'Not linked'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Description</td><td style={{ color: 'var(--color-text-muted)' }}>{d.team.description ?? 'No description available'}</td></tr>
              </tbody>
            </table>
          </SectionCard>

          {/* ── Anomaly Summary ── */}
          <SectionCard title="Anomaly Summary" collapsible>
            <table className="dash-compact-table">
              <thead>
                <tr><th>Anomaly Type</th><th style={NUM}>Count</th></tr>
              </thead>
              <tbody>
                {[
                  { label: 'Open exceptions', count: d.anomalySummary.openExceptionCount, color: d.anomalySummary.openExceptionCount > 0 ? 'var(--color-status-danger)' : 'inherit' },
                  { label: 'Assignments without evidence', count: d.anomalySummary.assignmentWithoutEvidenceCount, color: d.anomalySummary.assignmentWithoutEvidenceCount > 0 ? 'var(--color-status-warning)' : 'inherit' },
                  { label: 'Evidence without assignment', count: d.anomalySummary.evidenceWithoutAssignmentCount, color: d.anomalySummary.evidenceWithoutAssignmentCount > 0 ? 'var(--color-status-danger)' : 'inherit' },
                  { label: 'Evidence after assignment end', count: d.anomalySummary.evidenceAfterAssignmentEndCount, color: d.anomalySummary.evidenceAfterAssignmentEndCount > 0 ? 'var(--color-status-warning)' : 'inherit' },
                  { label: 'Stale approvals', count: d.anomalySummary.staleApprovalCount, color: d.anomalySummary.staleApprovalCount > 0 ? 'var(--color-status-warning)' : 'inherit' },
                  { label: 'Project closure conflicts', count: d.anomalySummary.projectClosureConflictCount, color: d.anomalySummary.projectClosureConflictCount > 0 ? 'var(--color-status-danger)' : 'inherit' },
                ].map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td style={{ ...NUM, fontWeight: 600, color: row.color }}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          {/* ── Projects & Cross-Project ── */}
          <div className="dashboard-main-grid">
            <SectionCard title="Projects Involved" collapsible>
              {d.projectsInvolved.length === 0 ? (
                <EmptyState description="No active project involvement recorded." title="No projects" />
              ) : (
                <table className="dash-compact-table">
                  <thead><tr><th>Project</th><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {d.projectsInvolved.map((p) => (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td><Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title={`Cross-Project Members (${d.crossProjectSpread.membersOnMultipleProjectsCount})`} collapsible>
              {d.crossProjectSpread.membersOnMultipleProjects.length === 0 ? (
                <EmptyState description="No team members staffed across multiple active projects." title="No cross-project spread" />
              ) : (
                <table className="dash-compact-table">
                  <thead><tr><th>Person</th><th style={NUM}>Projects</th><th style={{ width: 40 }}></th></tr></thead>
                  <tbody>
                    {d.crossProjectSpread.membersOnMultipleProjects.map((person) => (
                      <tr key={person.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${person.id}`)}>
                        <td style={{ fontWeight: 500 }}>{person.displayName}</td>
                        <td style={NUM}>{person.activeProjectCount}</td>
                        <td><Link to={`/people/${person.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>

          {/* ── Unassigned People ── */}
          <SectionCard id="unassigned" title={`People With No Assignments (${d.peopleWithNoAssignments.length})`} collapsible>
            {d.peopleWithNoAssignments.length === 0 ? (
              <EmptyState description="Everyone in this team currently has at least one assignment." title="No unassigned people" />
            ) : (
              <table className="dash-compact-table">
                <thead><tr><th>Person</th><th>Org Unit</th><th>Email</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {d.peopleWithNoAssignments.map((person) => (
                    <tr key={person.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${person.id}`)}>
                      <td style={{ fontWeight: 500 }}>{person.displayName}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{person.currentOrgUnitName ?? '\u2014'}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{person.primaryEmail ?? '\u2014'}</td>
                      <td><Link to={`/people/${person.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* ── Evidence Alignment Gaps ── */}
          <SectionCard id="evidence-gaps" title={`Evidence Alignment Gaps (${d.peopleWithEvidenceAlignmentGaps.length})`} collapsible>
            {d.peopleWithEvidenceAlignmentGaps.length === 0 ? (
              <EmptyState description="No team members currently show evidence-alignment anomalies." title="No evidence gaps" />
            ) : (
              <table className="dash-compact-table">
                <thead><tr><th>Person</th><th>Org Unit</th><th>Email</th><th style={{ width: 80 }}></th></tr></thead>
                <tbody>
                  {d.peopleWithEvidenceAlignmentGaps.map((person) => (
                    <tr key={person.id} style={{ borderLeft: '3px solid var(--color-status-danger)' }}>
                      <td style={{ fontWeight: 500, color: 'var(--color-status-danger)' }}>{person.displayName}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{person.currentOrgUnitName ?? '\u2014'}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{person.primaryEmail ?? '\u2014'}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <Link to={`/people/${person.id}`} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Person</Link>
                        <Link to="/exceptions" style={{ fontSize: 10, color: 'var(--color-accent)' }}>Exceptions</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
