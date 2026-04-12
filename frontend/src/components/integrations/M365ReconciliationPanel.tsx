import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { M365ReconciliationReview } from '@/lib/api/integrations-admin';

interface M365ReconciliationPanelProps {
  filter: {
    category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
    query: string;
  };
  onFilterChange: (
    update: Partial<{
      category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
      query: string;
    }>,
  ) => void;
  review: M365ReconciliationReview | null;
}

export function M365ReconciliationPanel({
  filter,
  onFilterChange,
  review,
}: M365ReconciliationPanelProps): JSX.Element {
  return (
    <div className="workflow-panel">
      <div className="details-summary-grid">
        <SummaryStat label="Matched" value={review?.summary.matched ?? 0} />
        <SummaryStat label="Unmatched" value={review?.summary.unmatched ?? 0} />
        <SummaryStat label="Ambiguous" value={review?.summary.ambiguous ?? 0} />
        <SummaryStat label="Stale/Conflict" value={review?.summary.staleConflict ?? 0} />
      </div>

      <div className="field-grid">
        <label className="field">
          <span className="field__label">Category</span>
          <select
            className="field__control"
            onChange={(event) =>
              onFilterChange({
                category: event.target.value as
                  | 'ALL'
                  | 'AMBIGUOUS'
                  | 'MATCHED'
                  | 'STALE_CONFLICT'
                  | 'UNMATCHED',
              })
            }
            value={filter.category}
          >
            <option value="ALL">All categories</option>
            <option value="MATCHED">Matched</option>
            <option value="UNMATCHED">Unmatched</option>
            <option value="AMBIGUOUS">Ambiguous</option>
            <option value="STALE_CONFLICT">Stale / conflict</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(event) => onFilterChange({ query: event.target.value })}
            placeholder="Search by external user, principal, person, or summary"
            type="search"
            value={filter.query}
          />
        </label>
      </div>

      <div className="admin-config-viewer__item">
        <dl className="admin-config-viewer">
          <div>
            <dt>Last sync</dt>
            <dd>{review?.lastSyncAt ? new Date(review.lastSyncAt).toLocaleString('en-US') : 'Not available'}</dd>
          </div>
          <div>
            <dt>Last outcome</dt>
            <dd>{review?.lastSyncOutcome ?? 'unknown'}</dd>
          </div>
          <div>
            <dt>Total reviewed</dt>
            <dd>{review?.summary.total ?? 0}</dd>
          </div>
        </dl>
      </div>

      {!review || review.items.length === 0 ? (
        <EmptyState
          description="No reconciliation items match the current filters."
          title="No M365 reconciliation items"
        />
      ) : (
        <div className="monitoring-list">
          {review.items.map((item) => (
            <div className="monitoring-list__item" key={item.externalUserId}>
              <div className="monitoring-card__header">
                <div>
                  <div className="monitoring-list__title">
                    {item.externalDisplayName ?? item.externalPrincipalName ?? item.externalUserId}
                  </div>
                  <p className="monitoring-list__summary">
                    {item.externalUserId}
                    {' • '}
                    {item.externalEmail ?? item.externalPrincipalName ?? 'No external email'}
                  </p>
                </div>
                <span
                  className={`status-indicator status-indicator--${item.category
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')}`}
                >
                  {item.category}
                </span>
              </div>

              <dl className="details-list">
                <div>
                  <dt>Summary</dt>
                  <dd>{item.summary}</dd>
                </div>
                <div>
                  <dt>Matched by</dt>
                  <dd>{item.matchedByStrategy ?? 'Review required'}</dd>
                </div>
                <div>
                  <dt>Person</dt>
                  <dd>
                    {item.personId ? <Link to={`/people/${item.personId}`}>{item.personId}</Link> : 'Not linked'}
                  </dd>
                </div>
                <div>
                  <dt>Manager</dt>
                  <dd>
                    {item.resolvedManagerPersonId ? (
                      <Link to={`/people/${item.resolvedManagerPersonId}`}>
                        {item.resolvedManagerPersonId}
                      </Link>
                    ) : item.sourceAccountEnabled === false ? (
                      'External account disabled'
                    ) : (
                      'Unresolved'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Last evaluated</dt>
                  <dd>{new Date(item.lastEvaluatedAt).toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Project and staffing follow-up</dt>
                  <dd>
                    <Link to="/assignments">Assignments</Link>
                    {' • '}
                    <Link to="/teams">Teams</Link>
                    {' • '}
                    <Link to="/projects">Projects</Link>
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div className="section-card metadata-detail__stat">
      <span className="metric-card__label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
