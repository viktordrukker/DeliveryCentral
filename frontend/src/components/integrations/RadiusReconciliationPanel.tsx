import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { RadiusReconciliationReview } from '@/lib/api/integrations-admin';
import { formatDateTime } from '@/lib/format-date';

interface RadiusReconciliationPanelProps {
  filter: {
    category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
    query: string;
  };
  onFilterChange: (
    update: Partial<{
      category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
      query: string;
    }>,
  ) => void;
  review: RadiusReconciliationReview | null;
}

export function RadiusReconciliationPanel({
  filter,
  onFilterChange,
  review,
}: RadiusReconciliationPanelProps): JSX.Element {
  return (
    <div className="workflow-panel">
      <div className="details-summary-grid">
        <SummaryStat label="Matched" value={review?.summary.matched ?? 0} />
        <SummaryStat label="Unmatched" value={review?.summary.unmatched ?? 0} />
        <SummaryStat label="Ambiguous" value={review?.summary.ambiguous ?? 0} />
        <SummaryStat label="Presence Drift" value={review?.summary.presenceDrift ?? 0} />
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
                  | 'PRESENCE_DRIFT'
                  | 'UNMATCHED',
              })
            }
            value={filter.category}
          >
            <option value="ALL">All categories</option>
            <option value="MATCHED">Matched</option>
            <option value="UNMATCHED">Unmatched</option>
            <option value="AMBIGUOUS">Ambiguous</option>
            <option value="PRESENCE_DRIFT">Presence drift</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(event) => onFilterChange({ query: event.target.value })}
            placeholder="Search by account id, username, email, person, or summary"
            type="search"
            value={filter.query}
          />
        </label>
      </div>

      <div className="admin-config-viewer__item">
        <dl className="admin-config-viewer">
          <div>
            <dt>Last sync</dt>
            <dd>{review?.lastSyncAt ? formatDateTime(review.lastSyncAt) : 'Not available'}</dd>
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
          title="No RADIUS reconciliation items"
        />
      ) : (
        <div className="monitoring-list">
          {review.items.map((item) => (
            <div className="monitoring-list__item" key={item.externalAccountId}>
              <div className="monitoring-card__header">
                <div>
                  <div className="monitoring-list__title">
                    {item.externalDisplayName ?? item.externalUsername ?? item.externalAccountId}
                  </div>
                  <p className="monitoring-list__summary">
                    {item.externalAccountId}
                    {' • '}
                    {item.externalEmail ?? item.externalUsername ?? 'No external identifier'}
                    {' • '}
                    {item.accountPresenceState ?? 'unknown presence'}
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
                    {item.personId ? <Link to={`/people/${item.personId}`}>{item.personDisplayName ?? item.personId}</Link> : 'Not linked'}
                  </dd>
                </div>
                <div>
                  <dt>Source type</dt>
                  <dd>{item.sourceType}</dd>
                </div>
                <div>
                  <dt>Last evaluated</dt>
                  <dd>{formatDateTime(item.lastEvaluatedAt)}</dd>
                </div>
                <div>
                  <dt>Operational follow-up</dt>
                  <dd>
                    <Link to="/people">People</Link>
                    {' • '}
                    <Link to="/assignments">Assignments</Link>
                    {' • '}
                    <Link to="/admin/audit">Business audit</Link>
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
