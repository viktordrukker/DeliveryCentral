import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { DictionaryEditor } from '@/components/admin/DictionaryEditor';
import { DictionaryList } from '@/components/admin/DictionaryList';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  initialDictionaryEntryFormValues,
  useDictionaryAdmin,
} from '@/features/admin/useDictionaryAdmin';
import { DictionaryEntryFormValues } from '@/components/admin/DictionaryEntryForm';
import { Button } from '@/components/ds';

export function DictionariesPage(): JSX.Element {
  const [values, setValues] = useState<DictionaryEntryFormValues>(
    initialDictionaryEntryFormValues,
  );
  const state = useDictionaryAdmin();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const created = await state.createEntry(values);
    if (created) {
      setValues(initialDictionaryEntryFormValues);
    }
  }

  function handleChange(field: keyof DictionaryEntryFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/admin">
            Back to admin panel
          </Button>
        }
        eyebrow="Administration"
        subtitle="Manage metadata-backed person dictionaries through the existing metadata APIs. The page renders whatever dictionaries the API exposes and posts new entries using the selected dictionary key."
        title="Dictionaries"
      />

      {state.isLoading ? <LoadingState label="Loading dictionaries..." variant="skeleton" skeletonType="table" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.successMessage ? (
        <div className="success-banner" role="status">
          {state.successMessage}
        </div>
      ) : null}

      {!state.isLoading && !state.error ? (
        state.dictionaries.length === 0 ? (
          <SectionCard>
            <EmptyState
              description="The metadata API did not return any dictionaries to manage."
              title="No dictionaries available"
            />
          </SectionCard>
        ) : (
          <div className="dictionary-admin-grid">
            <SectionCard title="Dictionary Types">
              <DictionaryList
                items={state.dictionaries}
                onSelect={state.selectDictionary}
                selectedId={state.selectedDictionaryId}
              />
            </SectionCard>

            <DictionaryEditor
              dictionary={state.selectedDictionary}
              isSubmitting={state.isSubmitting}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onToggleEntry={state.toggleEntry}
              values={values}
            />
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
