import { EmptyState } from '@/components/common/EmptyState';
import { DataTable } from '@/components/common/DataTable';
import { IntegrationSyncHistoryItem } from '@/lib/api/integrations-admin';
import { formatDateTime } from '@/lib/format-date';

interface IntegrationSyncHistoryPanelProps {
  items: IntegrationSyncHistoryItem[];
}

export function IntegrationSyncHistoryPanel({
  items,
}: IntegrationSyncHistoryPanelProps): JSX.Element {
  return (
    <DataTable
      columns={[
        {
          key: 'status',
          render: (item) => (
            <div>
              <strong>{item.status}</strong>
              <div className="metadata-entry-panel__hint">{item.resourceType}</div>
            </div>
          ),
          title: 'Status',
        },
        {
          key: 'summary',
          render: (item) => (
            <div>
              <strong>{item.summary}</strong>
              <div className="metadata-entry-panel__hint">
                {item.itemsProcessedSummary ?? item.failureSummary ?? 'No additional diagnostics.'}
              </div>
            </div>
          ),
          title: 'Summary',
        },
        {
          key: 'window',
          render: (item) => (
            <div>
              <strong>{formatTimestamp(item.finishedAt)}</strong>
              <div className="metadata-entry-panel__hint">
                Started {formatTimestamp(item.startedAt ?? item.finishedAt)}
              </div>
            </div>
          ),
          title: 'Run Window',
        },
        {
          key: 'failure',
          render: (item) => item.failureSummary ?? 'No failure recorded',
          title: 'Failure Summary',
        },
      ]}
      emptyState={
        <EmptyState
          description="No sync runs have been captured yet for the selected integration."
          title="No recent sync runs"
        />
      }
      getRowKey={(item, index) =>
        `${item.integrationType}-${item.finishedAt}-${item.resourceType}-${String(index)}`
      }
      items={items}
    />
  );
}

function formatTimestamp(value: string): string {
  return formatDateTime(value);
}

