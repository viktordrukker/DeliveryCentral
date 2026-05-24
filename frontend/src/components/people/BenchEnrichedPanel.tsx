import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import {
  type BenchEnrichedRowDto,
  fetchEnrichedBench,
} from '@/lib/api/people-bench';

function daysOnBenchTone(days: number): 'active' | 'info' | 'warning' | 'danger' {
  if (days <= 7) return 'active';
  if (days <= 30) return 'info';
  if (days <= 60) return 'warning';
  return 'danger';
}

/**
 * Phase B2 — enriched bench panel.
 *
 * Backed by `GET /api/people/bench` (issue 261). Renders the bench enriched
 * with role / office / grade / days-on-bench / 14d-availability and a
 * deep-link to each person profile.
 *
 * Reference: DS/page-bench.jsx.
 */
export function BenchEnrichedPanel(): JSX.Element {
  const [rows, setRows] = useState<BenchEnrichedRowDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchEnrichedBench();
        if (active) {
          setRows(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load bench');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    if (!rows) return null;
    const onBench = rows.filter((r) => r.isOnBench).length;
    const totalAvailability = rows.reduce((sum, r) => sum + r.availabilityHours14d, 0);
    const avgDays = onBench === 0 ? 0 : rows.filter((r) => r.isOnBench).reduce((s, r) => s + r.daysOnBench, 0) / onBench;
    return { onBench, totalAvailability, avgDays: Math.round(avgDays) };
  }, [rows]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="table" />;
  if (error) return <ErrorState description={error} />;
  if (!rows) return <ErrorState description="No bench data available." />;

  if (rows.length === 0) {
    return (
      <SectionCard title="Bench">
        <EmptyState
          title="No one on bench"
          description="All people currently have active project assignments."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Bench ({rows.length})</span>
          {summary ? (
            <span style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 400 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                {summary.onBench} on bench
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                avg {summary.avgDays}d
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                {summary.totalAvailability.toLocaleString()}h available (14d)
              </span>
            </span>
          ) : null}
        </span>
      }
    >
      <ul
        data-testid="bench-enriched-list"
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {rows.map((row) => {
          const tone = daysOnBenchTone(row.daysOnBench);
          return (
            <li
              key={row.personId}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 120px 80px 110px 70px 60px',
                gap: 10,
                alignItems: 'center',
                padding: '6px 10px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                borderLeft: row.isOnBench
                  ? `3px solid var(--color-status-${tone})`
                  : '3px solid var(--color-border)',
              }}
            >
              <Avatar name={row.name} size="xs" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
                  {row.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {row.role}
                  {row.grade ? ` · ${row.grade}` : ''}
                  {row.office ? ` · ${row.office}` : ''}
                </span>
              </div>
              <StatusBadge
                tone={row.isOnBench ? tone : 'active'}
                variant="chip"
                label={row.isOnBench ? 'On bench' : 'Engaged'}
              />
              <span
                style={{
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  color: row.daysOnBench > 60 ? 'var(--color-status-danger)' : 'var(--color-text-muted)',
                }}
              >
                {row.daysOnBench}d
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  color: 'var(--color-text)',
                }}
              >
                {row.availabilityHours14d}h / 14d
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', textAlign: 'right' }}>
                {row.suggestedProjectIds.length > 0
                  ? `${row.suggestedProjectIds.length} match${row.suggestedProjectIds.length === 1 ? '' : 'es'}`
                  : '—'}
              </span>
              <Link
                to={`/people/${row.personId}`}
                style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', textAlign: 'right' }}
              >
                Open →
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
