import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import { Button, Checkbox, SearchInput, Select, Table, type Column } from '@/components/ds';
import { CreatePositionDrawer } from '@/components/staffing-requests/CreatePositionDrawer';
import { type BenchEnrichedRowDto, fetchEnrichedBench } from '@/lib/api/people-bench';
import { BenchInspector } from './BenchInspector';

const PAGE_SIZE = 12;

/**
 * SoT PR 17h-bench — DS-canvas sort options. Cost/day and Best match degrade
 * to "Longest idle" when the source data lacks the required fields
 * (BenchEnrichedRowDto carries neither a cost rate nor a per-person match
 * score today). The options are kept in the dropdown so the canvas grammar
 * holds; selecting them is a no-op fallback rather than a hidden surprise.
 */
type BenchSort = 'days' | 'cost' | 'match';
function parseSort(raw: string | null): BenchSort {
  return raw === 'cost' || raw === 'match' ? raw : 'days';
}

/**
 * SoT PR 17h-bench — DS-canvas additional filter chips. Composable with the
 * URL `?filter=...` KPI drill-down (UX Law 5). Available-now is satisfied by
 * availabilityHours14d > 0; engineering matches role substrings; L4+ matches
 * grade letter ≥ L4.
 */
type ChipKey = 'idleOver7' | 'engineering' | 'l4plus' | 'availableNow';
const CHIP_LABELS: Record<ChipKey, string> = {
  idleOver7: 'Idle > 7d',
  engineering: 'Engineering',
  l4plus: 'L4 +',
  availableNow: 'Available now',
};
const CHIP_ORDER: ChipKey[] = ['idleOver7', 'engineering', 'l4plus', 'availableNow'];

function chipPredicate(chip: ChipKey, row: BenchEnrichedRowDto): boolean {
  switch (chip) {
    case 'idleOver7':
      return row.daysOnBench > 7;
    case 'engineering':
      return /engineer/i.test(row.role);
    case 'l4plus': {
      const m = (row.grade ?? '').match(/L(\d+)/i);
      return m ? Number(m[1]) >= 4 : false;
    }
    case 'availableNow':
      return row.availabilityHours14d > 0;
  }
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseFilter(searchParams.get('filter'));
  // SoT PR 17h-bench — DS-canvas search + chips + sort + selection.
  // Search and chips are local UI state (not URL-persisted) to keep this PR
  // additive; the existing `?filter=` KPI drill-down stays the single URL
  // contract per UX Law 5.
  const [search, setSearch] = useState('');
  const [activeChips, setActiveChips] = useState<Set<ChipKey>>(() => new Set());
  const sort = parseSort(searchParams.get('sort'));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  // PR-11 — single-person "Suggest position" opens the create-position drawer
  // armed with the candidate (pinned + auto-proposed after create).
  const [proposeCandidate, setProposeCandidate] = useState<{
    personId: string;
    name: string;
  } | null>(null);

  function toggleChip(chip: ChipKey): void {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
    setPage(1);
  }

  function setSortParam(next: BenchSort): void {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'days') params.delete('sort');
      else params.set('sort', next);
      return params;
    });
  }

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
      <div data-testid="bench-empty">
        <SectionCard title="Bench">
          <p className="compact muted" style={{ margin: 0 }}>
            All people currently have active project assignments.
          </p>
        </SectionCard>
      </div>
    );
  }

  // SCOPED-MIN-6 — apply URL-driven filter before sorting (UX Law 5 + 9).
  const filterScoped = applyFilter(rows, filter);
  // SoT PR 17h-bench — narrow further by search text + active chips. Composes
  // with the KPI drill-down (UX Law 5).
  const searchLc = search.trim().toLowerCase();
  const filteredRows = filterScoped.filter((r) => {
    if (searchLc) {
      const haystack = [r.name, r.role, r.grade ?? '', r.office ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchLc)) return false;
    }
    for (const chip of activeChips) {
      if (!chipPredicate(chip, r)) return false;
    }
    return true;
  });
  // Sort selection — canvas grammar: Longest idle (default), Cost / day,
  // Best match. The DTO has neither cost nor match score today, so those
  // two options degrade to the default (longest idle) sort.
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

      {/* SoT PR 17h-bench — DS-canvas filter bar (DS/page-bench.jsx L62–79).
          Search by name/role/grade/office, composable chip toggles, and the
          canvas sort dropdown. */}
      <div
        className="filter-bar"
        data-testid="bench-filter-bar"
        style={{ position: 'static', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
      >
        <div style={{ width: 280 }}>
          <SearchInput
            value={search}
            onValueChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder="Name, role, skill…"
            aria-label="Search bench"
            data-testid="bench-search"
          />
        </div>
        {CHIP_ORDER.map((chip) => {
          const active = activeChips.has(chip);
          return (
            <Button
              key={chip}
              variant={active ? 'primary' : 'secondary'}
              size="sm"
              type="button"
              aria-pressed={active}
              onClick={() => toggleChip(chip)}
              data-testid={`bench-chip-${chip}`}
            >
              {CHIP_LABELS[chip]}
            </Button>
          );
        })}
        <div style={{ flex: 1 }} />
        <span
          className="compact muted"
          style={{ color: 'var(--color-text-muted)', fontSize: 12 }}
        >
          Sort:
        </span>
        <Select
          value={sort}
          onChange={(event) => setSortParam(event.target.value as BenchSort)}
          aria-label="Sort bench"
          data-testid="bench-sort"
          style={{ width: 160 }}
        >
          <option value="days">Longest idle</option>
          <option value="cost">Cost / day</option>
          <option value="match">Best match</option>
        </Select>
      </div>

      {/* SoT PR 17h-bench — DS-canvas bulk-action bar (DS/page-bench.jsx
          L81–98). Visible only when one or more rows are selected. */}
      {selectedIds.size > 0 ? (
        <div
          data-testid="bench-bulk-bar"
          style={{
            alignItems: 'center',
            background: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-card)',
            color: 'var(--color-accent-text)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            padding: '10px 14px',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            <span
              style={{ fontVariantNumeric: 'tabular-nums' }}
              data-testid="bench-bulk-count"
            >
              {selectedIds.size} selected
            </span>
          </span>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={() => {
              // PR-11 — a single selected person opens the create-position
              // drawer armed with that candidate. Multi-person flow is still
              // stubbed: TODO(SoT PR 17h-bench) wire into Workforce Planner
              // "Suggest position" when the bulk endpoint lands.
              if (selectedIds.size === 1) {
                const personId = Array.from(selectedIds)[0];
                const row = rows.find((r) => r.personId === personId);
                if (row) {
                  setProposeCandidate({ personId: row.personId, name: row.name });
                  return;
                }
              }
              toast.info('Suggest position — coming soon');
            }}
            data-testid="bench-bulk-suggest"
          >
            Suggest position
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => {
              // TODO(SoT PR 17h-bench): wire into the in-app messaging surface
              // once it gains a bulk-recipient API.
              toast.info('Send message — coming soon');
            }}
            data-testid="bench-bulk-message"
          >
            Send message
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => {
              const rowsToExport = sortedRows.filter((r) => selectedIds.has(r.personId));
              exportBenchCsv(rowsToExport.length > 0 ? rowsToExport : sortedRows);
            }}
            data-testid="bench-bulk-export"
          >
            Export
          </Button>
          <div style={{ flex: 1 }} />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setSelectedIds(new Set())}
            data-testid="bench-bulk-clear"
          >
            Clear
          </Button>
        </div>
      ) : null}

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
      <SectionCard title={`Bench (${rows.length})`}>
        <div className="compact muted" style={{ marginBottom: 8 }}>
          Sorted by days off project, longest first
        </div>
        <div style={{ overflow: 'auto' }}>
          {(() => {
            const visibleIds = pageRows.map((r) => r.personId);
            const allOnPageSelected =
              visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
            const someOnPageSelected = visibleIds.some((id) => selectedIds.has(id));
            const columns: Column<BenchEnrichedRowDto>[] = [
              {
                key: 'select',
                title: (
                  <Checkbox
                    aria-label={allOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                    }}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) visibleIds.forEach((id) => next.add(id));
                        else visibleIds.forEach((id) => next.delete(id));
                        return next;
                      });
                    }}
                    data-testid="bench-select-all"
                  />
                ),
                width: 36,
                render: (r) => (
                  <span
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    style={{ display: 'inline-flex' }}
                  >
                    <Checkbox
                      aria-label={`Select ${r.name}`}
                      checked={selectedIds.has(r.personId)}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(r.personId);
                          else next.delete(r.personId);
                          return next;
                        });
                      }}
                      data-testid={`bench-select-${r.personId}`}
                    />
                  </span>
                ),
              },
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
                  const rowTone: Tone = r.isOnBench ? daysOnBenchTone(r.daysOnBench) : 'active';
                  return (
                    <StatusBadge
                      label={r.isOnBench ? 'On bench' : 'Engaged'}
                      tone={rowTone}
                      variant="dot"
                    />
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
                    <StatusBadge
                      label={`${r.suggestedProjectIds.length} match${r.suggestedProjectIds.length === 1 ? '' : 'es'}`}
                      tone="info"
                      variant="chip"
                    />
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
                    to={`/people/${r.personPublicId ?? r.personId}`}
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
      </SectionCard>

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

      {/* PR-11 — drawer armed with the single selected bench candidate. */}
      <CreatePositionDrawer
        open={proposeCandidate !== null}
        onClose={() => setProposeCandidate(null)}
        candidatePersonId={proposeCandidate?.personId}
        candidateDisplayName={proposeCandidate?.name}
      />
    </div>
  );
}
