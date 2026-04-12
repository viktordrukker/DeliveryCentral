import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { AnomalyPanel } from '@/components/projects/AnomalyPanel';
import { EvidenceSummary } from '@/components/projects/EvidenceSummary';
import { ProjectSummaryCard } from '@/components/projects/ProjectSummaryCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useProjectDashboard } from '@/features/projects/useProjectDashboard';

export function ProjectDashboardPage(): JSX.Element {
  const { id } = useParams();
  const state = useProjectDashboard(id);

  return (
    <PageContainer testId="project-dashboard-page">
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: '/projects', label: 'Projects' },
          { href: `/projects/${id ?? ''}`, label: state.data?.project.name ?? 'Project' },
          { label: 'Dashboard' },
        ]}
      />
      <PageHeader
        actions={
          <Link className="button button--secondary" to={`/projects/${id ?? ''}`}>
            Back to project
          </Link>
        }
        eyebrow="Projects"
        subtitle="Project-level staffing, evidence, workload, and comparison signals in one operational dashboard."
        title={state.data?.project.name ?? 'Project Dashboard'}
      />

      {state.isLoading ? <LoadingState label="Loading project dashboard..." /> : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No project was found for ${id ?? 'the requested id'}.`}
            title="Project not found"
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="details-summary-grid">
            <ProjectSummaryCard label="Project" value={state.data.project.name} />
            <ProjectSummaryCard label="Status" value={state.data.project.status} />
            <ProjectSummaryCard
              label="Active Staff"
              value={String(state.data.dashboard.staffingSummary.activeAssignmentCount)}
            />
            <ProjectSummaryCard
              label="Evidence Hours (30d)"
              value={`${state.data.dashboard.staffingSummary.totalEvidenceHoursLast30d}h`}
            />
          </div>

          <div className="details-grid">
            <SectionCard title="Project Summary">
              <dl className="details-list">
                <div>
                  <dt>Name</dt>
                  <dd>{state.data.project.name}</dd>
                </div>
                <div>
                  <dt>Project Code</dt>
                  <dd>{state.data.project.projectCode}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{state.data.project.status}</dd>
                </div>
                <div>
                  <dt>Starts</dt>
                  <dd>
                    {state.data.dashboard.project.startsOn
                      ? new Date(state.data.dashboard.project.startsOn).toLocaleDateString('en-US')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>
                    {state.data.dashboard.project.endsOn
                      ? new Date(state.data.dashboard.project.endsOn).toLocaleDateString('en-US')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{state.data.project.description ?? 'No description available'}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Assigned People">
              {state.data.dashboard.assignments.length === 0 ? (
                <EmptyState
                  description="No assignments found for this project."
                  title="No assignments"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.dashboard.assignments.map((a) => (
                    <div className="monitoring-list__item" key={a.id}>
                      <div className="monitoring-list__title">{a.personDisplayName}</div>
                      <p className="monitoring-list__summary">
                        {a.staffingRole} · {a.allocationPercent}% · {a.status} ·{' '}
                        {new Date(a.validFrom).toLocaleDateString('en-US')} –{' '}
                        {a.validTo ? new Date(a.validTo).toLocaleDateString('en-US') : 'open-ended'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Evidence by Week (last 12 weeks)">
              {state.data.dashboard.evidenceByWeek.every((w) => w.totalHours === 0) ? (
                <EmptyState
                  description="No work evidence recorded in the last 12 weeks."
                  title="No evidence data"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.dashboard.evidenceByWeek
                    .filter((w) => w.totalHours > 0)
                    .map((week) => (
                      <div className="monitoring-list__item" key={week.weekStarting}>
                        <div className="monitoring-list__title">
                          Week of {new Date(week.weekStarting).toLocaleDateString('en-US')}
                        </div>
                        <p className="monitoring-list__summary">{week.totalHours}h logged</p>
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Allocation by Person">
              {state.data.dashboard.allocationByPerson.length === 0 ? (
                <EmptyState
                  description="No active allocations found for this project."
                  title="No allocations"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.dashboard.allocationByPerson.map((item) => (
                    <div className="monitoring-list__item" key={item.personId}>
                      <div className="monitoring-list__title">{item.displayName}</div>
                      <p className="monitoring-list__summary">{item.allocationPercent}% allocated</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Evidence Summary">
              <EvidenceSummary items={state.data.workEvidence} />
            </SectionCard>
          </div>

          <SectionCard title="Comparison Overview">
            {state.data.comparison.matchedRecords.length === 0 &&
            state.data.comparison.assignedButNoEvidence.length === 0 &&
            state.data.comparison.evidenceButNoApprovedAssignment.length === 0 ? (
              <EmptyState
                description="No comparison records are currently available for this project."
                title="No comparison data"
              />
            ) : (
              <div className="stats-grid">
                <ProjectSummaryCard
                  label="Matched Records"
                  value={String(state.data.comparison.matchedRecords.length)}
                />
                <ProjectSummaryCard
                  label="Assigned, No Evidence"
                  value={String(state.data.comparison.assignedButNoEvidence.length)}
                />
                <ProjectSummaryCard
                  label="Evidence, No Approved Match"
                  value={String(
                    state.data.comparison.evidenceButNoApprovedAssignment.length,
                  )}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Anomalies">
            <AnomalyPanel items={state.data.anomalies} />
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
