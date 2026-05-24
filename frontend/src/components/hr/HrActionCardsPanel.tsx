import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import {
  type HrActionCardDto,
  type HrActionCardSeverity,
  fetchHrActionCards,
} from '@/lib/api/hr-actions';

const SEVERITY_TONE: Record<HrActionCardSeverity, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
};

const KIND_LABEL: Record<HrActionCardDto['kind'], string> = {
  probation_ending: 'Probation',
  contract_expiring: 'Contract',
  certification_stale: 'Cert',
  missing_documentation: 'Docs',
  hr_review_due: 'Review',
};

function daysUntil(dueAt: string): number {
  const due = new Date(dueAt + 'T00:00:00Z').getTime();
  return Math.ceil((due - Date.now()) / 86400000);
}

interface HrActionCardsPanelProps {
  pageSize?: number;
}

/**
 * Phase B2 (HR slice) — HR action cards rail.
 *
 * Backed by `GET /api/hr/action-cards` (issue 263). Renders one card per HR
 * action prompt (probation ending, contract expiring, certification stale,
 * missing documentation, HR review due) with severity tone, due-in days,
 * and a deep-link to the person.
 *
 * Reference: DS/page-directory-hr.jsx — HR Actions tab.
 */
export function HrActionCardsPanel({ pageSize = 50 }: HrActionCardsPanelProps): JSX.Element {
  const [items, setItems] = useState<HrActionCardDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const rows = await fetchHrActionCards({ pageSize });
        if (active) {
          setItems(rows);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load HR actions');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [pageSize]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="cards" />;
  if (error) return <ErrorState description={error} />;

  return (
    <SectionCard title="HR action cards">
      {!items || items.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 4px' }}>
          No HR actions pending — nothing requires immediate attention.
        </p>
      ) : (
        <ul
          data-testid="hr-action-cards"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {items.map((item) => {
            const tone = SEVERITY_TONE[item.severity];
            const days = daysUntil(item.dueAt);
            const dueLabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`;
            return (
              <li
                key={`${item.kind}-${item.personId}-${item.dueAt}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 96px auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 6,
                  borderLeft: `3px solid var(--color-status-${tone})`,
                }}
              >
                <Avatar name={item.personName} size="sm" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                    {item.personName}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.message}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                  <StatusBadge tone={tone} variant="chip" label={KIND_LABEL[item.kind]} />
                  <span style={{ fontSize: 10, color: days < 0 ? 'var(--color-status-danger)' : 'var(--color-text-subtle)' }}>
                    Due {dueLabel}
                  </span>
                </div>
                <Link
                  to={item.href}
                  style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}
                >
                  Open →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
