import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { AssignmentDirectoryItem } from '@/lib/api/assignments';

interface AssignmentTableProps {
  items: AssignmentDirectoryItem[];
}

export function AssignmentTable({ items }: AssignmentTableProps): JSX.Element {
  return (
    <DataTable
      columns={[
        {
          key: 'person',
          render: (item) => item.person.displayName,
          title: 'Person',
        },
        {
          key: 'role',
          render: (item) => item.staffingRole,
          title: 'Role',
        },
        {
          key: 'allocation',
          render: (item) => `${item.allocationPercent}%`,
          title: 'Allocation',
        },
        {
          key: 'state',
          render: (item) => item.approvalState,
          title: 'Approval State',
        },
        {
          key: 'window',
          render: (item) =>
            item.endDate
              ? `${item.startDate} to ${item.endDate}`
              : `${item.startDate} onward`,
          title: 'Assignment Window',
        },
      ]}
      emptyState={
        <EmptyState
          description="No people are currently assigned to this project."
          title="No assignments"
        />
      }
      getRowKey={(item) => item.id}
      items={items}
    />
  );
}
