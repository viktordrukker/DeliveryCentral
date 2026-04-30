import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { CaseRecord } from '@/lib/api/cases';
import { formatDateShort } from '@/lib/format-date';
import { Button, DataView, type Column } from '@/components/ds';

interface CaseListTableProps {
  items: CaseRecord[];
  onRowClick: (item: CaseRecord) => void;
}

/**
 * Phase DS-4-8 — second table migration. Thin wrapper over `<DataView>`.
 * No `viewId` (no localStorage persistence) — validates the saved-views
 * opt-out path. `pageSizeOptions={[1000]}` keeps "render all" behavior to
 * match the legacy DataTable.
 */
export function CaseListTable({ items, onRowClick }: CaseListTableProps): JSX.Element {
  const columns: Column<CaseRecord>[] = [
    {
      key: 'case',
      title: 'Case',
      getValue: (item) => item.caseNumber,
      render: (item) => (
        <div className="audit-record">
          <div className="audit-record__primary">{item.caseNumber}</div>
          <div className="audit-record__secondary">{item.caseTypeDisplayName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      getValue: (item) => item.status,
      render: (item) => (
        <span className={`status-indicator status-indicator--${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'subject',
      title: 'Subject',
      getValue: (item) => item.subjectPersonName ?? item.subjectPersonId,
      render: (item) => <span>{item.subjectPersonName ?? item.subjectPersonId}</span>,
    },
    {
      key: 'owner',
      title: 'Owner',
      getValue: (item) => item.ownerPersonName ?? item.ownerPersonId,
      render: (item) => <span>{item.ownerPersonName ?? item.ownerPersonId}</span>,
    },
    {
      key: 'participants',
      title: 'Participants',
      align: 'right',
      getValue: (item) => item.participants.length + 2,
      render: (item) => <span>{item.participants.length + 2}</span>,
    },
    {
      key: 'summary',
      title: 'Summary',
      getValue: (item) => item.summary ?? '',
      render: (item) => <span className="audit-record__secondary">{item.summary ?? 'No summary'}</span>,
    },
    {
      key: 'openedAt',
      title: 'Opened',
      getValue: (item) => item.openedAt,
      render: (item) => (
        <div className="audit-record">
          <div className="audit-record__primary">{formatDateShort(item.openedAt)}</div>
          <div className="audit-record__secondary">
            <Button as={Link} variant="secondary" size="xs" to={`/cases/${item.id}`}>
              Open case
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <DataView
      columns={columns}
      rows={items}
      getRowKey={(item) => item.id}
      onRowClick={onRowClick}
      pageSizeOptions={[1000]}
      emptyState={
        <EmptyState
          description="No cases matched the current governance filters."
          title="No cases"
        />
      }
    />
  );
}
