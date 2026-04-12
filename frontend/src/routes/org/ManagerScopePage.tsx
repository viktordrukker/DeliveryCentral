import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ManagerScopeSection } from '@/components/organization/ManagerScopeSection';
import { useManagerScope } from '@/features/organization/useManagerScope';
import { useParams } from 'react-router-dom';

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

      {state.isLoading ? <LoadingState label="Loading manager scope..." /> : null}
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
          <div className="details-summary-grid">
            <SummaryCard label="Manager" value={state.manager.displayName} />
            <SummaryCard
              label="Org Unit"
              value={state.manager.currentOrgUnit?.name ?? 'Not assigned'}
            />
            <SummaryCard
              label="Direct Reports"
              value={String(state.data.totalDirectReports)}
            />
            <SummaryCard
              label="Dotted-Line People"
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
                <dt>Current Assignment Count</dt>
                <dd>{state.manager.currentAssignmentCount}</dd>
              </div>
              <div>
                <dt>Current Line Manager</dt>
                <dd>{state.manager.currentLineManager?.displayName ?? 'No line manager'}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Scope Overview">
            <ManagerScopeSection
              emptyDescription="This manager has no current solid-line reports in the current scope view."
              items={state.data.directReports}
              title="Direct Reports"
            />
            <ManagerScopeSection
              emptyDescription="No dotted-line related people are available in the current scope view."
              items={state.data.dottedLinePeople}
              title="Dotted-Line Visibility"
            />
          </SectionCard>
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
