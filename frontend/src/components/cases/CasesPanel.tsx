import { useNavigate } from 'react-router-dom';

import { CaseListTable } from '@/components/cases/CaseListTable';
import { PersonSelect } from '@/components/common/PersonSelect';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { useCasesList } from '@/features/cases/useCasesList';

/**
 * V2-A.8 — extracted from `CasesPage` so the HR Directory 3-tab shell
 * (Directory / Bench / HR Queue) can mount the cases content inline
 * without colliding with the parent page's title-bar actions.
 *
 * `CasesPage` remains the standalone `/cases` route — it composes the
 * title-bar actions + this panel.
 */
export function CasesPanel(): JSX.Element {
  const navigate = useNavigate();
  const state = useCasesList();

  return (
    <>
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
        {state.isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {state.error ? <ErrorState description={state.error} onRetry={() => void state.reload()} /> : null}

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
    </>
  );
}
