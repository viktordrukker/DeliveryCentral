import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ds';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  fetchUnifiedCandidateQueue,
  type UnifiedCandidateQueueRow,
} from '@/lib/api/staffing-candidates';

/**
 * LEAN-P4c-2 — unified candidate queue page.
 *
 * RM/PM/DM/director/admin see every ProjectPositionCandidate whose parent
 * position is OPEN or PROPOSED, sorted by oldest-proposed-first. Each row
 * deep-links to the project-position detail surface so the user can act in
 * place.
 *
 * URL params: `page`, `pageSize`, `sort` (`oldest` default, `newest`).
 * Sort is client-side reversal of the FIFO server response so the FE keeps
 * the toggle responsive without round-tripping.
 */

type SortDir = 'oldest' | 'newest';

function formatTimeInQueue(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

function decisionTone(decision: string): 'pending' | 'active' | 'danger' | 'neutral' {
  switch (decision) {
    case 'PICKED':
      return 'active';
    case 'DECLINED':
    case 'AUTO_DECLINED':
      return 'danger';
    case 'PENDING':
      return 'pending';
    default:
      return 'neutral';
  }
}

function decisionLabel(decision: string): string {
  switch (decision) {
    case 'PICKED':
      return 'Picked';
    case 'DECLINED':
      return 'Declined';
    case 'AUTO_DECLINED':
      return 'Auto-declined';
    case 'PENDING':
      return 'Pending';
    default:
      return decision;
  }
}

export function CandidateQueuePage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const pageSizeParam = Number.parseInt(searchParams.get('pageSize') ?? '50', 10);
  const sortParam: SortDir = searchParams.get('sort') === 'newest' ? 'newest' : 'oldest';

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 50;

  const [rows, setRows] = useState<UnifiedCandidateQueueRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetchUnifiedCandidateQueue({ page, pageSize });
        if (!active) return;
        setRows(response.rows);
        setTotal(response.total);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load candidate queue.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, pageSize, reloadTick]);

  const sortedRows = useMemo(() => {
    if (!rows) return null;
    if (sortParam === 'newest') return [...rows].reverse();
    return rows;
  }, [rows, sortParam]);

  function updateParams(next: Record<string, string | null>): void {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(next)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      return params;
    });
  }

  function setSort(next: SortDir): void {
    updateParams({ sort: next === 'oldest' ? null : 'newest' });
  }

  function setPage(next: number): void {
    updateParams({ page: String(next) });
  }

  function setPageSize(next: number): void {
    updateParams({ pageSize: String(next), page: '1' });
  }

  return (
    <PageContainer testId="candidate-queue-page">
      <PageHeader
        eyebrow="Staffing"
        title="Candidate queue"
        subtitle="Every candidate proposed across all open or in-review positions, oldest first."
        badges={
          <StatusBadge
            tone={total > 0 ? 'warning' : 'active'}
            label={`${total} in queue`}
            variant="chip"
          />
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setReloadTick((t) => t + 1)}
            data-testid="candidate-queue-refresh"
          >
            ↻ Refresh
          </Button>
        }
      />

      <div
        style={{ display: 'flex', gap: 6, margin: '4px 0 12px' }}
        data-testid="candidate-queue-sort"
      >
        <Button
          size="sm"
          variant={sortParam === 'oldest' ? 'primary' : 'secondary'}
          onClick={() => setSort('oldest')}
          aria-pressed={sortParam === 'oldest'}
        >
          Oldest first
        </Button>
        <Button
          size="sm"
          variant={sortParam === 'newest' ? 'primary' : 'secondary'}
          onClick={() => setSort('newest')}
          aria-pressed={sortParam === 'newest'}
        >
          Newest first
        </Button>
      </div>

      {loading ? <LoadingState variant="skeleton" skeletonType="cards" /> : null}
      {error ? (
        <ErrorState description={error} onRetry={() => setReloadTick((t) => t + 1)} />
      ) : null}

      {!loading && !error && sortedRows != null ? (
        sortedRows.length === 0 ? (
          <EmptyState
            title="No candidates in the queue"
            description="There are no candidates proposed against open or in-review positions."
            action={{ href: '/staffing-desk', label: 'Go to Staffing Desk' }}
          />
        ) : (
          <div className="card" data-testid="candidate-queue-list-card">
            <div
              className="card-header"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                background: 'var(--color-surface)',
              }}
            >
              <h3>Unified candidate queue</h3>
              <span className="compact muted">
                {total} candidate{total === 1 ? '' : 's'} · sorted by time in queue
              </span>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column' }}
              data-testid="candidate-queue-list"
            >
              {sortedRows.map((row, i) => (
                <div
                  key={row.candidateId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '88px 90px minmax(0, 1.4fr) minmax(0, 1fr) 110px 110px 60px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    borderTop: i === 0 ? 0 : '1px solid var(--color-border-subtle)',
                  }}
                  data-testid={`candidate-queue-row-${row.candidateId}`}
                >
                  <StatusBadge
                    tone={decisionTone(row.decision)}
                    label={decisionLabel(row.decision)}
                    variant="chip"
                  />
                  <span
                    className="compact muted"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    #{row.rank}
                  </span>
                  <div className="body-sm" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      {row.candidateName}
                    </div>
                    <div className="compact muted">{row.role}</div>
                  </div>
                  <div className="body-sm" style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--color-text)' }}>{row.projectName}</div>
                  </div>
                  <span
                    className="compact muted"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatTimeInQueue(row.timeInQueueHours)}
                  </span>
                  <span
                    className="compact muted"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {new Date(row.proposedAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/project-positions/${row.positionPublicId ?? row.positionId}`}
                    style={{
                      color: 'var(--color-accent)',
                      textAlign: 'right',
                      textDecoration: 'none',
                    }}
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="candidates"
              />
            </div>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
