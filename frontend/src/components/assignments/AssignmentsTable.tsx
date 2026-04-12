import { useMemo } from 'react';

import { ColumnVisibilityMenu } from '@/components/common/ColumnVisibilityMenu';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { ASSIGNMENT_STATUS_LABELS, humanizeEnum } from '@/lib/labels';

interface AssignmentsTableProps {
  items: AssignmentDirectoryItem[];
  onRowClick?: (item: AssignmentDirectoryItem) => void;
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString('en-US');
  const end = endDate ? new Date(endDate).toLocaleDateString('en-US') : 'Open-ended';

  return `${start} - ${end}`;
}

const ALL_COLUMNS = ['person', 'project', 'staffingRole', 'allocation', 'dateRange', 'approvalState'];
const COLUMN_LABELS: Record<string, string> = {
  person: 'Person',
  project: 'Project',
  staffingRole: 'Staffing Role',
  allocation: 'Allocation',
  dateRange: 'Date Range',
  approvalState: 'Approval State',
};

export function AssignmentsTable({
  items,
  onRowClick,
}: AssignmentsTableProps): JSX.Element {
  const { isVisible, toggleColumn } = useColumnVisibility('assignments', ALL_COLUMNS);

  const columns = useMemo(
    () =>
      [
        {
          key: 'person',
          render: (item: AssignmentDirectoryItem) => item.person.displayName,
          title: 'Person',
        },
        {
          key: 'project',
          render: (item: AssignmentDirectoryItem) => item.project.displayName,
          title: 'Project',
        },
        {
          key: 'staffingRole',
          render: (item: AssignmentDirectoryItem) => item.staffingRole,
          title: 'Staffing Role',
        },
        {
          key: 'allocation',
          render: (item: AssignmentDirectoryItem) => `${item.allocationPercent}%`,
          title: 'Allocation',
        },
        {
          key: 'dateRange',
          render: (item: AssignmentDirectoryItem) => formatDateRange(item.startDate, item.endDate),
          title: 'Date Range',
        },
        {
          key: 'approvalState',
          render: (item: AssignmentDirectoryItem) =>
            humanizeEnum(item.approvalState, ASSIGNMENT_STATUS_LABELS),
          title: 'Approval State',
        },
      ].filter((col) => isVisible(col.key)),
    [isVisible],
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <ColumnVisibilityMenu
          columns={ALL_COLUMNS.map((key) => ({ key, label: COLUMN_LABELS[key] }))}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />
      </div>
      <DataTable
        columns={columns}
        emptyState={
          <EmptyState
            description="No assignments matched the current filters."
            title="No assignment results"
          />
        }
        getRowKey={(item) => item.id}
        items={items}
        onRowClick={onRowClick}
      />
    </>
  );
}
