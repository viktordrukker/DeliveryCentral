import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { Avatar } from '@/components/ds/Avatar';
import { type BenchEnrichedRowDto, fetchEnrichedBench } from '@/lib/api/people-bench';

type Tone = 'active' | 'info' | 'warning' | 'danger';

function daysOnBenchTone(days: number): Tone {
  if (days <= 7) return 'active';
  if (days <= 30) return 'info';
  if (days <= 60) return 'warning';
  return 'danger';
}

/**
 * Phase D4 — DS-canvas full-fidelity Bench panel.
 *
 * Backed by `GET /api/people/bench` (issue 261). Uses the .ds-refresh
 * class set (D0): KPI strip + .card.table-compact + .tone-dot + .badge,
 * matching DS/page-bench.jsx.
 *
 * Layout:
 *   1. 4-tile KPI strip (On bench / Idle >14d / Total availability /
 *      Suggested fills)
 *   2. .card with .table.table-compact listing each person with Avatar
 *      + role/grade/office + days-on-bench + 14d availability + suggested
 *      matches count + deep-link
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
    const onBench = rows.filter((r) => r.isOnBench);
    const idleOver14 = onBench.filter((r) => r.daysOnBench > 14).length;
    const totalAvailability = rows.reduce((sum, r) => sum + r.availabilityHours14d, 0);
    const suggestedFills = rows.reduce((sum, r) => sum + r.suggestedProjectIds.length, 0);
    const avgDays =
      onBench.length === 0
        ? 0
        : Math.round(onBench.reduce((s, r) => s + r.daysOnBench, 0) / onBench.length);
    return { onBench: onBench.length, idleOver14, totalAvailability, suggestedFills, avgDays };
  }, [rows]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="table" />;
  if (error) return <ErrorState description={error} />;
  if (!rows) return <ErrorState description="No bench data available." />;

  if (rows.length === 0 || !summary) {
    return (
      <div className="card" data-testid="bench-empty">
        <div className="card-header">
          <h3>Bench</h3>
        </div>
        <div className="card-body">
          <p className="compact muted" style={{ margin: 0 }}>
            All people currently have active project assignments.
          </p>
        </div>
      </div>
    );
  }

  // Sort by daysOnBench DESC (longest idle first) per canvas
  const sortedRows = [...rows].sort((a, b) => b.daysOnBench - a.daysOnBench);

  return (
    <div data-testid="bench-enriched" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 4-tile KPI strip */}
      <div className="kpi-strip" data-testid="bench-kpi-strip">
        <div className={`kpi tone-${summary.idleOver14 > 0 ? 'warning' : 'active'}`}>
          <span className="kpi-label">On bench</span>
          <span className="kpi-value">{summary.onBench}</span>
          <span className="kpi-foot">avg {summary.avgDays}d idle</span>
        </div>
        <div className={`kpi tone-${summary.idleOver14 > 2 ? 'danger' : 'warning'}`}>
          <span className="kpi-label">Idle &gt; 14 days</span>
          <span className="kpi-value">{summary.idleOver14}</span>
          <span className="kpi-foot">requires reassignment</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Availability · 14d</span>
          <span className="kpi-value">{summary.totalAvailability.toLocaleString()}h</span>
          <span className="kpi-foot">across {rows.length} people</span>
        </div>
        <div className={`kpi tone-${summary.suggestedFills > 0 ? 'active' : 'info'}`}>
          <span className="kpi-label">Suggested fills</span>
          <span className="kpi-value">{summary.suggestedFills}</span>
          <span className="kpi-foot">from matching engine</span>
        </div>
      </div>

      {/* Bench list — compact canvas table */}
      <div className="card">
        <div className="card-header">
          <h3>Bench ({rows.length})</h3>
          <span className="compact muted">
            Sorted by days off project, longest first
          </span>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table className="table table-compact" data-testid="bench-enriched-list">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role / Grade / Office</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Days idle</th>
                <th style={{ textAlign: 'right' }}>Avail · 14d</th>
                <th style={{ textAlign: 'right' }}>Suggested</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const tone = daysOnBenchTone(row.daysOnBench);
                return (
                  <tr key={row.personId}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={row.name} size="xs" />
                        <span style={{ fontWeight: 500 }}>{row.name}</span>
                      </span>
                    </td>
                    <td>
                      <span className="compact muted">
                        {row.role}
                        {row.grade ? ` · ${row.grade}` : ''}
                        {row.office ? ` · ${row.office}` : ''}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${row.isOnBench ? tone : 'active'}`}>
                        <span className="dot" />
                        {row.isOnBench ? 'On bench' : 'Engaged'}
                      </span>
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color:
                          row.daysOnBench > 60
                            ? 'var(--color-status-danger)'
                            : row.daysOnBench > 14
                              ? 'var(--color-status-warning)'
                              : 'var(--color-text)',
                      }}
                    >
                      {row.daysOnBench}d
                    </td>
                    <td
                      className="mono"
                      style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {row.availabilityHours14d}h
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.suggestedProjectIds.length > 0 ? (
                        <span className="badge badge-info">
                          {row.suggestedProjectIds.length} match
                          {row.suggestedProjectIds.length === 1 ? '' : 'es'}
                        </span>
                      ) : (
                        <span className="compact muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/people/${row.personId}`}
                        className="compact"
                        style={{
                          color: 'var(--color-accent)',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
