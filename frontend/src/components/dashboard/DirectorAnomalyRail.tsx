import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  type DirectorAnomalyDto,
  type DirectorAnomalySeverity,
  fetchDirectorAnomalies,
} from '@/lib/api/dashboard-director';

interface DirectorAnomalyRailProps {
  limit?: number;
}

const SEVERITY_TONE: Record<DirectorAnomalySeverity, 'info' | 'warning' | 'danger' | 'neutral'> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  critical: 'danger',
};

const KIND_LABEL: Record<DirectorAnomalyDto['kind'], string> = {
  project_rag_dropped: 'RAG drop',
  utilization_spike: 'Utilization',
  pending_approval_age: 'SLA',
  budget_overrun: 'Budget',
  milestone_slip: 'Milestone',
};

/**
 * Phase B3 — "What needs you now" anomaly rail for the Director Dashboard.
 *
 * Backed by `GET /api/dashboards/director/anomalies?limit=N` (issue 265,
 * shipped in PR 277). Renders the top-N anomalies sorted server-side by
 * severity DESC × decayRate DESC. Each card deep-links via `href`.
 *
 * Reference: DS/page-director.jsx — "What needs you now" rail.
 */
export function DirectorAnomalyRail({ limit = 5 }: DirectorAnomalyRailProps): JSX.Element {
  const [items, setItems] = useState<DirectorAnomalyDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const rows = await fetchDirectorAnomalies(limit);
        if (active) {
          setItems(rows);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load anomalies');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [limit]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="cards" />;
  if (error) return <ErrorState description={error} />;
  if (!items || items.length === 0) {
    return (
      <SectionCard title="What needs you now">
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 4px' }}>
          No anomalies detected. Director dashboard is quiet — nothing requires immediate attention.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="What needs you now">
      <ul
        data-testid="director-anomaly-rail"
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {items.map((item, i) => {
          const tone = SEVERITY_TONE[item.severity];
          return (
            <li
              key={`${item.kind}-${item.detectedAt}-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--color-surface-alt)',
                borderRadius: 6,
                borderLeft: `3px solid var(--color-status-${tone === 'neutral' ? 'info' : tone})`,
              }}
            >
              <StatusBadge tone={tone} variant="chip" label={KIND_LABEL[item.kind]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.detail}</span>
              </div>
              <Link
                to={item.href}
                className="ds-link"
                style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                Go →
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
