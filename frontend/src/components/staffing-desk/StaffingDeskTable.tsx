import { useCallback, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { ColumnConfigurator } from '@/components/staffing-desk/ColumnConfigurator';
import { TextFilter, MultiSelectFilter, DateFilter, NumericFilter, NoFilter, parseNumericFilter } from '@/components/staffing-desk/InlineFilters';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import { priorityTone } from '@/features/staffing-desk/staffing-desk.types';
import { humanizeEnum } from '@/lib/labels';
import { formatDateShort } from '@/lib/format-date';

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', textAlign: 'right' };
type Tab = 'supply' | 'demand';

interface Props {
  items: StaffingDeskRow[];
  onRowClick?: (item: StaffingDeskRow) => void;
  onPersonClick?: (personId: string, personName: string) => void;
  activeTab?: string;
  onTabChange?: (tab: Tab) => void;
  columnsOpen?: boolean;
  onColumnsClose?: () => void;
}

/* ── Styles ── */
const S_TABS: React.CSSProperties = { display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: 0 };
const S_TAB: React.CSSProperties = { padding: 'var(--space-2) var(--space-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--color-text-muted)', borderBottom: '2px solid transparent', marginBottom: -2 };
const S_TAB_ACTIVE: React.CSSProperties = { ...S_TAB, color: 'var(--color-accent)', borderBottomColor: 'var(--color-accent)' };
const S_TABLE: React.CSSProperties = { borderCollapse: 'collapse', fontSize: 12 };
const S_TH: React.CSSProperties = { padding: '6px 6px 0', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'left', background: 'var(--color-surface-alt)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, verticalAlign: 'top' };
const S_TH_FILTER: React.CSSProperties = { padding: '0 6px 4px', background: 'var(--color-surface-alt)', position: 'sticky', top: 22, zIndex: 2, borderBottom: '2px solid var(--color-border)' };
const S_TD: React.CSSProperties = { padding: '5px 6px', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' };
const S_ROW: React.CSSProperties = { cursor: 'pointer', transition: 'background 80ms' };
const S_TOOLBAR: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-1) 0' };

/* ── Filter state ── */
interface InlineFilterState {
  [key: string]: string;
}

/* ── Status/priority options ── */
const STATUS_OPTS = ['DRAFT', 'REQUESTED', 'OPEN', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'ENDED', 'FULFILLED', 'REJECTED', 'REVOKED', 'CANCELLED', 'ARCHIVED'];
const PRIORITY_OPTS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const EMP_STATUS_OPTS = ['ACTIVE', 'LEAVE', 'INACTIVE', 'TERMINATED'];

/* ── Column definitions ── */
type FilterType = 'text' | 'multiselect' | 'date' | 'numeric' | 'none';
interface ColDef {
  key: string;
  label: string;
  category: string;
  width?: number;
  align?: 'left' | 'right';
  isTimeline?: boolean;
  filterType: FilterType;
  filterOptions?: string[];
  getValue: (row: StaffingDeskRow) => string | number | null;
  render: (row: StaffingDeskRow, onPersonClick?: (id: string, name: string) => void) => React.ReactNode;
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
  { key: 'createdAt', label: 'Created', category: 'Request', width: 75, filterType: 'date', getValue: (r) => r.createdAt.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.createdAt)}</span> },
];


/* ── Client-side filtering logic ── */

function applyInlineFilters(items: StaffingDeskRow[], filters: InlineFilterState, cols: ColDef[]): StaffingDeskRow[] {
  return items.filter((row) => {
    for (const col of cols) {
      const filterVal = filters[col.key];
      if (!filterVal) continue;

      const cellVal = col.getValue(row);

      switch (col.filterType) {
        case 'text': {
          if (cellVal === null || cellVal === undefined) return false;
          if (!fuzzyMatch(String(cellVal), filterVal)) return false;
          break;
        }
        case 'multiselect': {
          const selected = filterVal.split(',').filter(Boolean);
          if (selected.length === 0) break;
          if (cellVal === null || cellVal === '') return false;
          // Support comma-separated cell values (e.g. skills) — match if ANY selected value appears
          const cellParts = String(cellVal).split(',').map((s) => s.trim());
          if (!selected.some((s) => cellParts.includes(s))) return false;
          break;
        }
        case 'date': {
          // filterVal is a date string YYYY-MM-DD; show rows where date >= filterVal
          if (!cellVal) return false;
          if (String(cellVal) < filterVal) return false;
          break;
        }
        case 'numeric': {
          const pred = parseNumericFilter(filterVal);
          if (pred && typeof cellVal === 'number') {
            if (!pred(cellVal)) return false;
          }
          break;
        }
      }
    }
    return true;
  });
}

/* ── Component ── */

export function StaffingDeskTable({ items, onRowClick, onPersonClick, activeTab, onTabChange, columnsOpen, onColumnsClose }: Props): JSX.Element {
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

  // Compute unique values per column for dropdown/multiselect options
  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of allCols) {
      if (col.filterType !== 'text' && col.filterType !== 'multiselect') continue;
      // Skip columns with hardcoded options
      if (col.filterOptions) continue;
      const seen = new Set<string>();
      for (const row of rawItems) {
        const v = col.getValue(row);
        if (v == null || v === '') continue;
        // Handle comma-separated values (skills)
        const s = String(v);
        if (s.includes(',')) {
          for (const part of s.split(',')) {
            const trimmed = part.trim();
            if (trimmed) seen.add(trimmed);
          }
        } else {
          seen.add(s);
        }
      }
      map[col.key] = [...seen].sort();
    }
    return map;
  }, [rawItems, allCols]);

  return (
    <div>
      <div style={S_TOOLBAR}>
        <div style={S_TABS}>
          <button style={tab === 'supply' ? S_TAB_ACTIVE : S_TAB} onClick={() => handleTabChange('supply')} type="button">Supply ({supplyItems.length})</button>
          <button style={tab === 'demand' ? S_TAB_ACTIVE : S_TAB} onClick={() => handleTabChange('demand')} type="button">Demand ({demandItems.length})</button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          {activeFilterCount > 0 && (
            <button className="button button--secondary button--sm" onClick={() => setInlineFilters({})} type="button" style={{ fontSize: 9 }}>
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={S_TABLE}>
          <colgroup>
            {visibleCols.map((c) => (
              <col key={c.key} style={{ width: c.width ?? 120, minWidth: c.width ?? 120 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visibleCols.map((c) => (
                <th key={c.key} style={{ ...S_TH, textAlign: c.align ?? 'left', minWidth: c.width ?? 120, width: c.width ?? 120 }}>{c.label}</th>
              ))}
            </tr>
            <tr>
              {visibleCols.map((c) => (
                <th key={`f-${c.key}`} style={S_TH_FILTER}>
                  <FilterCell col={c} value={inlineFilters[c.key] ?? ''} onChange={(v) => setFilter(c.key, v)} uniqueValues={uniqueValuesMap[c.key]} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length} style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {rawItems.length === 0 ? 'No data loaded.' : 'No rows match the current filters.'}
                </td>
              </tr>
            ) : (
              currentItems.map((row) => (
                <RowRenderer key={row.id} row={row} visibleCols={visibleCols} onRowClick={onRowClick} onPersonClick={onPersonClick} />
              ))
            )}
          </tbody>
        </table>
      </div>

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

/* ── Row renderer ── */

function RowRenderer({ row, visibleCols, onRowClick, onPersonClick }: {
  onPersonClick?: (personId: string, personName: string) => void;
  onRowClick?: (item: StaffingDeskRow) => void;
  row: StaffingDeskRow;
  visibleCols: ColDef[];
}): JSX.Element {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      style={{ ...S_ROW, background: hovered ? 'var(--color-surface-alt)' : undefined }}
      onClick={() => onRowClick?.(row)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {visibleCols.map((col) => {
        if (col.isTimeline) {
          return (
            <td key={col.key} style={{ ...S_TD, overflow: 'hidden', whiteSpace: 'normal', padding: '2px 4px' }}>
              {col.render(row, onPersonClick)}
            </td>
          );
        }
        const textVal = col.getValue(row);
        const fullText = textVal != null ? String(textVal) : '';
        return (
          <td
            key={col.key}
            className="cell-truncate"
            data-full={fullText.length > 15 ? fullText : undefined}
            style={{ ...S_TD, textAlign: col.align ?? 'left' }}
          >
            <span>{col.render(row, onPersonClick)}</span>
          </td>
        );
      })}
    </tr>
  );
}
