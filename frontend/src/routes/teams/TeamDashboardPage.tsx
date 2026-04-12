import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useTeamDashboard } from '@/features/teams/useTeamDashboard';

export function TeamDashboardPage(): JSX.Element {
  const { id } = useParams();
  const state = useTeamDashboard(id);

  return (
    <PageContainer testId="team-dashboard-page">
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: '/teams', label: 'Teams' },
          { label: state.data?.team.name ?? 'Team Dashboard' },
        ]}
      />
      <PageHeader
        actions={
          id ? (
            <>
              <Link className="button button--secondary" to="/teams">
                Back to teams
              </Link>
              <Link className="button button--secondary" to="/assignments">
                Open assignments
              </Link>
            </>
          ) : null
        }
        eyebrow="Teams"
        subtitle="Operational view of team capacity, active delivery involvement, and members needing staffing attention. Teams remain separate from org units."
        title={state.data?.team.name ?? 'Team Dashboard'}
      />

      {state.isLoading ? <LoadingState label="Loading team dashboard..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No team dashboard was found for ${id ?? 'the requested team'}.`}
            title="Team not found"
          />
        </SectionCard>
      ) : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <SummaryCard label="Team Members" value={String(state.data.teamMemberCount)} />
            <SummaryCard
              label="Active Assignments"
              value={String(state.data.activeAssignmentsCount)}
            />
            <SummaryCard label="Projects Involved" value={String(state.data.projectCount)} />
            <SummaryCard
              label="People Without Assignments"
              value={String(state.data.peopleWithNoAssignments.length)}
            />
            <SummaryCard
              label="Evidence Alignment Gaps"
              value={String(state.data.peopleWithEvidenceAlignmentGaps.length)}
            />
            <SummaryCard
              label="Cross-Project Members"
              value={String(state.data.crossProjectSpread.membersOnMultipleProjectsCount)}
            />
            <SummaryCard
              label="Open Team Exceptions"
              value={String(state.data.anomalySummary.openExceptionCount)}
            />
          </div>

          <div className="details-grid">
            <SectionCard title="Team Summary">
              <dl className="details-list">
                <div>
                  <dt>Team</dt>
                  <dd>{state.data.team.name}</dd>
                </div>
                <div>
                  <dt>Code</dt>
                  <dd>{state.data.team.code}</dd>
                </div>
                <div>
                  <dt>Linked Org Unit</dt>
                  <dd>{state.data.team.orgUnit?.name ?? 'Not linked'}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{state.data.team.description ?? 'No description available'}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Operational Shortcuts">
              <div className="details-list">
                <div>
                  <dt>Team management</dt>
                  <dd>
                    <Link className="button button--secondary" to="/teams">
                      Open team membership management
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>People view</dt>
                  <dd>
                    <Link className="button button--secondary" to="/people">
                      Open people directory
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Projects view</dt>
                  <dd>
                    <Link className="button button--secondary" to="/projects">
                      Open project registry
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Exception queue</dt>
                  <dd>
                    <Link className="button button--secondary" to="/exceptions">
                      Review exceptions
                    </Link>
                  </dd>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Anomaly Summary">
              <div className="details-list">
                <div>
                  <dt>Open team exceptions</dt>
                  <dd>{state.data.anomalySummary.openExceptionCount}</dd>
                </div>
                <div>
                  <dt>Assignments without evidence</dt>
                  <dd>{state.data.anomalySummary.assignmentWithoutEvidenceCount}</dd>
                </div>
                <div>
                  <dt>Evidence without assignment</dt>
                  <dd>{state.data.anomalySummary.evidenceWithoutAssignmentCount}</dd>
                </div>
                <div>
                  <dt>Evidence after assignment end</dt>
                  <dd>{state.data.anomalySummary.evidenceAfterAssignmentEndCount}</dd>
                </div>
                <div>
                  <dt>Stale approvals</dt>
                  <dd>{state.data.anomalySummary.staleApprovalCount}</dd>
                </div>
                <div>
                  <dt>Project closure conflicts</dt>
                  <dd>{state.data.anomalySummary.projectClosureConflictCount}</dd>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Cross-Project Spread">
              {state.data.crossProjectSpread.membersOnMultipleProjects.length === 0 ? (
                <EmptyState
                  description="No team members currently appear staffed across multiple active projects."
                  title="No cross-project spread"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.crossProjectSpread.membersOnMultipleProjects.map((person) => (
                    <div className="monitoring-list__item" key={person.id}>
                      <div className="monitoring-card__header">
                        <div>
                          <div className="monitoring-list__title">{person.displayName}</div>
                          <p className="monitoring-list__summary">
                            Active projects: {person.activeProjectCount}
                          </p>
                        </div>
                        <Link className="button button--secondary" to={`/people/${person.id}`}>
                          Open person
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Projects Involved">
              {state.data.projectsInvolved.length === 0 ? (
                <EmptyState
                  description="No active project involvement is currently recorded for this team."
                  title="No projects involved"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.projectsInvolved.map((project) => (
                    <div className="monitoring-list__item" key={project.id}>
                      <div className="monitoring-card__header">
                        <div className="monitoring-list__title">{project.name}</div>
                        <Link className="button button--secondary" to={`/projects/${project.id}`}>
                          Open project
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="People With No Assignments">
              {state.data.peopleWithNoAssignments.length === 0 ? (
                <EmptyState
                  description="Everyone in this team currently has at least one assignment."
                  title="No unassigned people"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.peopleWithNoAssignments.map((person) => (
                    <div className="monitoring-list__item" key={person.id}>
                      <div className="monitoring-card__header">
                        <div>
                          <div className="monitoring-list__title">{person.displayName}</div>
                          <p className="monitoring-list__summary">
                            {person.currentOrgUnitName ?? 'No org unit'} |{' '}
                            {person.primaryEmail ?? 'No email'}
                          </p>
                        </div>
                        <Link className="button button--secondary" to={`/people/${person.id}`}>
                          Open person
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Evidence Alignment Gaps">
              {state.data.peopleWithEvidenceAlignmentGaps.length === 0 ? (
                <EmptyState
                  description="No team members currently show evidence-alignment anomalies."
                  title="No evidence alignment gaps"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.peopleWithEvidenceAlignmentGaps.map((person) => (
                    <div className="monitoring-list__item monitoring-list__item--error" key={person.id}>
                      <div className="monitoring-card__header">
                        <div>
                          <div className="monitoring-list__title">{person.displayName}</div>
                          <p className="monitoring-list__summary">
                            {person.currentOrgUnitName ?? 'No org unit'} |{' '}
                            {person.primaryEmail ?? 'No email'}
                          </p>
                        </div>
                        <div className="button-stack">
                          <Link className="button button--secondary" to={`/people/${person.id}`}>
                            Open person
                          </Link>
                          <Link className="button button--secondary" to="/exceptions">
                            Review exceptions
                          </Link>
                        </div>
                      </div>
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

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps): JSX.Element {
  return (
    <SectionCard>
      <div className="metric-card">
        <div className="metric-card__value metric-card__value--compact">{value}</div>
        <div className="metric-card__label">{label}</div>
      </div>
    </SectionCard>
  );
}
