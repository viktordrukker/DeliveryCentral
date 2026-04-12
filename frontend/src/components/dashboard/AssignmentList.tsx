import { Link } from 'react-router-dom';

import { AssignmentDirectoryItem } from '@/lib/api/assignments';

interface AssignmentListProps {
  emptyDescription: string;
  emptyTitle: string;
  items: AssignmentDirectoryItem[];
}

export function AssignmentList({
  emptyDescription,
  emptyTitle,
  items,
}: AssignmentListProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="feedback-state">
        <div>
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-list">
      {items.map((item) => (
        <div className="monitoring-list__item" key={item.id}>
          <div className="monitoring-list__title">
            <Link style={{ color: 'inherit', textDecoration: 'none' }} to={`/projects/${item.project.id}/dashboard`}>
              {item.project.displayName}
            </Link>
          </div>
          <p className="monitoring-list__summary">
            {item.staffingRole} · {item.allocationPercent}% · {item.approvalState}
          </p>
          <Link
            className="button button--secondary"
            style={{ marginTop: '6px', fontSize: '0.75rem' }}
            to={`/assignments/${item.id}`}
          >
            View assignment
          </Link>
        </div>
      ))}
    </div>
  );
}
