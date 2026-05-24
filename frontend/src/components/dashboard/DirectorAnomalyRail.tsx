import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  type DirectorAnomalyDto,
  type DirectorAnomalySeverity,
  fetchDirectorAnomalies,
} from '@/lib/api/dashboard-director';

interface DirectorAnomalyRailProps {
  limit?: number;
}

type Tone = 'active' | 'info' | 'warning' | 'danger' | 'critical';

const SEVERITY_TONE: Record<DirectorAnomalySeverity, Tone> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  critical: 'critical',
};

const KIND_LABEL: Record<DirectorAnomalyDto['kind'], string> = {
  project_rag_dropped: 'RAG · drop',
  utilization_spike: 'Util · spike',
  pending_approval_age: 'SLA · breach',
  budget_overrun: 'Budget · over',
  milestone_slip: 'Milestone · slip',
};

const ACTION_LABEL: Record<DirectorAnomalyDto['kind'], string> = {
  project_rag_dropped: 'Open project',
  utilization_spike: 'Open capacity',
  pending_approval_age: 'Open approval',
  budget_overrun: 'Open budget',
  milestone_slip: 'Open Gantt',
};

/**
 * Phase D3 — DS-canvas "What needs you now" rail.
 *
 * Backed by `GET /api/dashboards/director/anomalies?limit=N` (issue 265).
 * Uses the .ds-refresh class set (.card / .card-header / .tone-dot /
 * .btn-tertiary) landed in D0 so the rail renders the DS canvas shape
 * (DS/page-director.jsx — "What needs you now"):
 *
 *   ┌─ What needs you now ─────────── 5 items · prioritized ──┐
 *   │ •  Budget · Mercury   Re-baseline Q3 −$184k  [Open ▸]  │
 *   │ •  Position · MCB-UK  COBOL specialist 30d   [Open ▸]  │
 *   │ ...                                                    │
 *   └────────────────────────────────────────────────────────┘
 *
 * Each row uses a colored .tone-dot (size 8px) instead of a chunky chip;
 * the kind label is rendered as a muted compact span; the body is body-sm;
 * the CTA is .btn-tertiary.btn-sm with an inline arrow.
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
      <div className="card" data-testid="director-anomaly-rail-empty">
        <div className="card-header">
          <h3>What needs you now</h3>
          <span className="compact muted">All clear</span>
        </div>
        <div className="card-body">
          <p className="compact muted" style={{ margin: 0 }}>
            No anomalies detected. Director dashboard is quiet — nothing requires immediate
            attention.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" data-testid="director-anomaly-rail">
      <div className="card-header">
        <h3>What needs you now</h3>
        <span className="compact muted">
          {items.length} item{items.length === 1 ? '' : 's'} · prioritized by severity × decay
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((item, i) => {
          const tone = SEVERITY_TONE[item.severity];
          return (
            <div
              key={`${item.kind}-${item.detectedAt}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 20px',
                borderTop: i === 0 ? 0 : '1px solid var(--color-border-subtle)',
              }}
            >
              <span
                className={`tone-dot tone-${tone}`}
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              />
              <span
                className="compact muted"
                style={{ minWidth: 140, fontVariantNumeric: 'tabular-nums' }}
              >
                {KIND_LABEL[item.kind]}
              </span>
              <div className="body-sm" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.title}</span>
                <span className="muted" style={{ marginLeft: 8 }}>
                  {item.detail}
                </span>
              </div>
              <Link
                to={item.href}
                className="btn btn-tertiary btn-sm"
                style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                {ACTION_LABEL[item.kind]} →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
