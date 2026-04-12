import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { MetadataDictionaryList } from '@/components/metadata/MetadataDictionaryList';
import { MetadataEntryPanel } from '@/components/metadata/MetadataEntryPanel';
import { useMetadataAdmin } from '@/features/metadata/useMetadataAdmin';

export function MetadataAdminPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const state = useMetadataAdmin({
    entityType: entityType || undefined,
    search: search || undefined,
  });

  const selectedSummary = useMemo(
    () => state.dictionaries.find((item) => item.id === state.selectedDictionaryId) ?? null,
    [state.dictionaries, state.selectedDictionaryId],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Customization"
        subtitle="Expose metadata and controlled vocabularies as first-class platform configuration. Business dictionaries stay out of page code and live behind explicit metadata contracts."
        title="Metadata / Dictionaries"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by dictionary name, key, entity type"
            type="search"
            value={search}
          />
        </label>
        <label className="field">
          <span className="field__label">Entity Type</span>
          <input
            className="field__control"
            onChange={(event) => setEntityType(event.target.value)}
            placeholder="Example: ProjectAssignment"
            type="text"
            value={entityType}
          />
        </label>
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading metadata dictionaries..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        state.dictionaries.length === 0 ? (
          <EmptyState
            description="No metadata dictionaries match the current filters. Add dictionary write APIs before enabling admin mutations."
            title="No dictionaries available"
          />
        ) : (
          <div className="metadata-admin-grid">
            <SectionCard title="Dictionaries">
              <div className="section-card__actions-row section-card__actions-row--start">
                <button className="button button--secondary" disabled type="button">
                  Add dictionary (coming soon)
                </button>
              </div>
              <MetadataDictionaryList
                items={state.dictionaries}
                onSelect={state.selectDictionary}
                selectedId={state.selectedDictionaryId}
              />
            </SectionCard>

            <SectionCard title={selectedSummary ? selectedSummary.displayName : 'Dictionary Details'}>
              <div className="section-card__actions-row section-card__actions-row--start">
                <button className="button button--secondary" disabled type="button">
                  Edit dictionary (coming soon)
                </button>
                <button className="button button--secondary" disabled type="button">
                  Manage entries (coming soon)
                </button>
              </div>

              {state.isLoadingDetails ? <LoadingState label="Loading dictionary details..." /> : null}

              {!state.isLoadingDetails && state.selectedDictionary ? (
                <MetadataEntryPanel dictionary={state.selectedDictionary} />
              ) : null}

              {!state.isLoadingDetails && !state.selectedDictionary ? (
                <EmptyState
                  description="Select a dictionary to inspect entries, related fields, and configuration usage."
                  title="No dictionary selected"
                />
              ) : null}
            </SectionCard>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
