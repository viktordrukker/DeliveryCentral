import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { Button } from '@/components/ds';

interface ManagerScopeSectionProps {
  emptyDescription: string;
  items: PersonDirectoryItem[];
  title: string;
}

export function ManagerScopeSection({
  emptyDescription,
  items,
  title,
}: ManagerScopeSectionProps): JSX.Element {
  return (
    <section className="scope-section">
      <h3 className="section-card__title">{title}</h3>
      {items.length === 0 ? (
        <EmptyState description={emptyDescription} title={`No ${title.toLowerCase()}`} />
      ) : (
        <div className="scope-grid">
          {items.map((item) => (
            <article className="scope-card" key={item.id}>
              <div className="scope-card__header">
                <div>
                  <div className="scope-card__title">{item.displayName}</div>
                  <div className="scope-card__meta">
                    {item.currentOrgUnit?.name ?? 'No current org unit'}
                  </div>
                </div>
                <div className="scope-card__count">{item.currentAssignmentCount}</div>
              </div>

              <dl className="details-list">
                <div>
                  <dt>Line Manager</dt>
                  <dd>{item.currentLineManager?.displayName ?? 'No line manager'}</dd>
                </div>
                <div>
                  <dt>Dotted-Line Summary</dt>
                  <dd>
                    {item.dottedLineManagers.length > 0
                      ? item.dottedLineManagers.map((manager) => manager.displayName).join(', ')
                      : 'None'}
                  </dd>
                </div>
              </dl>

              <div className="scope-card__actions">
                <Button as={Link} variant="secondary" to={`/people/${item.id}`}>
                  View person
                </Button>
                <Button as={Link} variant="secondary" to={`/assignments?person=${encodeURIComponent(item.displayName)}`}>
                  View assignments
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
