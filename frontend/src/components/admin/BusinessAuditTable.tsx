import { useMemo } from 'react';

import { ColumnVisibilityMenu } from '@/components/common/ColumnVisibilityMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import { BusinessAuditRecord } from '@/lib/api/business-audit';
import { formatDateTime } from '@/lib/format-date';
import { Table, type Column } from '@/components/ds';

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

  const columnDefs: Column<BusinessAuditRecord>[] = useMemo(
    () =>
      ([
        {
          key: 'occurredAt',
          title: COLUMN_LABELS.occurredAt,
          render: (item) => (
            <div className="audit-record">
              <div className="audit-record__primary">
                {formatDateTime(item.occurredAt)}
              </div>
              <div className="audit-record__secondary">
                {item.correlationId ? `Correlation: ${item.correlationId}` : 'No correlation id'}
              </div>
            </div>
          ),
        },
        {
          key: 'action',
          title: COLUMN_LABELS.action,
          render: (item) => (
            <div className="audit-record">
              <div className="audit-record__primary">{item.actionType}</div>
              <div className="audit-record__secondary">
                {item.changeSummary ?? 'No summary provided.'}
              </div>
            </div>
          ),
        },
        {
          key: 'target',
          title: COLUMN_LABELS.target,
          render: (item) => (
            <div className="audit-record">
              <div className="audit-record__primary">{item.targetEntityType}</div>
              <div className="audit-record__secondary">{item.targetEntityId ?? 'No target id'}</div>
            </div>
          ),
        },
        {
          key: 'actor',
          title: COLUMN_LABELS.actor,
          render: (item) => (
            <span className="audit-record__primary">{item.actorDisplayName ?? item.actorId ?? 'System / unknown'}</span>
          ),
        },
        {
          key: 'metadata',
          title: COLUMN_LABELS.metadata,
          render: (item) => (
            <span className="audit-record__secondary">{summarizeMetadata(item.metadata)}</span>
          ),
        },
      ] satisfies Column<BusinessAuditRecord>[]).filter((col) => isVisible(col.key)),
    [isVisible],
  );

  return (
    <Table
      columns={columnDefs}
      rows={items}
      getRowKey={(item, index) =>
        `${item.occurredAt}-${item.actionType}-${item.targetEntityId ?? 'none'}-${index}`
      }
      virtualization={items.length > VIRTUAL_THRESHOLD ? { rowHeight: 48, containerHeight: 600 } : undefined}
      emptyState={
        <EmptyState
          description="No business audit records matched the current investigation filters."
          title="No business audit records"
        />
      }
      toolbar={(
        <ColumnVisibilityMenu
          columns={ALL_COLUMNS.map((key) => ({ key, label: COLUMN_LABELS[key as keyof typeof COLUMN_LABELS] }))}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />
      )}
    />
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
