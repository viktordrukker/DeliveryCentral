import { useMemo } from 'react';

import { ColumnVisibilityMenu } from '@/components/common/ColumnVisibilityMenu';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { VirtualTable } from '@/components/common/VirtualTable';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import { BusinessAuditRecord } from '@/lib/api/business-audit';

const VIRTUAL_THRESHOLD = 100;

interface BusinessAuditTableProps {
  items: BusinessAuditRecord[];
}

const ALL_COLUMNS = ['occurredAt', 'action', 'target', 'actor', 'metadata'];
const COLUMN_LABELS = {
  occurredAt: 'Occurred',
  action: 'Business Action',
  target: 'Target',
  actor: 'Actor',
  metadata: 'Metadata Summary',
};

export function BusinessAuditTable({ items }: BusinessAuditTableProps): JSX.Element {
  const { isVisible, toggleColumn } = useColumnVisibility('business-audit', ALL_COLUMNS);

  const columnDefs = useMemo(
    () =>
      [
        {
          key: 'occurredAt',
          render: (item: BusinessAuditRecord) => (
            <div className="audit-record">
              <div className="audit-record__primary">
                {new Date(item.occurredAt).toLocaleString('en-US')}
              </div>
              <div className="audit-record__secondary">
                {item.correlationId ? `Correlation: ${item.correlationId}` : 'No correlation id'}
              </div>
            </div>
          ),
          title: COLUMN_LABELS.occurredAt,
        },
        {
          key: 'action',
          render: (item: BusinessAuditRecord) => (
            <div className="audit-record">
              <div className="audit-record__primary">{item.actionType}</div>
              <div className="audit-record__secondary">
                {item.changeSummary ?? 'No summary provided.'}
              </div>
            </div>
          ),
          title: COLUMN_LABELS.action,
        },
        {
          key: 'target',
          render: (item: BusinessAuditRecord) => (
            <div className="audit-record">
              <div className="audit-record__primary">{item.targetEntityType}</div>
              <div className="audit-record__secondary">{item.targetEntityId ?? 'No target id'}</div>
            </div>
          ),
          title: COLUMN_LABELS.target,
        },
        {
          key: 'actor',
          render: (item: BusinessAuditRecord) => (
            <span className="audit-record__primary">{item.actorId ?? 'System / unknown'}</span>
          ),
          title: COLUMN_LABELS.actor,
        },
        {
          key: 'metadata',
          render: (item: BusinessAuditRecord) => (
            <span className="audit-record__secondary">{summarizeMetadata(item.metadata)}</span>
          ),
          title: COLUMN_LABELS.metadata,
        },
      ].filter((col) => isVisible(col.key)),
    [isVisible],
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <ColumnVisibilityMenu
          columns={ALL_COLUMNS.map((key) => ({ key, label: COLUMN_LABELS[key as keyof typeof COLUMN_LABELS] }))}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />
      </div>
      {items.length > VIRTUAL_THRESHOLD ? (
        <VirtualTable
          columns={columnDefs}
          getRowKey={(item, index) =>
            `${item.occurredAt}-${item.actionType}-${item.targetEntityId ?? 'none'}-${index}`
          }
          items={items}
        />
      ) : (
        <DataTable
          columns={columnDefs}
          emptyState={
            <EmptyState
              description="No business audit records matched the current investigation filters."
              title="No business audit records"
            />
          }
          getRowKey={(item, index) =>
            `${item.occurredAt}-${item.actionType}-${item.targetEntityId ?? 'none'}-${index}`
          }
          items={items}
        />
      )}
    </>
  );
}

function summarizeMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata ?? {}).slice(0, 3);

  if (entries.length === 0) {
    return 'No metadata recorded.';
  }

  return entries
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join(' | ');
}

function formatMetadataValue(value: unknown): string {
  if (value == null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} item(s)`;
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'value';
}
