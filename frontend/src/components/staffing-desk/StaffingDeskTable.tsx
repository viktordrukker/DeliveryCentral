import { useCallback, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { ColumnConfigurator } from '@/components/staffing-desk/ColumnConfigurator';
import { TextFilter, MultiSelectFilter, DateFilter, NumericFilter, NoFilter } from '@/components/staffing-desk/InlineFilters';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import { priorityTone } from '@/features/staffing-desk/staffing-desk.types';
import { humanizeEnum } from '@/lib/labels';
import { formatDateShort } from '@/lib/format-date';
import { getAgingDays, getAgingTone, getAgingTooltip } from '@/features/staffing-desk/aging';
import {
  type ColDef,
  type InlineFilterState,
  NUM,
  S_TABS,
  S_TAB,
  S_TAB_ACTIVE,
  S_TOOLBAR,
  STATUS_OPTS,
  PRIORITY_OPTS,
  EMP_STATUS_OPTS,
  applyInlineFilters,
  computeUniqueValues,
} from '@/components/staffing-desk/table-shared';
import { Button, Table, type Column } from '@/components/ds';

type Tab = 'supply' | 'demand';

interface Props {
  items: StaffingDeskRow[];
  onRowClick?: (item: StaffingDeskRow) => void;
  onPersonClick?: (personId: string, personName: string) => void;
  activeTab?: string;
  onTabChange?: (tab: Tab) => void;
  columnsOpen?: boolean;
  onColumnsClose?: () => void;
  columnWidths?: Record<string, number>;
  onColumnWidthChange?: (columnKey: string, width: number) => void;
}

const SUPPLY_ALL_COLUMNS: ColDef[] = [
  { key: 'person', label: 'Person', category: 'Core', width: 120, filterType: 'text', getValue: (r) => r.personName, render: (r, onClick) => <span style={{ fontWeight: 500, cursor: r.personId ? 'pointer' : undefined, color: r.personId ? 'var(--color-accent)' : 'var(--color-text-muted)' }} onClick={(e) => { if (r.personId && onClick) { e.stopPropagation(); onClick(r.personId, r.personName ?? ''); } }}>{r.personName ?? 'Unknown'}</span> },
  { key: 'timeline', label: 'Timeline', category: 'Core', width: 180, isTimeline: true, filterType: 'none', getValue: () => null, render: (r) => r.personId ? <WorkloadTimeline personId={r.personId} compact preloadedAssignments={r.personAssignments} /> : null },
  { key: 'project', label: 'Project', category: 'Core', width: 110, filterType: 'multiselect', getValue: (r) => r.projectName, render: (r) => r.projectName },
  { key: 'role', label: 'Role', category: 'Core', width: 90, filterType: 'multiselect', getValue: (r) => r.role, render: (r) => r.role },
  { key: 'alloc', label: '%', category: 'Core', width: 40, align: 'right', filterType: 'numeric', getValue: (r) => r.allocationPercent, render: (r) => <span style={NUM}>{r.allocationPercent}%</span> },
  { key: 'startDate', label: 'Start', category: 'Core', width: 75, filterType: 'date', getValue: (r) => r.startDate.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.startDate)}</span> },
  { key: 'endDate', label: 'End', category: 'Core', width: 75, filterType: 'date', getValue: (r) => r.endDate?.slice(0, 10) ?? null, render: (r) => r.endDate ? <span style={{ fontSize: 10 }}>{formatDateShort(r.endDate)}</span> : <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>Open</span> },
  { key: 'status', label: 'Status', category: 'Core', width: 80, filterType: 'multiselect', filterOptions: STATUS_OPTS, getValue: (r) => r.status, render: (r) => <StatusBadge label={humanizeEnum(r.status)} status={r.status} variant="dot" /> },
  { key: 'grade', label: 'Grade', category: 'Person', width: 55, filterType: 'text', getValue: (r) => r.personGrade, render: (r) => r.personGrade ?? '' },
  { key: 'personRole', label: 'Job Role', category: 'Person', width: 90, filterType: 'multiselect', getValue: (r) => r.personRole, render: (r) => r.personRole ?? '' },
  { key: 'orgUnit', label: 'Dept', category: 'Person', width: 90, filterType: 'multiselect', getValue: (r) => r.personOrgUnit, render: (r) => r.personOrgUnit ?? '' },
  { key: 'manager', label: 'Manager', category: 'Person', width: 100, filterType: 'multiselect', getValue: (r) => r.personManager, render: (r) => r.personManager ?? '' },
  { key: 'pool', label: 'Pool', category: 'Person', width: 90, filterType: 'multiselect', getValue: (r) => r.personPool, render: (r) => r.personPool ?? '' },
  { key: 'skills', label: 'Skills', category: 'Person', width: 120, filterType: 'multiselect', getValue: (r) => r.personSkills.join(','), render: (r) => <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.personSkills.slice(0, 3).join(', ')}{r.personSkills.length > 3 ? ` +${r.personSkills.length - 3}` : ''}</span> },
  { key: 'email', label: 'Email', category: 'Person', width: 130, filterType: 'text', getValue: (r) => r.personEmail, render: (r) => <span style={{ fontSize: 10 }}>{r.personEmail ?? ''}</span> },
  { key: 'empStatus', label: 'Emp.', category: 'Person', width: 70, filterType: 'multiselect', filterOptions: EMP_STATUS_OPTS, getValue: (r) => r.personEmploymentStatus, render: (r) => r.personEmploymentStatus ?? '' },
  { key: 'code', label: 'Code', category: 'Assignment', width: 80, filterType: 'text', getValue: (r) => r.assignmentCode, render: (r) => r.assignmentCode ?? '' },
  { key: 'createdAt', label: 'Created', category: 'Assignment', width: 75, filterType: 'date', getValue: (r) => r.createdAt.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.createdAt)}</span> },
];

const DEMAND_ALL_COLUMNS: ColDef[] = [
  { key: 'project', label: 'Project', category: 'Core', width: 120, filterType: 'multiselect', getValue: (r) => r.projectName, render: (r) => <span style={{ fontWeight: 500 }}>{r.projectName}</span> },
  { key: 'timeline', label: 'Timeline', category: 'Core', width: 180, isTimeline: true, filterType: 'none', getValue: () => null, render: (r) => <WorkloadTimeline personId="" compact preloadedAssignments={[]} planned={{ allocationPercent: r.allocationPercent, endDate: r.endDate ?? r.startDate, projectName: r.projectName, startDate: r.startDate }} /> },
  { key: 'role', label: 'Role', category: 'Core', width: 100, filterType: 'multiselect', getValue: (r) => r.role, render: (r) => r.role },
  { key: 'alloc', label: '%', category: 'Core', width: 40, align: 'right', filterType: 'numeric', getValue: (r) => r.allocationPercent, render: (r) => <span style={NUM}>{r.allocationPercent}%</span> },
  { key: 'hc', label: 'HC', category: 'Core', width: 40, align: 'right', filterType: 'none', getValue: (r) => r.headcountFulfilled, render: (r) => <span style={NUM}>{r.headcountFulfilled ?? 0}/{r.headcountRequired ?? 1}</span> },
  { key: 'priority', label: 'Priority', category: 'Core', width: 70, filterType: 'multiselect', filterOptions: PRIORITY_OPTS, getValue: (r) => r.priority, render: (r) => r.priority ? <StatusBadge label={r.priority} tone={priorityTone(r.priority)} variant="chip" /> : null },
  { key: 'startDate', label: 'Start', category: 'Core', width: 75, filterType: 'date', getValue: (r) => r.startDate.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.startDate)}</span> },
  { key: 'endDate', label: 'End', category: 'Core', width: 75, filterType: 'date', getValue: (r) => r.endDate?.slice(0, 10) ?? null, render: (r) => r.endDate ? <span style={{ fontSize: 10 }}>{formatDateShort(r.endDate)}</span> : <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>Open</span> },
  { key: 'status', label: 'Status', category: 'Core', width: 80, filterType: 'multiselect', filterOptions: STATUS_OPTS, getValue: (r) => r.status, render: (r) => <StatusBadge label={humanizeEnum(r.status)} status={r.status} variant="dot" /> },
  { key: 'skills', label: 'Skills', category: 'Request', width: 110, filterType: 'multiselect', getValue: (r) => r.skills.join(','), render: (r) => <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.skills.slice(0, 3).join(', ')}{r.skills.length > 3 ? ` +${r.skills.length - 3}` : ''}</span> },
  { key: 'requestedBy', label: 'By', category: 'Request', width: 90, filterType: 'multiselect', getValue: (r) => r.requestedByName, render: (r) => r.requestedByName ?? '' },
  { key: 'summary', label: 'Summary', category: 'Request', width: 150, filterType: 'text', getValue: (r) => r.summary, render: (r) => <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.summary ?? ''}</span> },
  { key: 'createdAt', label: 'Created', category: 'Request', width: 110, filterType: 'date', getValue: (r) => r.createdAt.slice(0, 10), render: (r) => {
    const tone = getAgingTone(r.createdAt);
    const days = getAgingDays(r.createdAt);
    const status = tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'neutral';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={getAgingTooltip(tone)}>
        <span style={{ fontSize: 10 }}>{formatDateShort(r.createdAt)}</span>
        <StatusBadge status={status} label={`${days}d`} variant="chip" />
      </span>
    );
  } },
];


/* ── Component ── */

/**
 * Phase DS-4-11 — migrated to the DS `<Table>` primitive (escape-hatch path,
 * not full `<DataView>`). Justification: the UX contract requires bespoke
 * filter UX (autocomplete on text, search-multiselect with select-all,
 * numeric `>=` operators) and a column configurator with drag-reorder + named
 * presets — both richer than `<DataView>`'s MVP. Migrating to DataView would
 * either downgrade UX (contract violation) or force a much larger DataView
 * extension affecting all consumers.
 *
 * What we get from the primitive:
 *  - Sticky thead, scroll container, variant chrome (`compact`)
 *  - Auto-virtualization at >200 rows (DS-4-3) — important for Supply views
 *    with hundreds of bench rows
 *  - Standardized hover row (`ds-table__row--interactive`) replacing the
 *    custom hover `useState` in the old `RowRenderer`
 *  - Empty-state slot
 *
 * What remains bespoke (per contract):
 *  - Per-column inline filter cells (TextFilter / MultiSelectFilter / etc.)
 *  - ColumnConfigurator panel (drag-reorder + presets)
 *  - SavedFiltersDropdown (URL-filter presets, lives on the page)
 *  - Pagination (server-side, page-owned)
 *  - localStorage keys `sd-supply` / `sd-demand` preserved via
 *    `useColumnVisibility` (untouched)
 */
export function StaffingDeskTable({ items, onRowClick, onPersonClick, activeTab, onTabChange, columnsOpen, onColumnsClose, columnWidths, onColumnWidthChange }: Props): JSX.Element {
  const [internalTab, setInternalTab] = useState<Tab>('supply');
  const tab = (activeTab === 'assignment' ? 'supply' : activeTab === 'request' ? 'demand' : undefined) ?? internalTab;
  const [supplyFilters, setSupplyFilters] = useState<InlineFilterState>({});
  const [demandFilters, setDemandFilters] = useState<InlineFilterState>({});

  const supplyColKeys = useMemo(() => SUPPLY_ALL_COLUMNS.map((c) => c.key), []);
  const demandColKeys = useMemo(() => DEMAND_ALL_COLUMNS.map((c) => c.key), []);
  const supplyVis = useColumnVisibility('sd-supply', supplyColKeys);
  const demandVis = useColumnVisibility('sd-demand', demandColKeys);

  const vis = tab === 'supply' ? supplyVis : demandVis;
  const allCols = tab === 'supply' ? SUPPLY_ALL_COLUMNS : DEMAND_ALL_COLUMNS;
  const colMap = useMemo(() => new Map(allCols.map((c) => [c.key, c])), [allCols]);
  // Ordered + visible columns
  const visibleCols = useMemo(
    () => vis.columnOrder.map((key) => colMap.get(key)).filter((c): c is ColDef => !!c && vis.isVisible(c.key)),
    [vis.columnOrder, colMap, vis],
  );
  const inlineFilters = tab === 'supply' ? supplyFilters : demandFilters;
  const setInlineFilters = tab === 'supply' ? setSupplyFilters : setDemandFilters;

  const setFilter = useCallback((key: string, value: string) => {
    setInlineFilters((prev) => ({ ...prev, [key]: value }));
  }, [setInlineFilters]);

  function handleTabChange(t: Tab): void {
    setInternalTab(t);
    onTabChange?.(t);
  }

  const supplyItems = useMemo(() => items.filter((r) => r.kind === 'assignment'), [items]);
  const demandItems = useMemo(() => items.filter((r) => r.kind === 'request'), [items]);
  const rawItems = tab === 'supply' ? supplyItems : demandItems;

  // Apply inline filters client-side
  const currentItems = useMemo(
    () => applyInlineFilters(rawItems, inlineFilters, allCols),
    [rawItems, inlineFilters, allCols],
  );

  const activeFilterCount = Object.values(inlineFilters).filter(Boolean).length;

  const uniqueValuesMap = useMemo(() => computeUniqueValues(rawItems, allCols), [rawItems, allCols]);

  // ── ColDef → Column<StaffingDeskRow> mapping for the DS primitive ────────
  // Truncation + hover-tooltip is opted into via `truncate: true` (the DS
  // primitive auto-applies the cell-truncate class and `data-full` attr).
  const dsColumns: Column<StaffingDeskRow>[] = useMemo(
    () => visibleCols.map((c) => ({
      key: c.key,
      title: c.label,
      width: c.width,
      align: c.align,
      getValue: c.getValue,
      truncate: !c.isTimeline,
      resizable: !c.isTimeline,
      render: (row) => c.render(row, onPersonClick),
      cellStyle: c.isTimeline
        ? { overflow: 'hidden', whiteSpace: 'normal', padding: '2px 4px' }
        : undefined,
    })),
    [visibleCols, onPersonClick],
  );

  // ── Bespoke filter row — one cell per visible column.
  const renderFilterCell = useCallback(
    (column: Column<StaffingDeskRow>) => {
      const colDef = colMap.get(column.key);
      if (!colDef) return null;
      const value = inlineFilters[colDef.key] ?? '';
      return (
        <FilterCell
          col={colDef}
          value={value}
          onChange={(v) => setFilter(colDef.key, v)}
          uniqueValues={uniqueValuesMap[colDef.key]}
        />
      );
    },
    [colMap, inlineFilters, setFilter, uniqueValuesMap],
  );

  // Two distinct empty-state copies per the UX contract.
  const emptyState = (
    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
      {rawItems.length === 0 ? 'No data loaded.' : 'No rows match the current filters.'}
    </div>
  );

  return (
    <div>
      <div style={S_TOOLBAR}>
        <div style={S_TABS}>
          <Button variant={tab === 'supply' ? 'primary' : 'secondary'} size="sm" onClick={() => handleTabChange('supply')} type="button">Supply ({supplyItems.length})</Button>
          <Button variant={tab === 'demand' ? 'primary' : 'secondary'} size="sm" onClick={() => handleTabChange('demand')} type="button">Demand ({demandItems.length})</Button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          {activeFilterCount > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setInlineFilters({})} type="button" style={{ fontSize: 9 }}>
              Clear filters ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      <Table
        variant="compact"
        tableLayout="fixed"
        columns={dsColumns}
        rows={currentItems}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick ? (r) => onRowClick(r) : undefined}
        renderFilterCell={renderFilterCell}
        emptyState={emptyState}
        columnWidths={columnWidths}
        onColumnWidthChange={onColumnWidthChange}
      />

      <ColumnConfigurator
        open={!!columnsOpen}
        onClose={() => onColumnsClose?.()}
        allColumns={allCols.map((c) => ({ key: c.key, label: c.label, category: c.category }))}
        columnOrder={vis.columnOrder}
        isVisible={vis.isVisible}
        moveColumn={vis.moveColumn}
        toggleColumn={vis.toggleColumn}
        reset={vis.reset}
        presets={vis.presets}
        savePreset={vis.savePreset}
        loadPreset={vis.loadPreset}
        deletePreset={vis.deletePreset}
      />
    </div>
  );
}

/* ── Filter cell renderer ── */

function FilterCell({ col, value, onChange, uniqueValues }: { col: ColDef; onChange: (v: string) => void; uniqueValues?: string[]; value: string }): JSX.Element {
  switch (col.filterType) {
    case 'text':
      return <TextFilter value={value} onChange={onChange} placeholder={`${col.label}...`} uniqueValues={uniqueValues} />;
    case 'multiselect':
      return (
        <MultiSelectFilter
          options={col.filterOptions ?? uniqueValues ?? []}
          selected={value ? value.split(',') : []}
          onChange={(sel) => onChange(sel.join(','))}
        />
      );
    case 'date':
      return <DateFilter value={value} onChange={onChange} />;
    case 'numeric':
      return <NumericFilter value={value} onChange={onChange} />;
    case 'none':
    default:
      return <NoFilter />;
  }
}
