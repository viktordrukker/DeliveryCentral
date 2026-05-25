import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { Avatar } from '@/components/ds/Avatar';
import { Table, type Column } from '@/components/ds';
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
          {(() => {
            const columns: Column<BenchEnrichedRowDto>[] = [
              {
                key: 'person',
                title: 'Person',
                getValue: (r) => r.name,
                render: (r) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={r.name} size="xs" />
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                  </span>
                ),
              },
              {
                key: 'role',
                title: 'Role / Grade / Office',
                getValue: (r) => `${r.role}${r.grade ? ` ${r.grade}` : ''}${r.office ? ` ${r.office}` : ''}`,
                render: (r) => (
                  <span className="compact muted">
                    {r.role}
                    {r.grade ? ` · ${r.grade}` : ''}
                    {r.office ? ` · ${r.office}` : ''}
                  </span>
                ),
              },
              {
                key: 'status',
                title: 'Status',
                getValue: (r) => (r.isOnBench ? 'On bench' : 'Engaged'),
                render: (r) => {
                  const tone = daysOnBenchTone(r.daysOnBench);
                  return (
                    <span className={`badge badge-${r.isOnBench ? tone : 'active'}`}>
                      <span className="dot" />
                      {r.isOnBench ? 'On bench' : 'Engaged'}
                    </span>
                  );
                },
              },
              {
                key: 'daysIdle',
                title: 'Days idle',
                align: 'right',
                getValue: (r) => r.daysOnBench,
                render: (r) => (
                  <span
                    className="mono"
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        r.daysOnBench > 60
                          ? 'var(--color-status-danger)'
                          : r.daysOnBench > 14
                            ? 'var(--color-status-warning)'
                            : 'var(--color-text)',
                    }}
                  >
                    {r.daysOnBench}d
                  </span>
                ),
              },
              {
                key: 'avail',
                title: 'Avail · 14d',
                align: 'right',
                getValue: (r) => r.availabilityHours14d,
                render: (r) => (
                  <span className="mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.availabilityHours14d}h
                  </span>
                ),
              },
              {
                key: 'suggested',
                title: 'Suggested',
                align: 'right',
                getValue: (r) => r.suggestedProjectIds.length,
                render: (r) =>
                  r.suggestedProjectIds.length > 0 ? (
                    <span className="badge badge-info">
                      {r.suggestedProjectIds.length} match
                      {r.suggestedProjectIds.length === 1 ? '' : 'es'}
                    </span>
                  ) : (
                    <span className="compact muted">—</span>
                  ),
              },
              {
                key: 'open',
                title: '',
                align: 'right',
                getValue: () => '',
                render: (r) => (
                  <Link
                    to={`/people/${r.personId}`}
                    className="compact"
                    style={{
                      color: 'var(--color-accent)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Open →
                  </Link>
                ),
              },
            ];
            return (
              <Table
                variant="compact"
                columns={columns}
                rows={sortedRows}
                getRowKey={(r) => r.personId}
                data-testid="bench-enriched-list"
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
