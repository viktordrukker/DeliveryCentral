import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import {
  fetchProjectPulseSummary,
  type PulseSummaryDto,
  type PulseSignalKpi,
} from '@/lib/api/project-pulse';

interface PulseTabProps {
  projectId: string;
}

function signalTone(signal: PulseSignalKpi): 'active' | 'warning' | 'danger' | 'info' | 'neutral' {
  const v = signal.value ?? 0;
  // Simple direction-of-good-news heuristic by key. The aggregator returns
  // a fixed key set (issue 259 — open_positions / budget_variance_pct /
  // milestone_progress / days_to_next_gate / burn_4w).
  const lowerIsBetter = ['open_positions', 'days_to_next_gate', 'burn_4w'].includes(signal.key);
  if (signal.key === 'milestone_progress') {
    if (v >= 90) return 'active';
    if (v >= 60) return 'info';
    return 'warning';
  }
  if (signal.key === 'budget_variance_pct') {
    if (Math.abs(v) <= 5) return 'active';
    if (Math.abs(v) <= 15) return 'warning';
    return 'danger';
  }
  if (lowerIsBetter) {
    if (v === 0) return 'active';
    if (v < 5) return 'info';
    return 'warning';
  }
  return 'info';
}

function formatSignalValue(signal: PulseSignalKpi): string {
  if (signal.value == null) return '—';
  if (signal.unit === '%') return `${signal.value.toFixed(1)}%`;
  if (signal.unit === 'h' || signal.unit === 'hours') return `${signal.value.toFixed(0)}h`;
  if (signal.unit === 'd' || signal.unit === 'days') return `${signal.value.toFixed(0)}d`;
  return signal.value.toLocaleString();
}

/**
 * Phase B1.3 — DS-redesign Project Pulse tab.
 *
 * Renders the headline view for /projects/:id?tab=pulse:
 *   1. KPI strip — signals from the pulse aggregator
 *   2. Activity timeline — recent events from the aggregator
 *
 * Aggregator endpoint: `GET /projects/:id/pulse-summary` (issue 259).
 *
 * Reference mock: DS/page-pulse.jsx (lines 1-386).
 */
export function PulseTab({ projectId }: PulseTabProps): JSX.Element {
  const [data, setData] = useState<PulseSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const summary = await fetchProjectPulseSummary(projectId);
        if (active) {
          setData(summary);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load pulse summary');
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [projectId]);

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState description={error} onRetry={() => window.location.reload()} />;
  }
  if (!data) return <ErrorState description="No pulse data available." />;

  return (
    <div data-testid="pulse-tab" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="kpi-strip" data-testid="pulse-kpi-strip">
        {data.signals.map((signal) => {
          const tone = signalTone(signal);
          return (
            <Link
              key={signal.key}
              className="kpi-strip__item"
              to={`/projects/${projectId}?tab=radiator`}
              style={{ borderLeft: `3px solid var(--color-status-${tone === 'neutral' ? 'info' : tone})` }}
            >
              <TipBalloon tip={signal.explanation} arrow="top" />
              <span className="kpi-strip__value">{formatSignalValue(signal)}</span>
              <span className="kpi-strip__label">{signal.label}</span>
            </Link>
          );
        })}
      </div>

      <SectionCard title="Recent activity">
        {data.activity.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 4px' }}>
            No recent activity recorded for this project.
          </p>
        ) : (
          <ul
            data-testid="pulse-activity"
            style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {data.activity.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 120px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: 13,
                }}
              >
                <StatusBadge tone="info" variant="chip" label={item.eventName} />
                <span style={{ color: 'var(--color-text)' }}>{item.summary}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11, textAlign: 'right' }}>
                  {new Date(item.occurredAt).toLocaleString()}
                  {item.actorDisplayName ? ` · ${item.actorDisplayName}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div style={{ color: 'var(--color-text-subtle)', fontSize: 11, textAlign: 'right' }}>
        Data freshness: {new Date(data.asOf).toLocaleString()}
      </div>
    </div>
  );
}
