import { ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ds';

interface DataFreshnessProps {
  /** Timestamp of the last successful data fetch. */
  lastFetch: Date;
  /** Callback to refresh data. */
  onRefresh: () => void;
  /** Optional refreshing flag — disables the button + shows a different label. */
  refreshing?: boolean;
  /** Optional TipBalloon (or any node) rendered to the right of the refresh button. */
  tip?: ReactNode;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5 — standardized data-freshness footer for dashboards.
 *
 * Replaces the inline `<div className="data-freshness">…</div>` pattern that
 * appeared verbatim in every dashboard page. Now a single component so the
 * "Updated X ago · Refresh" line is consistent and centrally fixable.
 *
 * Token-driven (zero MUI). Composes the existing `.data-freshness` CSS class
 * which already had the right styling.
 */
export function DataFreshness({
  lastFetch,
  onRefresh,
  refreshing = false,
  tip,
  testId,
}: DataFreshnessProps): JSX.Element {
  return (
    <div className="data-freshness" data-testid={testId}>
      <span>
        Updated {formatDistanceToNow(lastFetch, { addSuffix: true })}
      </span>
      {' · '}
      <Button
        variant="link"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
      >
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </Button>
      {tip}
    </div>
  );
}
