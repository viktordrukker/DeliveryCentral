import { FormEvent } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { MetadataDictionaryDetails } from '@/lib/api/metadata';

import { DictionaryEntryForm, DictionaryEntryFormValues } from './DictionaryEntryForm';
import { Button, DataView } from '@/components/ds';

interface DictionaryEditorProps {
  dictionary: MetadataDictionaryDetails | null;
  isSubmitting: boolean;
  onChange: (field: keyof DictionaryEntryFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleEntry: (entryId: string, isEnabled: boolean) => Promise<void>;
  values: DictionaryEntryFormValues;
}

export function DictionaryEditor({
  dictionary,
  isSubmitting,
  onChange,
  onSubmit,
  onToggleEntry,
  values,
}: DictionaryEditorProps): JSX.Element {
  if (!dictionary) {
    return (
      <SectionCard>
        <EmptyState
          description="Select a dictionary to review entries and create new values."
          title="No dictionary selected"
        />
      </SectionCard>
    );
  }

  return (
    <div className="dictionary-editor">
      <SectionCard title={dictionary.displayName}>
        <div className="details-summary-grid">
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Dictionary Key</span>
            <strong>{dictionary.dictionaryKey}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Entries</span>
            <strong>{dictionary.entryCount}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Enabled Entries</span>
            <strong>{dictionary.enabledEntryCount}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Entity Type</span>
            <strong>{dictionary.entityType}</strong>
          </div>
        </div>
      </SectionCard>

      <div className="details-grid">
        <SectionCard title="Entries">
          <DataView
            pageSizeOptions={[1000]}
            columns={[
              {
                key: 'displayName',
                render: (item) => item.displayName,
                title: 'Name',
              },
              {
                key: 'entryKey',
                render: (item) => item.entryKey,
                title: 'Key',
              },
              {
                key: 'entryValue',
                render: (item) => item.entryValue,
                title: 'Value',
              },
              {
                key: 'status',
                render: (item) => (item.isEnabled ? 'Enabled' : 'Disabled'),
                title: 'Status',
              },
              {
                key: 'actions',
                render: (item) => (
                  <Button variant="secondary" onClick={() => { void onToggleEntry(item.id, !item.isEnabled); }} style={{ fontSize: '12px', padding: '2px 8px' }} type="button">
                    {item.isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                ),
                title: 'Actions',
              },
            ]}
            emptyState={
              <EmptyState
                description="This dictionary does not have any entries yet."
                title="No entries"
              />
            }
            getRowKey={(item) => item.id}
            rows={dictionary.entries}
          />
        </SectionCard>

        <SectionCard title="Add Entry">
          <p className="dictionary-editor__copy">
            Entry creation posts back to the metadata dictionary API using the selected
            dictionary key. The page does not hardcode grade, role, or skillset values.
          </p>
          <DictionaryEntryForm
            isSubmitting={isSubmitting}
            onChange={onChange}
            onSubmit={onSubmit}
            values={values}
          />
        </SectionCard>
      </div>
    </div>
  );
}
