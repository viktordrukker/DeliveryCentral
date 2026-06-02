import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { Avatar } from '@/components/ds/Avatar';
import { Button } from '@/components/ds';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ApprovalInspector } from '@/components/approvals/ApprovalInspector';
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
  { id: 'timesheet', label: 'Timesheets' },
];

type SourceTone = 'info' | 'warning' | 'danger' | 'critical' | 'active';

const SOURCE_TONE: Record<ApprovalQueueSource, SourceTone> = {
  'position-proposal': 'warning',
  budget: 'danger',
  activation: 'info',
  leave: 'info',
  case: 'warning',
  'skill-review': 'info',
  timesheet: 'info',
};

// B24 — per-source glyphs for the filter chips (and reusable elsewhere).
const SOURCE_ICON: Record<ApprovalQueueSource | 'all', string> = {
  all: '◆', // ◆
  'position-proposal': '\u{1F9E9}', // 🧩
  budget: '\u{1F4B0}', // 💰
  activation: '\u{1F680}', // 🚀
  leave: '\u{1F334}', // 🌴
  case: '\u{1F4CB}', // 📋
  'skill-review': '\u{1F393}', // 🎓
  timesheet: '⏱',
};

const SOURCE_LABEL: Record<ApprovalQueueSource, string> = {
  'position-proposal': 'Position',
  budget: 'Budget',
  activation: 'Activation',
  leave: 'Leave',
  case: 'Case',
  'skill-review': 'Skill',
  timesheet: 'Timesheets',
};

const SLA_TONE: Record<SlaStage, 'active' | 'warning' | 'danger'> = {
  'on-track': 'active',
  'due-soon': 'warning',
  breached: 'danger',
};

const SLA_LABEL: Record<SlaStage, string> = {
  'on-track': 'On track',
  'due-soon': 'Due soon',
  breached: 'Breached',
};

function isValidSource(s: string | null): s is ApprovalQueueSource | 'all' {
  return !!s && SOURCES.some((src) => src.id === s);
}

function ageLabel(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Phase D5 — Approvals queue full canvas fidelity.
 *
 * Backed by `GET /api/approvals/unified` (issue 264). Renders the merged
 * approvals across six sources using the .ds-refresh class set (D0):
 *   - Source filter chips (.chip / .chip-active)
 *   - Card-wrapped list with per-row tone-dot + source label + title +
 *     project + submitter + when + SLA badge + Open deep-link
 *
 * Reference: DS/page-approvals.jsx queue list.
 */
export function ApprovalsPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceParam = searchParams.get('source');
  const activeFilter: ApprovalQueueSource | 'all' = isValidSource(sourceParam)
    ? sourceParam
    : 'all';
  const [items, setItems] = useState<ApprovalQueueItemDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // V2-A.5 — selected row drives the right-pane one-screen-approval inspector.
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  // B24 — header Refresh re-triggers the load effect.
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const sources =
          activeFilter === 'all' ? undefined : [activeFilter as ApprovalQueueSource];
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
  }, [activeFilter, reloadTick]);

  // B24 — SLA-breach count drives a header alert badge.
  const breachedCount = items?.filter((it) => it.slaStage === 'breached').length ?? 0;

  function setFilter(id: ApprovalQueueSource | 'all'): void {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === 'all') next.delete('source');
      else next.set('source', id);
      return next;
    });
  }

  // Aggregate counts for the filter chips
  const counts = items
    ? items.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.source] = (acc[item.source] ?? 0) + 1;
          return acc;
        },
        { all: items.length },
      )
    : {};

  return (
    <PageContainer testId="approvals-page">
      <PageHeader
        eyebrow="Workspace"
        title="Approvals"
        subtitle="Unified queue across position proposals, budgets, activations, leave, cases, and skill reviews."
        badges={
          <>
            <StatusBadge
              tone={total > 0 ? 'warning' : 'active'}
              label={`${total} awaiting`}
              variant="chip"
            />
            {breachedCount > 0 ? (
              <StatusBadge tone="danger" label={`${breachedCount} SLA breached`} variant="chip" />
            ) : null}
          </>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setReloadTick((t) => t + 1)}
            data-testid="approvals-refresh"
          >
            ↻ Refresh
          </Button>
        }
      />

      {/* Source filter chips */}
      <div
        className="approvals-filters"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 12px' }}
        data-testid="approvals-filters"
      >
        {SOURCES.map((src) => {
          const isActive = src.id === activeFilter;
          const count = counts[src.id] ?? 0;
          return (
            <Button
              key={src.id}
              size="sm"
              variant={isActive ? 'primary' : 'secondary'}
              onClick={() => setFilter(src.id)}
              aria-pressed={isActive}
            >
              <span aria-hidden style={{ marginRight: 5 }}>{SOURCE_ICON[src.id]}</span>
              {src.label}
              {count > 0 ? (
                <span
                  style={{
                    marginLeft: 6,
                    fontVariantNumeric: 'tabular-nums',
                    opacity: 0.85,
                  }}
                >
                  · {count}
                </span>
              ) : null}
            </Button>
          );
        })}
      </div>

      {loading ? <LoadingState variant="skeleton" skeletonType="cards" /> : null}
      {error ? <ErrorState description={error} onRetry={() => setFilter(activeFilter)} /> : null}

      {!loading && !error && items != null ? (
        items.length === 0 ? (
          <div className="card" data-testid="approvals-empty">
            <div className="card-header">
              <h3>Inbox zero</h3>
            </div>
            <div className="card-body">
              <p className="compact muted" style={{ margin: 0 }}>
                {activeFilter === 'all'
                  ? 'There are no approvals waiting in the unified queue.'
                  : `No items in the ${SOURCES.find((s) => s.id === activeFilter)?.label} queue.`}
              </p>
            </div>
          </div>
        ) : (() => {
          const selectedItem = selectedItemKey
            ? items.find((it) => `${it.source}-${it.id}` === selectedItemKey) ?? null
            : null;
          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: selectedItem
                  ? 'minmax(0, 1fr) minmax(320px, 380px)'
                  : 'minmax(0, 1fr)',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <div className="card" data-testid="approvals-list-card">
                {/* B24 — sticky header keeps the queue title/count + sort
                    legend visible while scrolling a long list. */}
                <div
                  className="card-header"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: 'var(--color-surface)',
                  }}
                >
                  <h3>
                    {activeFilter === 'all'
                      ? 'All approvals'
                      : SOURCES.find((s) => s.id === activeFilter)?.label}
                  </h3>
                  <span className="compact muted">
                    {total} item{total === 1 ? '' : 's'} · sorted by SLA × age
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }} data-testid="approvals-list">
                  {items.map((item, i) => {
                    const tone = SOURCE_TONE[item.source];
                    const key = `${item.source}-${item.id}`;
                    const isActive = key === selectedItemKey;
                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedItemKey(isActive ? null : key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedItemKey(isActive ? null : key);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '12px 20px',
                          borderTop:
                            i === 0 ? 0 : '1px solid var(--color-border-subtle)',
                          background: isActive ? 'var(--color-surface-alt)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        aria-pressed={isActive}
                      >
                        <span
                          className={`tone-dot tone-${tone}`}
                          style={{ flexShrink: 0 }}
                          aria-hidden="true"
                        />
                        <span
                          className="compact muted"
                          style={{ minWidth: 80, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {SOURCE_LABEL[item.source]}
                        </span>
                        {item.submittedBy ? (
                          <Avatar name={item.submittedBy.displayName} size="xs" />
                        ) : (
                          <span style={{ width: 20 }} />
                        )}
                        <div className="body-sm" style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </div>
                          <div className="compact muted" style={{ marginTop: 2 }}>
                            {item.submittedBy?.displayName ?? 'unknown submitter'} ·{' '}
                            {ageLabel(item.ageHours)}
                          </div>
                        </div>
                        {item.slaStage ? (
                          <span
                            className={`badge badge-${SLA_TONE[item.slaStage]}`}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <span className="dot" />
                            {SLA_LABEL[item.slaStage]}
                          </span>
                        ) : (
                          <span className="compact muted" style={{ whiteSpace: 'nowrap' }}>
                            no SLA
                          </span>
                        )}
                        <Link
                          to={item.href}
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-tertiary btn-sm"
                          style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Open →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedItem ? (
                <ApprovalInspector
                  item={selectedItem}
                  onClose={() => setSelectedItemKey(null)}
                />
              ) : null}
            </div>
          );
        })()
      ) : null}
    </PageContainer>
  );
}
