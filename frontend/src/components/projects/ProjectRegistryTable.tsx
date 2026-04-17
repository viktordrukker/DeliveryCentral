import { useMemo } from 'react';

import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';

interface ProjectRegistryTableProps {
  items: ProjectDirectoryItem[];
  onRowClick?: (item: ProjectDirectoryItem) => void;
}

export function ProjectRegistryTable({
  items,
  onRowClick,
}: ProjectRegistryTableProps): JSX.Element {
  const columns = useMemo(
    () => [
      {
        key: 'name',
        render: (item: ProjectDirectoryItem) => item.name,
        title: 'Project Name',
      },
      {
        key: 'projectCode',
        render: (item: ProjectDirectoryItem) => item.projectCode,
        title: 'Project Code',
      },
      {
        key: 'status',
        render: (item: ProjectDirectoryItem) => <StatusBadge status={item.status} variant="dot" />,
        title: 'Status',
      },
      {
        key: 'externalLinks',
        render: (item: ProjectDirectoryItem) =>
          item.externalLinksCount > 0
            ? item.externalLinksSummary
                .map((link) => `${link.provider} (${link.count})`)
                .join(', ')
            : 'No external links',
        title: 'External Links',
      },
      {
        key: 'assignmentCount',
        render: (item: ProjectDirectoryItem) => item.assignmentCount,
        title: 'Assignments',
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      emptyState={
        <EmptyState
          description="No projects matched the current query."
          title="No project results"
        />
      }
      getRowKey={(item) => item.id}
      items={items}
      onRowClick={onRowClick}
    />
  );
}
