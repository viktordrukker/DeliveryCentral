import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTitleBarActions } from '@/app/title-bar-context';
import { CaseListTable } from '@/components/cases/CaseListTable';
import { PersonSelect } from '@/components/common/PersonSelect';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipTrigger } from '@/components/common/TipBalloon';
import { ExportButton } from '@/components/common/ExportButton';
import { useCasesList } from '@/features/cases/useCasesList';

export function CasesPage(): JSX.Element {
  const navigate = useNavigate();
  const { setActions } = useTitleBarActions();
  const state = useCasesList();

  useEffect(() => {
    setActions(
      <>
        <ExportButton
          data={state.data}
          columns={[
            { key: 'caseNumber', label: 'Case #' },
            { key: 'caseTypeDisplayName', label: 'Type' },
            { key: 'subjectPersonName', label: 'Subject' },
            { key: 'ownerPersonName', label: 'Owner' },
            { key: 'status', label: 'Status' },
            { key: 'summary', label: 'Summary' },
            { key: 'openedAt', label: 'Opened' },
            { key: 'closedAt', label: 'Closed' },
          ]}
          filename="cases"
        />
        <button className="button" onClick={() => navigate('/cases/new')} type="button">
          Create case
        </button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, navigate, state.data]);

  return (
    <PageContainer testId="cases-page" viewport>

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
    </PageContainer>
  );
}
