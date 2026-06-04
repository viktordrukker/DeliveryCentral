import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import { Button, Table, type Column } from '@/components/ds';
import { type BenchEnrichedRowDto, fetchEnrichedBench } from '@/lib/api/people-bench';
import { BenchInspector } from './BenchInspector';

const PAGE_SIZE = 12;

/**
 * SCOPED-MIN-6 — Bench KPI drill-down filter (UX Law 5 + Law 9).
 *
 * `?filter=onBench`           — only people currently on the bench
 * `?filter=idleOver14`        — people idle > 14 days
 * `?filter=available`         — people with non-zero 14d availability
 * `?filter=hasSuggestions`    — people with at least one suggested fill
 * Default (no param)          — show everyone (engaged + bench)
 */
type BenchFilter = 'onBench' | 'idleOver14' | 'available' | 'hasSuggestions' | 'all';

function parseFilter(raw: string | null): BenchFilter {
  switch (raw) {
    case 'idleOver14':
    case 'available':
    case 'hasSuggestions':
    case 'onBench':
    case 'all':
      return raw;
    default:
      return 'all';
  }
}

function applyFilter(rows: BenchEnrichedRowDto[], filter: BenchFilter): BenchEnrichedRowDto[] {
  switch (filter) {
    case 'all':
      return rows;
    case 'idleOver14':
      return rows.filter((r) => r.isOnBench && r.daysOnBench > 14);
    case 'available':
      return rows.filter((r) => r.availabilityHours14d > 0);
    case 'hasSuggestions':
      return rows.filter((r) => r.suggestedProjectIds.length > 0);
    case 'onBench':
    default:
      return rows.filter((r) => r.isOnBench);
  }
}

function exportBenchCsv(rows: BenchEnrichedRowDto[]): void {
  const header = ['Name', 'Role', 'Grade', 'Office', 'Days idle', 'Availability 14d (h)', 'Suggested fills'];
  const body = rows.map((r) => [
    r.name,
    r.role,
    r.grade ?? '',
    r.office ?? '',
    r.daysOnBench,
    r.availabilityHours14d,
    r.suggestedProjectIds.length,
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bench.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type Tone = 'active' | 'info' | 'warning' | 'danger';

function daysOnBenchTone(days: number): Tone {
  if (days <= 7) return 'active';
  if (days <= 30) return 'info';
  if (days <= 60) return 'warning';
  return 'danger';
}

// SCOPED-MIN-6 — tc()-style color helper. Thresholds: warn at 14d, danger at 60d.
function daysOnBenchColor(days: number): string {
  if (days > 60) return 'var(--color-status-danger)';
  if (days > 14) return 'var(--color-status-warning)';
  if (days > 7) return 'var(--color-status-info)';
  return 'var(--color-text)';
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
  // V2-A.7 — list-detail layout: clicking a row opens the inspector pane.
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  // V2-A.8 — client-side pagination (endpoint returns the full array).
  const [page, setPage] = useState(1);
  // SCOPED-MIN-6 — KPI drill-down via URL filter (UX Law 5).
  const [searchParams] = useSearchParams();
  const filter = parseFilter(searchParams.get('filter'));

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

  // SCOPED-MIN-6 — apply URL-driven filter before sorting (UX Law 5 + 9).
  const filteredRows = applyFilter(rows, filter);
  // Sort by daysOnBench DESC (longest idle first) per canvas
  const sortedRows = [...filteredRows].sort((a, b) => b.daysOnBench - a.daysOnBench);
  const selectedRow = selectedPersonId ? rows.find((r) => r.personId === selectedPersonId) ?? null : null;

  // V2-A.8 — client-side pagination of the sorted list.
  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // V2-A.9 — inspector stepper navigates the full sorted list and keeps the
  // visible page in sync with the selected row.
  const selectedIndex = selectedPersonId
    ? sortedRows.findIndex((r) => r.personId === selectedPersonId)
    : -1;
  const stepTo = (delta: number): void => {
    const next = selectedIndex + delta;
    if (next < 0 || next >= total) return;
    setSelectedPersonId(sortedRows[next].personId);
    setPage(Math.floor(next / PAGE_SIZE) + 1);
  };

  return (
    <div data-testid="bench-enriched" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* V2-A.7 — page chrome: breadcrumb + idle-total badges + Export */}
      <PageHeader
        eyebrow="People"
        title="Bench"
        breadcrumbs={[{ href: '/people', label: 'People' }, { label: 'Bench' }]}
        badges={
          <>
            <StatusBadge
              tone={summary.idleOver14 > 0 ? 'warning' : 'active'}
              label={`${summary.onBench} on bench`}
              variant="chip"
            />
            {summary.idleOver14 > 0 ? (
              <StatusBadge tone="warning" label={`${summary.idleOver14} idle > 14d`} variant="chip" />
            ) : null}
          </>
        }
        actions={
          <Button variant="secondary" size="sm" type="button" onClick={() => exportBenchCsv(sortedRows)}>
            Export CSV
          </Button>
        }
      />

      {/* 4-tile KPI strip — each tile is a Link drill-down (UX Law 9). */}
      <div className="kpi-strip" data-testid="bench-kpi-strip">
        <Link
          to="/people/bench?filter=onBench"
          className={`kpi tone-${summary.idleOver14 > 0 ? 'warning' : 'active'}`}
          data-testid="bench-kpi-on-bench"
          aria-current={filter === 'onBench' ? 'page' : undefined}
        >
          <span className="kpi-label">On bench</span>
          <span className="kpi-value">{summary.onBench}</span>
          <span className="kpi-foot">avg {summary.avgDays}d idle</span>
        </Link>
        <Link
          to="/people/bench?filter=idleOver14"
          className={`kpi tone-${summary.idleOver14 > 2 ? 'danger' : 'warning'}`}
          data-testid="bench-kpi-idle-14"
          aria-current={filter === 'idleOver14' ? 'page' : undefined}
        >
          <span className="kpi-label">Idle &gt; 14 days</span>
          <span className="kpi-value">{summary.idleOver14}</span>
          <span className="kpi-foot">requires reassignment</span>
        </Link>
        <Link
          to="/people/bench?filter=available"
          className="kpi"
          data-testid="bench-kpi-availability"
          aria-current={filter === 'available' ? 'page' : undefined}
        >
          <span className="kpi-label">Availability · 14d</span>
          <span className="kpi-value">{summary.totalAvailability.toLocaleString()}h</span>
          <span className="kpi-foot">across {rows.length} people</span>
        </Link>
        <Link
          to="/people/bench?filter=hasSuggestions"
          className={`kpi tone-${summary.suggestedFills > 0 ? 'active' : 'info'}`}
          data-testid="bench-kpi-suggested"
          aria-current={filter === 'hasSuggestions' ? 'page' : undefined}
        >
          <span className="kpi-label">Suggested fills</span>
          <span className="kpi-value">{summary.suggestedFills}</span>
          <span className="kpi-foot">from matching engine</span>
        </Link>
      </div>

      {/* V2-A.7 — master-detail layout: list on the left, inspector on the right when a row is selected. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedRow ? 'minmax(0, 1fr) minmax(280px, 360px)' : 'minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
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
                    data-testid={`bench-days-cell-${r.personId}`}
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: daysOnBenchColor(r.daysOnBench),
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
                rows={pageRows}
                getRowKey={(r) => r.personId}
                onRowClick={(r) => setSelectedPersonId(r.personId === selectedPersonId ? null : r.personId)}
                testId="bench-enriched-list"
              />
            );
          })()}
        </div>
        {/* V2-A.8 — pagination footer */}
        <div
          className="dash-action-section__summary"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderTop: '1px solid var(--color-border)',
          }}
          data-testid="bench-pagination"
        >
          <span className="compact muted" style={{ flex: '1 1 0', textAlign: 'left' }}>
            Showing {total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, total)} of {total}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
            >
              ←
            </Button>
            <span className="compact" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
            >
              →
            </Button>
          </span>
          <span style={{ flex: '1 1 0' }} />
        </div>
      </div>

      {selectedRow ? (
        <BenchInspector
          row={selectedRow}
          onClose={() => setSelectedPersonId(null)}
          position={{
            index: selectedIndex,
            total,
            onPrev: selectedIndex > 0 ? () => stepTo(-1) : undefined,
            onNext: selectedIndex >= 0 && selectedIndex < total - 1 ? () => stepTo(1) : undefined,
          }}
        />
      ) : null}
      </div>
    </div>
  );
}
