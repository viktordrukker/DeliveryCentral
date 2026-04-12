import { useNavigate } from 'react-router-dom';

import { CaseListTable } from '@/components/cases/CaseListTable';
import { PersonSelect } from '@/components/common/PersonSelect';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { TableSkeleton } from '@/components/common/Skeleton';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useCasesList } from '@/features/cases/useCasesList';

export function CasesPage(): JSX.Element {
  const navigate = useNavigate();
  const state = useCasesList();

  return (
    <PageContainer testId="cases-page" viewport>
      <PageHeader
        actions={
          <button className="button" onClick={() => navigate('/cases/new')} type="button">
            Create case
          </button>
        }
        eyebrow="Cases"
        subtitle="Track onboarding and governance workflows without collapsing them into assignment lifecycle."
        title="Cases"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Case Type</span>
          <input
            className="field__control"
            onChange={(event) => state.handleFilterChange('caseTypeKey', event.target.value)}
            placeholder="Example: ONBOARDING"
            type="text"
            value={state.filters.caseTypeKey}
          />
        </label>

        <PersonSelect
          label="Owner Person"
          onChange={(value) => state.handleFilterChange('ownerPersonId', value)}
          value={state.filters.ownerPersonId}
        />

        <PersonSelect
          label="Subject Person"
          onChange={(value) => state.handleFilterChange('subjectPersonId', value)}
          value={state.filters.subjectPersonId}
        />
      </FilterBar>

      <SectionCard title="Case List">
        {state.isLoading ? <TableSkeleton cols={4} rows={6} /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          state.data.length === 0 ? (
            <EmptyState
              action={{ href: '/cases/new', label: 'Create Case' }}
              description="No cases are available for the current filters."
              title="No cases open"
            />
          ) : (
            <CaseListTable items={state.data} onRowClick={(item) => navigate(`/cases/${item.id}`)} />
          )
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
