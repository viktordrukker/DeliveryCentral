import type { Story } from '@ladle/react';
import { useMemo, useState } from 'react';

import { DataView, type FilterState, type PaginationState, type SortState } from './DataView';
import type { Column } from './Table';
import { Button } from './Button';

export default { title: 'DS / Tables / DataView' };

// ─── Demo data ───────────────────────────────────────────────────────────────
interface Person {
  id: string;
  name: string;
  team: string;
  status: 'Active' | 'Paused' | 'Closed';
  allocation: number;
  start: string;
}

const TEAMS = ['Phoenix', 'Atlas', 'Beacon', 'Cypress', 'Delta'];
const STATUSES: Person['status'][] = ['Active', 'Paused', 'Closed'];

function generatePeople(count: number): Person[] {
  const out: Person[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `person-${i}`,
      name: `Person ${i + 1}`,
      team: TEAMS[i % TEAMS.length],
      status: STATUSES[i % 3],
      allocation: Math.round((Math.random() * 130) / 5) * 5,
      start: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String(((i * 7) % 28) + 1).padStart(2, '0')}`,
    });
  }
  return out;
}

const COLUMNS: Column<Person>[] = [
  {
    key: 'name',
    title: 'Person',
    render: (r) => <strong>{r.name}</strong>,
    getValue: (r) => r.name,
    sortable: true,
    filter: { kind: 'text' },
    width: 180,
  },
  {
    key: 'team',
    title: 'Team',
    getValue: (r) => r.team,
    sortable: true,
    filter: { kind: 'multiselect' },
    width: 140,
  },
  {
    key: 'status',
    title: 'Status',
    getValue: (r) => r.status,
    sortable: true,
    filter: { kind: 'multiselect' },
    width: 110,
  },
  {
    key: 'allocation',
    title: 'Allocation',
    align: 'right',
    getValue: (r) => r.allocation,
    render: (r) => `${r.allocation}%`,
    sortable: true,
    filter: { kind: 'numeric' },
    width: 110,
  },
  {
    key: 'start',
    title: 'Start',
    getValue: (r) => r.start,
    sortable: true,
    filter: { kind: 'date' },
    width: 130,
  },
];

// ─── Stories ─────────────────────────────────────────────────────────────────

export const ClientMode: Story = () => {
  const rows = useMemo(() => generatePeople(85), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[10, 25, 50]}
      />
    </div>
  );
};

export const WithBulkAndRowActions: Story = () => {
  const rows = useMemo(() => generatePeople(40), []);
  const [log, setLog] = useState<string[]>([]);
  return (
    <div style={{ maxWidth: 1100 }}>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[10, 25]}
        bulkActions={[
          {
            key: 'release',
            label: 'Release',
            onSelect: (keys, sel) => setLog([`Released ${keys.length}: ${sel.map((p) => p.name).join(', ')}`, ...log]),
          },
          {
            key: 'delete',
            label: 'Delete',
            tone: 'danger',
            onSelect: (keys) => setLog([`Deleted ${keys.length}`, ...log]),
          },
        ]}
        rowActions={[
          { key: 'edit', label: 'Edit', onSelect: (r) => setLog([`Edit ${r.name}`, ...log]) },
          {
            key: 'archive',
            label: 'Archive',
            tone: 'danger',
            visibleFor: (r) => r.status !== 'Closed',
            onSelect: (r) => setLog([`Archive ${r.name}`, ...log]),
          },
        ]}
      />
      <pre style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
        {log.slice(0, 6).join('\n')}
      </pre>
    </div>
  );
};

export const WithToolbar: Story = () => {
  const rows = useMemo(() => generatePeople(60), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[10, 25, 50]}
        toolbar={
          <>
            <Button size="sm" variant="primary">+ New person</Button>
            <Button size="sm" variant="secondary">Export XLSX</Button>
          </>
        }
      />
    </div>
  );
};

export const ServerMode: Story = () => {
  const allRows = useMemo(() => generatePeople(123), []);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 10 });

  // Simulate server-side filter/sort/page (pretend this happened on the API)
  const filtered = useMemo(() => {
    let next = allRows;
    if (filters.name) next = next.filter((r) => r.name.toLowerCase().includes(filters.name.toLowerCase()));
    if (filters.team) next = next.filter((r) => r.team === filters.team);
    if (filters.status) next = next.filter((r) => r.status === filters.status);
    if (sort) {
      next = [...next].sort((a, b) => {
        const va = (a as unknown as Record<string, string | number>)[sort.key];
        const vb = (b as unknown as Record<string, string | number>)[sort.key];
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }
    return next;
  }, [allRows, filters, sort]);
  const pageRows = filtered.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize);

  return (
    <div style={{ maxWidth: 1100 }}>
      <DataView
        mode="server"
        columns={COLUMNS}
        rows={pageRows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[10, 25, 50]}
        totalCount={filtered.length}
        filters={filters}
        onFiltersChange={(next) => { setFilters(next); setPagination({ ...pagination, page: 1 }); }}
        sort={sort}
        onSortChange={setSort}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
        Server mode — parent owns filter/sort/pagination state.
        Source has {allRows.length} rows; filtered = {filtered.length}; current page = {pageRows.length}.
      </p>
    </div>
  );
};

export const ClickableRows: Story = () => {
  const rows = useMemo(() => generatePeople(20), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        onRowClick={(r) => alert(`Open ${r.name}`)}
      />
    </div>
  );
};

/**
 * DS-4-3 — auto-virtualization. The page size is wide enough that all 10k
 * rows live on a single page; row virtualization kicks in because the
 * rendered count exceeds the default 200 threshold. Only the visible window
 * (~16 rows + 6 overscan above and below) is mounted at any time. Sticky
 * thead anchors to the scroll container.
 */
export const Virtualized10kRows: Story = () => {
  const rows = useMemo(() => generatePeople(10_000), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        10,000 rows · all on one page · only the visible window is rendered.
        Open DevTools Elements panel: the &lt;tbody&gt; holds ~28 &lt;tr&gt;s, not 10,000.
      </p>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[10_000]}
      />
    </div>
  );
};

/**
 * DS-4-3 — opt-out via `virtualizeThreshold={Infinity}`. Same 10k rows, but
 * the full DOM is rendered. Use this comparison story to feel the difference
 * — initial render is much slower; scroll stutters more.
 */
export const VirtualizedOptOut: Story = () => {
  const rows = useMemo(() => generatePeople(2_000), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        2,000 rows with virtualization disabled — every row mounted up front.
        Compare against the 10k story above.
      </p>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[2_000]}
        virtualizeThreshold={Infinity}
      />
    </div>
  );
};

/**
 * DS-4-3 — virtualization with the compact variant. Smaller row height (28px
 * default for compact / embedded) means more rows fit in the viewport.
 */
export const VirtualizedCompact: Story = () => {
  const rows = useMemo(() => generatePeople(5_000), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <DataView
        variant="compact"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[5_000]}
      />
    </div>
  );
};

/**
 * DS-4-4 — mobile card-list mode. Resize the Ladle viewport (≤640px) to
 * trigger automatic card-list rendering. Each row becomes a card with a
 * title, label/value stack, and optional row-actions row.
 *
 * Set `cardModeOnMobile={false}` to opt out (preserve the table even on
 * narrow viewports — useful for matrix views that genuinely need horizontal
 * scrolling).
 */
export const CardListOnMobile: Story = () => {
  const rows = useMemo(() => generatePeople(15), []);
  return (
    <div style={{ maxWidth: 1100 }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        Resize the viewport to ≤640px (use Ladle&apos;s viewport switcher) — the
        table swaps to a card-per-row layout. Action and row-click handlers
        are preserved.
      </p>
      <DataView
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[15]}
        onRowClick={(r) => alert(`Open ${r.name}`)}
        rowActions={[
          { key: 'edit', label: 'Edit', onSelect: (r) => alert(`Edit ${r.name}`) },
          { key: 'archive', label: 'Archive', tone: 'danger', onSelect: (r) => alert(`Archive ${r.name}`) },
        ]}
      />
    </div>
  );
};

/**
 * DS-4-5 — inline cell editing. Click a cell with a dashed-border affordance
 * to switch to edit mode. Press Enter / blur to commit, Escape to cancel.
 * Demonstrates all four built-in kinds (text / number / date / select), plus
 * a sync validator + simulated async commit failure.
 */
export const InlineEdit: Story = () => {
  const [rows, setRows] = useState<Person[]>(() => generatePeople(20));
  const [log, setLog] = useState<string[]>([]);

  const updateRow = (id: string, patch: Partial<Person>): void => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const editColumns: Column<Person>[] = useMemo(() => [
    {
      key: 'name',
      title: 'Person',
      width: 200,
      getValue: (r) => r.name,
      sortable: true,
      edit: {
        kind: 'text',
        commit: async (row, next) => {
          await new Promise((r) => setTimeout(r, 200));
          updateRow(row.id, { name: String(next) });
          setLog((l) => [`Renamed ${row.name} → ${next}`, ...l]);
        },
        validate: (next) => (typeof next === 'string' && next.trim().length === 0 ? 'Required' : null),
      },
    },
    {
      key: 'team',
      title: 'Team',
      width: 140,
      getValue: (r) => r.team,
      edit: {
        kind: 'select',
        options: TEAMS.map((t) => ({ label: t, value: t })),
        commit: async (row, next) => {
          await new Promise((r) => setTimeout(r, 200));
          updateRow(row.id, { team: String(next) });
          setLog((l) => [`${row.name}: team → ${next}`, ...l]);
        },
      },
    },
    {
      key: 'allocation',
      title: 'Allocation',
      width: 130,
      align: 'right',
      getValue: (r) => r.allocation,
      render: (r) => `${r.allocation}%`,
      edit: {
        kind: 'number',
        commit: async (row, next) => {
          await new Promise((r) => setTimeout(r, 200));
          updateRow(row.id, { allocation: Number(next) });
          setLog((l) => [`${row.name}: allocation → ${next}%`, ...l]);
        },
        validate: (next) => {
          const n = Number(next);
          if (Number.isNaN(n)) return 'Must be a number';
          if (n < 0 || n > 200) return '0–200%';
          return null;
        },
      },
    },
    {
      key: 'start',
      title: 'Start',
      width: 150,
      getValue: (r) => r.start,
      edit: {
        kind: 'date',
        commit: async (row, next) => {
          // Demonstrate error revert: any date past 2025-12-01 rejects.
          await new Promise((r) => setTimeout(r, 200));
          if (typeof next === 'string' && next > '2025-12-01') {
            throw new Error('Cannot start after 2025-12-01');
          }
          updateRow(row.id, { start: String(next) });
          setLog((l) => [`${row.name}: start → ${next}`, ...l]);
        },
      },
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      getValue: (r) => r.status,
      // No `edit` here — read-only column to show contrast.
    },
  ], []);

  return (
    <div style={{ maxWidth: 1100 }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        Click a cell with a dashed border on hover to edit. Try a Start date
        past 2025-12-01 to see the rejected-commit revert.
      </p>
      <DataView
        columns={editColumns}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSizeOptions={[10, 20]}
      />
      <pre style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
        {log.slice(0, 6).join('\n')}
      </pre>
    </div>
  );
};
