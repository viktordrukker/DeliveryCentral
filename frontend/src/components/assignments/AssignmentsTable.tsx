import { useMemo } from 'react';

import { ColumnVisibilityMenu } from '@/components/common/ColumnVisibilityMenu';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { ASSIGNMENT_STATUS_LABELS, humanizeEnum } from '@/lib/labels';
import { formatDateShort } from '@/lib/format-date';

interface AssignmentsTableProps {
  items: AssignmentDirectoryItem[];
  onRowClick?: (item: AssignmentDirectoryItem) => void;
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = formatDateShort(startDate);
  const end = endDate ? formatDateShort(endDate) : 'Open-ended';

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
            (
              <StatusBadge
                label={humanizeEnum(item.approvalState, ASSIGNMENT_STATUS_LABELS)}
                status={item.approvalState}
                variant="dot"
              />
            ),
          title: 'Approval State',
        },
      ].filter((col) => isVisible(col.key)),
    [isVisible],
  );

  return (
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
      toolbar={(
        <ColumnVisibilityMenu
          columns={ALL_COLUMNS.map((key) => ({ key, label: COLUMN_LABELS[key] }))}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />
      )}
    />
  );
}
