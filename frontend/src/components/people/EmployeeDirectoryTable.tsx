import { useMemo } from 'react';

import { ColumnVisibilityMenu } from '@/components/common/ColumnVisibilityMenu';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import { PersonDirectoryItem } from '@/lib/api/person-directory';

interface EmployeeDirectoryTableProps {
  items: PersonDirectoryItem[];
  onRowClick?: (item: PersonDirectoryItem) => void;
}

const ALL_COLUMNS = ['name', 'orgUnit', 'lineManager', 'dottedLine', 'assignmentCount', 'status'];
const COLUMN_LABELS: Record<string, string> = {
  name: 'Person Name',
  orgUnit: 'Org Unit',
  lineManager: 'Line Manager',
  dottedLine: 'Dotted-Line Summary',
  assignmentCount: 'Active Assignments',
  status: 'Status',
};

export function EmployeeDirectoryTable({
  items,
  onRowClick,
}: EmployeeDirectoryTableProps): JSX.Element {
  const { isVisible, toggleColumn } = useColumnVisibility('people', ALL_COLUMNS);

  const columns = useMemo(
    () =>
      [
        {
          key: 'name',
          render: (item: PersonDirectoryItem) => item.displayName,
          title: 'Person Name',
        },
        {
          key: 'orgUnit',
          render: (item: PersonDirectoryItem) => item.currentOrgUnit?.name ?? 'Not assigned',
          title: 'Org Unit',
        },
        {
          key: 'lineManager',
          render: (item: PersonDirectoryItem) =>
            item.currentLineManager?.displayName ?? 'No line manager',
          title: 'Line Manager',
        },
        {
          key: 'dottedLine',
          render: (item: PersonDirectoryItem) =>
            item.dottedLineManagers.length > 0
              ? item.dottedLineManagers.map((manager) => manager.displayName).join(', ')
              : 'None',
          title: 'Dotted-Line Summary',
        },
        {
          key: 'assignmentCount',
          render: (item: PersonDirectoryItem) => item.currentAssignmentCount,
          title: 'Active Assignments',
        },
        {
          key: 'status',
          render: (item: PersonDirectoryItem) => (
            <StatusBadge label={item.lifecycleStatus} size="small" status={item.lifecycleStatus} uppercase={true} />
          ),
          title: 'Status',
        },
      ].filter((col) => isVisible(col.key)),
    [isVisible],
  );

  return (
    <DataTable
      columns={columns}
      emptyState={
        <EmptyState
          description="No employees matched the current query."
          title="No directory results"
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
