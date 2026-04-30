import { MetadataDictionaryDetails } from '@/lib/api/metadata';
import { Table, type Column } from '@/components/ds';

type DictionaryEntry = MetadataDictionaryDetails['entries'][number];

interface MetadataEntryPanelProps {
  dictionary: MetadataDictionaryDetails;
}

export function MetadataEntryPanel({ dictionary }: MetadataEntryPanelProps): JSX.Element {
  return (
    <div className="metadata-detail">
      <div className="details-summary-grid">
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Entity Type</span>
          <strong>{dictionary.entityType}</strong>
        </div>
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Entries</span>
          <strong>{dictionary.entryCount}</strong>
        </div>
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Custom Fields</span>
          <strong>{dictionary.relatedCustomFieldCount}</strong>
        </div>
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Workflow Usage</span>
          <strong>{dictionary.workflowUsageCount}</strong>
        </div>
      </div>

      <div className="details-grid">
        <div className="section-card">
          <h3 className="section-card__title">Dictionary Entries</h3>
          <Table
            variant="compact"
            columns={[
              { key: 'name', title: 'Name', getValue: (e) => e.displayName, render: (e) => e.displayName },
              { key: 'key', title: 'Key', getValue: (e) => e.entryKey, render: (e) => e.entryKey },
              { key: 'value', title: 'Value', getValue: (e) => e.entryValue, render: (e) => e.entryValue },
              { key: 'status', title: 'Status', getValue: (e) => e.isEnabled ? 'Enabled' : 'Disabled', render: (e) => e.isEnabled ? 'Enabled' : 'Disabled' },
            ] as Column<DictionaryEntry>[]}
            rows={dictionary.entries}
            getRowKey={(e) => e.id}
          />
        </div>

        <div className="section-card">
          <h3 className="section-card__title">Attached Configuration</h3>
          <div className="metadata-related">
            <div>
              <h4 className="metadata-related__title">Custom Fields</h4>
              {dictionary.relatedCustomFields.length > 0 ? (
                <ul className="metadata-related__list">
                  {dictionary.relatedCustomFields.map((field) => (
                    <li key={field.id}>
                      <strong>{field.displayName}</strong>
                      <span>{field.fieldKey} � {field.dataType}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="metadata-related__empty">No custom fields attached yet.</p>
              )}
            </div>

            <div>
              <h4 className="metadata-related__title">Workflow Definitions</h4>
              {dictionary.relatedWorkflows.length > 0 ? (
                <ul className="metadata-related__list">
                  {dictionary.relatedWorkflows.map((workflow) => (
                    <li key={workflow.id}>
                      <strong>{workflow.displayName}</strong>
                      <span>{workflow.workflowKey} � v{workflow.version} � {workflow.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="metadata-related__empty">No workflow definitions attached yet.</p>
              )}
            </div>

            <div>
              <h4 className="metadata-related__title">Layout Definitions</h4>
              {dictionary.relatedLayouts.length > 0 ? (
                <ul className="metadata-related__list">
                  {dictionary.relatedLayouts.map((layout) => (
                    <li key={layout.id}>
                      <strong>{layout.displayName}</strong>
                      <span>{layout.layoutKey} � v{layout.version}{layout.isDefault ? ' � default' : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="metadata-related__empty">No layouts attached yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
