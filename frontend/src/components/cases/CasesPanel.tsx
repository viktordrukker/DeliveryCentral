import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CaseInspector } from '@/components/cases/CaseInspector';
import { CaseListTable } from '@/components/cases/CaseListTable';
import { PersonSelect } from '@/components/common/PersonSelect';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { useCasesList } from '@/features/cases/useCasesList';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * V2-A.8 — extracted from `CasesPage` so the HR Directory 3-tab shell
 * (Directory / Bench / HR Queue) can mount the cases content inline
 * without colliding with the parent page's title-bar actions.
 *
 * SCOPED-MIN-2 — when `dsRefresh` is ON, the table renders inside a
 * list-detail grid with a `CaseInspector` on the right pane after a
 * row is clicked (UX Law 3: no context loss after select). When the
 * flag is OFF the legacy behavior is preserved exactly.
 *
 * `CasesPage` remains the standalone `/cases` route — it composes the
 * title-bar actions + this panel.
 */
export function CasesPanel(): JSX.Element {
  const navigate = useNavigate();
  const state = useCasesList();
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const selectedRow = selectedCaseId
    ? state.data.find((c) => c.id === selectedCaseId) ?? null
    : null;
  const selectedIndex = selectedCaseId
    ? state.data.findIndex((c) => c.id === selectedCaseId)
    : -1;

  const stepTo = (delta: number): void => {
    const next = selectedIndex + delta;
    if (next < 0 || next >= state.data.length) return;
    setSelectedCaseId(state.data[next].id);
  };

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
          ) : dsRefreshEnabled ? (
            <div
              data-testid="cases-list-detail"
              style={{
                display: 'grid',
                gridTemplateColumns: selectedRow
                  ? 'minmax(0, 1fr) minmax(280px, 360px)'
                  : 'minmax(0, 1fr)',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <CaseListTable
                items={state.data}
                onRowClick={(item) => setSelectedCaseId(item.id)}
              />
              {selectedRow ? (
                <CaseInspector
                  row={selectedRow}
                  onClose={() => setSelectedCaseId(null)}
                  position={{
                    index: selectedIndex,
                    total: state.data.length,
                    onPrev: selectedIndex > 0 ? () => stepTo(-1) : undefined,
                    onNext:
                      selectedIndex < state.data.length - 1 ? () => stepTo(1) : undefined,
                  }}
                />
              ) : null}
            </div>
          ) : (
            <CaseListTable items={state.data} onRowClick={(item) => navigate(`/cases/${item.id}`)} />
          )
        ) : null}
      </SectionCard>
    </>
  );
}
