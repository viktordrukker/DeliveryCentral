import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import {
  type ApprovalQueueItemDto,
  type ApprovalQueueSource,
  type SlaStage,
  fetchUnifiedApprovals,
} from '@/lib/api/approvals-unified';

const SOURCES: { id: ApprovalQueueSource | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'position-proposal', label: 'Position proposals' },
  { id: 'budget', label: 'Budget' },
  { id: 'activation', label: 'Activations' },
  { id: 'leave', label: 'Leave' },
  { id: 'case', label: 'Cases' },
  { id: 'skill-review', label: 'Skill reviews' },
];

const SOURCE_LABEL: Record<ApprovalQueueSource, string> = {
  'position-proposal': 'Position',
  budget: 'Budget',
  activation: 'Activation',
  leave: 'Leave',
  case: 'Case',
  'skill-review': 'Skill',
};

const SLA_TONE: Record<SlaStage, 'active' | 'warning' | 'danger'> = {
  'on-track': 'active',
  'due-soon': 'warning',
  breached: 'danger',
};

function isValidSource(s: string | null): s is ApprovalQueueSource | 'all' {
  return !!s && SOURCES.some((src) => src.id === s);
}

function ageLabel(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Phase B3 — unified approvals queue page.
 *
 * Backed by `GET /api/approvals/unified` (issue 264, BE shipped). Renders
 * the merged approvals across six sources (position-proposal / budget /
 * activation / leave / case / skill-review) with source filter + SLA
 * badges + deep-link per row.
 *
 * Reference: DS/page-approvals.jsx.
 */
export function ApprovalsPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceParam = searchParams.get('source');
  const activeFilter: ApprovalQueueSource | 'all' = isValidSource(sourceParam) ? sourceParam : 'all';
  const [items, setItems] = useState<ApprovalQueueItemDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const sources = activeFilter === 'all' ? undefined : [activeFilter as ApprovalQueueSource];
        const response = await fetchUnifiedApprovals({ sources, pageSize: 100 });
        if (active) {
          setItems(response.items);
          setTotal(response.total);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load approvals');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [activeFilter]);

  function setFilter(id: ApprovalQueueSource | 'all'): void {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === 'all') next.delete('source');
      else next.set('source', id);
      return next;
    });
  }

  return (
    <PageContainer testId="approvals-page">
      <PageHeader
        eyebrow="Workspace"
        title="Approvals"
        subtitle="Unified queue across position proposals, budgets, activations, leave, cases, and skill reviews."
      />

      <div
        className="approvals-filters"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12,
          padding: '4px 0',
        }}
      >
        {SOURCES.map((src) => {
          const active = src.id === activeFilter;
          return (
            <button
              key={src.id}
              type="button"
              onClick={() => setFilter(src.id)}
              className={active ? 'chip chip--active' : 'chip'}
              style={{
                background: active ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                color: active ? 'var(--color-text-inverse)' : 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 12,
                padding: '4px 12px',
              }}
            >
              {src.label}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingState variant="skeleton" skeletonType="cards" /> : null}
      {error ? <ErrorState description={error} onRetry={() => setFilter(activeFilter)} /> : null}

      {!loading && !error && items != null ? (
        items.length === 0 ? (
          <EmptyState
            title="Inbox zero"
            description={
              activeFilter === 'all'
                ? 'There are no approvals waiting in the unified queue.'
                : `No items in the ${SOURCES.find((s) => s.id === activeFilter)?.label} queue.`
            }
          />
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 8px 4px' }}>
              {total} item{total === 1 ? '' : 's'}
            </p>
            <ul
              data-testid="approvals-list"
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {items.map((item) => (
                <li
                  key={`${item.source}-${item.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '88px 28px 1fr 120px 80px 60px',
                    gap: 10,
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    borderLeft:
                      item.slaStage && item.slaStage !== 'on-track'
                        ? `3px solid var(--color-status-${SLA_TONE[item.slaStage]})`
                        : '3px solid var(--color-border)',
                  }}
                >
                  <StatusBadge tone="info" variant="chip" label={SOURCE_LABEL[item.source]} />
                  {item.submittedBy ? (
                    <Avatar name={item.submittedBy.displayName} size="xs" />
                  ) : (
                    <span />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {item.submittedBy?.displayName ?? 'unknown'} ·{' '}
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    {item.slaDueAt ? `Due ${new Date(item.slaDueAt).toLocaleDateString()}` : '—'}
                  </span>
                  {item.slaStage ? (
                    <StatusBadge tone={SLA_TONE[item.slaStage]} variant="chip" label={item.slaStage} />
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', textAlign: 'right' }}>
                      {ageLabel(item.ageHours)}
                    </span>
                  )}
                  <Link
                    to={item.href}
                    style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', textAlign: 'right' }}
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
    </PageContainer>
  );
}
