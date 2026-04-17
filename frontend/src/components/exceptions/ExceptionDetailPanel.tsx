import { Link } from 'react-router-dom';

import { ExceptionQueueItem } from '@/lib/api/exceptions';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { formatDateTime } from '@/lib/format-date';

interface ExceptionDetailPanelProps {
  isLoading: boolean;
  item: ExceptionQueueItem | null;
}

export function ExceptionDetailPanel({
  isLoading,
  item,
}: ExceptionDetailPanelProps): JSX.Element {
  if (isLoading) {
    return <LoadingState label="Loading exception detail..." />;
  }

  if (!item) {
    return (
      <EmptyState
        description="Select an exception item to review its related context and follow-up links."
        title="No exception selected"
      />
    );
  }

  return (
    <div className="metadata-related">
      <div className="monitoring-list__item">
        <div className="monitoring-card__header">
          <div>
            <div className="monitoring-list__title">{formatCategory(item.category)}</div>
            <p className="monitoring-list__summary">{item.summary}</p>
          </div>
          <span className="status-indicator status-indicator--open">{item.status}</span>
        </div>
      </div>

      <dl className="details-list">
        <div>
          <dt>Source Context</dt>
          <dd>{item.sourceContext}</dd>
        </div>
        <div>
          <dt>Observed At</dt>
          <dd>{formatDateTime(item.observedAt)}</dd>
        </div>
        <div>
          <dt>Target Entity</dt>
          <dd>
            {item.targetEntityType}: {item.targetEntityId}
          </dd>
        </div>
        <div>
          <dt>Person</dt>
          <dd>{item.personDisplayName ?? item.personId ?? 'No person linked'}</dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>{item.projectName ?? item.projectId ?? 'No project linked'}</dd>
        </div>
      </dl>

      <div className="scope-card__actions">
        {item.personId ? (
          <Link className="button button--secondary" to={`/people/${item.personId}`}>
            Open person
          </Link>
        ) : null}
        {item.projectId ? (
          <Link className="button button--secondary" to={`/projects/${item.projectId}`}>
            Open project
          </Link>
        ) : null}
        {item.assignmentId ? (
          <Link className="button button--secondary" to={`/assignments/${item.assignmentId}`}>
            Open assignment
          </Link>
        ) : null}
      </div>

      {item.category === 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS' && item.projectId ? (
        <div className="override-panel">
          <div className="override-panel__header">
            <div className="override-panel__eyebrow">Governance Path</div>
            <div className="override-panel__title">Project closure override available</div>
            <p className="override-panel__copy">
              Review the project lifecycle surface to either resolve the remaining staffing
              condition or, for authorized director or admin roles, apply the explicit closure
              override with a recorded reason.
            </p>
          </div>
          <div className="scope-card__actions">
            <Link className="button" to={`/projects/${item.projectId}`}>
              Review closure controls
            </Link>
          </div>
        </div>
      ) : null}

      {item.details ? (
        <div className="monitoring-list__item">
          <div className="monitoring-list__title">Derived Context</div>
          <pre className="template-preview__body">{JSON.stringify(item.details, null, 2)}</pre>
        </div>
      ) : null}

      <div className="monitoring-list__item">
        <div className="monitoring-list__title">Operator Actions</div>
        <p className="monitoring-list__summary">
          Resolution and acknowledgement actions are intentionally narrow. Where the backend already
          supports governed override behavior, this panel links operators into the authoritative
          workflow surface instead of inventing a new bypass here.
        </p>
      </div>
    </div>
  );
}

function formatCategory(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
