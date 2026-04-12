import { Link } from 'react-router-dom';

import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { CaseRecord } from '@/lib/api/cases';

interface CaseListTableProps {
  items: CaseRecord[];
  onRowClick: (item: CaseRecord) => void;
}

export function CaseListTable({ items, onRowClick }: CaseListTableProps): JSX.Element {
  return (
    <DataTable
      columns={[
        {
          key: 'case',
          render: (item) => (
            <div className="audit-record">
              <div className="audit-record__primary">{item.caseNumber}</div>
              <div className="audit-record__secondary">{item.caseTypeDisplayName}</div>
            </div>
          ),
          title: 'Case',
        },
        {
          key: 'status',
          render: (item) => (
            <span className={`status-indicator status-indicator--${item.status.toLowerCase()}`}>
              {item.status}
            </span>
          ),
          title: 'Status',
        },
        {
          key: 'subject',
          render: (item) => <span>{item.subjectPersonName ?? item.subjectPersonId}</span>,
          title: 'Subject',
        },
        {
          key: 'owner',
          render: (item) => <span>{item.ownerPersonName ?? item.ownerPersonId}</span>,
          title: 'Owner',
        },
        {
          key: 'participants',
          render: (item) => <span>{item.participants.length + 2}</span>,
          title: 'Participants',
        },
        {
          key: 'summary',
          render: (item) => <span className="audit-record__secondary">{item.summary ?? 'No summary'}</span>,
          title: 'Summary',
        },
        {
          key: 'openedAt',
          render: (item) => (
            <div className="audit-record">
              <div className="audit-record__primary">{new Date(item.openedAt).toLocaleDateString('en-US')}</div>
              <div className="audit-record__secondary">
                <Link className="button button--secondary" to={`/cases/${item.id}`}>
                  Open case
                </Link>
              </div>
            </div>
          ),
          title: 'Opened',
        },
      ]}
      emptyState={
        <EmptyState
          description="No cases matched the current governance filters."
          title="No cases"
        />
      }
      getRowKey={(item) => item.id}
      items={items}
      onRowClick={onRowClick}
    />
  );
}
