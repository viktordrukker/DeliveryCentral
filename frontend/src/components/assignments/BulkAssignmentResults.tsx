import { BulkAssignmentResponse } from '@/lib/api/assignments';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { SectionCard } from '@/components/common/SectionCard';

interface BulkAssignmentResultsProps {
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  result: BulkAssignmentResponse;
}

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
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Person</th>
                    <th scope="col">Project</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.createdItems.map((item) => (
                    <tr key={`${item.assignment.id}-${item.index}`}>
                      <td>{item.index + 1}</td>
                      <td>{getPersonName(item.assignment.personId)}</td>
                      <td>{getProjectName(item.assignment.projectId)}</td>
                      <td>{item.assignment.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Failed Items">
          {result.failedItems.length === 0 ? (
            <p className="dictionary-editor__copy">No items failed in this batch.</p>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Person</th>
                    <th scope="col">Project</th>
                    <th scope="col">Code</th>
                    <th scope="col">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failedItems.map((item) => (
                    <tr key={`${item.index}-${item.personId}-${item.code}`}>
                      <td>{item.index + 1}</td>
                      <td>{getPersonName(item.personId)}</td>
                      <td>{getProjectName(item.projectId)}</td>
                      <td>{item.code}</td>
                      <td>{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
