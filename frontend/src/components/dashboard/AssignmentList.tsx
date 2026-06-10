import { Link } from 'react-router-dom';

import { Button } from '@/components/ds';

/**
 * Legacy assignment-list row shape used by the V1 EmployeeDashboardPage
 * (obsoleteInV2 — V2Redirects to /me). Defined locally because the
 * `@/lib/api/assignments` client was deleted in SoT PR 17b. This component
 * is scheduled for full deletion alongside EmployeeDashboardPage at PR 20.
 */
export interface AssignmentListItem {
  id: string;
  staffingRole: string;
  allocationPercent: number;
  approvalState: string;
  project: { id: string; displayName: string };
}

interface AssignmentListProps {
  emptyDescription: string;
  emptyTitle: string;
  items: AssignmentListItem[];
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
          <Button as={Link} variant="secondary" style={{ marginTop: '6px', fontSize: '0.75rem' }} to={`/projects/${item.project.id}?position=${item.id}`}>
            View position
          </Button>
        </div>
      ))}
    </div>
  );
}
