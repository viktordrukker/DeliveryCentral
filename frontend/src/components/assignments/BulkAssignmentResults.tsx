import { BulkAssignmentResponse } from '@/lib/api/assignments';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { SectionCard } from '@/components/common/SectionCard';
import { Table, type Column } from '@/components/ds';

interface BulkAssignmentResultsProps {
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  result: BulkAssignmentResponse;
}

type CreatedItem = BulkAssignmentResponse['createdItems'][number];
type FailedItem = BulkAssignmentResponse['failedItems'][number];

export function BulkAssignmentResults({
  people,
  projects,
  result,
}: BulkAssignmentResultsProps): JSX.Element {
  function getPersonName(personId: string): string {
    return people.find((person) => person.id === personId)?.displayName ?? personId;
  }

  function getProjectName(projectId: string): string {
    return projects.find((project) => project.id === projectId)?.name ?? projectId;
  }

  const createdColumns: Column<CreatedItem>[] = [
    { key: 'index', title: 'Item', getValue: (i) => i.index + 1, render: (i) => i.index + 1 },
    { key: 'person', title: 'Person', getValue: (i) => getPersonName(i.assignment.personId), render: (i) => getPersonName(i.assignment.personId) },
    { key: 'project', title: 'Project', getValue: (i) => getProjectName(i.assignment.projectId), render: (i) => getProjectName(i.assignment.projectId) },
    { key: 'status', title: 'Status', getValue: (i) => i.assignment.status, render: (i) => i.assignment.status },
  ];

  const failedColumns: Column<FailedItem>[] = [
    { key: 'index', title: 'Item', getValue: (i) => i.index + 1, render: (i) => i.index + 1 },
    { key: 'person', title: 'Person', getValue: (i) => getPersonName(i.personId), render: (i) => getPersonName(i.personId) },
    { key: 'project', title: 'Project', getValue: (i) => getProjectName(i.projectId), render: (i) => getProjectName(i.projectId) },
    { key: 'code', title: 'Code', getValue: (i) => i.code, render: (i) => i.code },
    { key: 'message', title: 'Message', getValue: (i) => i.message, render: (i) => i.message },
  ];

  return (
    <div className="dictionary-editor">
      <SectionCard title="Batch Result Summary">
        <div className="stats-grid">
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Strategy</span>
            <strong>{result.strategy}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Created</span>
            <strong>{result.createdCount}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Failed</span>
            <strong>{result.failedCount}</strong>
          </div>
        </div>
        <p className="dictionary-editor__copy">{result.message}</p>
      </SectionCard>

      <div className="details-grid">
        <SectionCard title="Created Items">
          {result.createdItems.length === 0 ? (
            <p className="dictionary-editor__copy">No assignments were created in this batch.</p>
          ) : (
            <Table
              variant="compact"
              columns={createdColumns}
              rows={result.createdItems}
              getRowKey={(i) => `${i.assignment.id}-${i.index}`}
            />
          )}
        </SectionCard>

        <SectionCard title="Failed Items">
          {result.failedItems.length === 0 ? (
            <p className="dictionary-editor__copy">No items failed in this batch.</p>
          ) : (
            <Table
              variant="compact"
              columns={failedColumns}
              rows={result.failedItems}
              getRowKey={(i) => `${i.index}-${i.personId}-${i.code}`}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
