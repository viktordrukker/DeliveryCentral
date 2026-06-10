import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ManagerScopeSection } from '@/components/organization/ManagerScopeSection';
import { useManagerScope } from '@/features/organization/useManagerScope';
import { Link, useParams } from 'react-router-dom';

export function ManagerScopePage(): JSX.Element {
  const { id } = useParams();
  const state = useManagerScope(id);

  return (
    <PageContainer testId="manager-scope-page">
      <PageHeader
        eyebrow="Organization"
        subtitle="Manager-scoped visibility is a read model for planning and review. It does not imply approval authority unless policy later says so."
        title={state.manager ? `${state.manager.displayName} Scope` : 'Manager Scope'}
      />

      {state.isLoading ? <LoadingState label="Loading manager scope..." variant="skeleton" skeletonType="chart" /> : null}
      {state.managerNotFound ? (
        <SectionCard>
          <EmptyState
            description={`No manager scope was found for ${id ?? 'the requested manager id'}.`}
            title="Manager scope not found"
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.manager && state.data ? (
        <>
          <div className="kpi-strip" data-testid="manager-scope-kpi-strip">
            <SummaryCard
              href={`/people/${state.manager.publicId ?? state.manager.id}`}
              label="Manager"
              testId="manager-scope-kpi-manager"
              value={state.manager.displayName}
            />
            <SummaryCard
              href="/org"
              label="Org Unit"
              testId="manager-scope-kpi-orgunit"
              value={state.manager.currentOrgUnit?.name ?? 'Not assigned'}
            />
            <SummaryCard
              href="#direct-reports"
              label="Direct Reports"
              testId="manager-scope-kpi-direct"
              value={String(state.data.totalDirectReports)}
            />
            <SummaryCard
              href="#dotted-line"
              label="Dotted-Line People"
              testId="manager-scope-kpi-dotted"
              value={String(state.data.totalDottedLinePeople)}
            />
          </div>

          <SectionCard title="Manager Summary">
            <dl className="details-list">
              <div>
                <dt>Name</dt>
                <dd>{state.manager.displayName}</dd>
              </div>
              <div>
                <dt>Org Unit</dt>
                <dd>{state.manager.currentOrgUnit?.name ?? 'Not assigned'}</dd>
              </div>
              <div>
                <dt>Current Position Count</dt>
                <dd>{state.manager.currentAssignmentCount}</dd>
              </div>
              <div>
                <dt>Current Line Manager</dt>
                <dd>{state.manager.currentLineManager?.displayName ?? 'No line manager'}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Scope Overview">
            <div id="direct-reports">
              <ManagerScopeSection
                emptyDescription="This manager has no current solid-line reports in the current scope view."
                items={state.data.directReports}
                title="Direct Reports"
              />
            </div>
            <div id="dotted-line">
              <ManagerScopeSection
                emptyDescription="No dotted-line related people are available in the current scope view."
                items={state.data.dottedLinePeople}
                title="Dotted-Line Visibility"
              />
            </div>
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}

interface SummaryCardProps {
  href: string;
  label: string;
  testId?: string;
  value: string;
}

function SummaryCard({ href, label, testId, value }: SummaryCardProps): JSX.Element {
  const isAnchor = href.startsWith('#');
  const content = (
    <div className="metric-card">
      <div className="metric-card__value metric-card__value--compact">{value}</div>
      <div className="metric-card__label">{label}</div>
    </div>
  );
  if (isAnchor) {
    return (
      <a
        className="kpi-strip__item"
        data-testid={testId}
        href={href}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {content}
      </a>
    );
  }
  return (
    <Link
      className="kpi-strip__item"
      data-testid={testId}
      style={{ textDecoration: 'none', color: 'inherit' }}
      to={href}
    >
      {content}
    </Link>
  );
}
