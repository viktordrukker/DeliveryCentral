import type React from 'react';

import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { parseNumericFilter } from '@/components/staffing-desk/InlineFilters';

/* ── Types ── */

export type FilterType = 'text' | 'multiselect' | 'date' | 'numeric' | 'none';

export interface ColDef {
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

export interface InlineFilterState {
  [key: string]: string;
}

/* ── Style constants ── */

export const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', textAlign: 'right' };
export const S_TABS: React.CSSProperties = { display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: 0 };
// Use longhand `borderBottom*` properties on tabs. React DOM warns when a
// shorthand (`borderBottom`) is removed across a re-render while a longhand
// (`borderBottomColor`) is still set — which happens here as the active-tab
// indicator toggles between Supply / Demand.
export const S_TAB: React.CSSProperties = { padding: 'var(--space-2) var(--space-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--color-text-muted)', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent', marginBottom: -2 };
export const S_TAB_ACTIVE: React.CSSProperties = { ...S_TAB, color: 'var(--color-accent)', borderBottomColor: 'var(--color-accent)' };
export const S_TABLE: React.CSSProperties = { borderCollapse: 'collapse', fontSize: 12 };
export const S_TH: React.CSSProperties = { padding: '6px 6px 0', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'left', background: 'var(--color-surface-alt)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, verticalAlign: 'top' };
export const S_TH_FILTER: React.CSSProperties = { padding: '0 6px 4px', background: 'var(--color-surface-alt)', position: 'sticky', top: 22, zIndex: 2, borderBottom: '2px solid var(--color-border)' };
export const S_TD: React.CSSProperties = { padding: '5px 6px', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' };
export const S_ROW: React.CSSProperties = { cursor: 'pointer', transition: 'background 80ms' };
export const S_TOOLBAR: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-1) 0' };

/* ── Option arrays ── */

export const STATUS_OPTS = ['CREATED', 'PROPOSED', 'REJECTED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
export const PRIORITY_OPTS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const EMP_STATUS_OPTS = ['ACTIVE', 'LEAVE', 'INACTIVE', 'TERMINATED'];

/* ── Client-side filtering logic ── */

export function applyInlineFilters(items: StaffingDeskRow[], filters: InlineFilterState, cols: ColDef[]): StaffingDeskRow[] {
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
          const cellParts = String(cellVal).split(',').map((s) => s.trim());
          if (!selected.some((s) => cellParts.includes(s))) return false;
          break;
        }
        case 'date': {
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

/* ── Unique values computation ── */

export function computeUniqueValues(rawItems: StaffingDeskRow[], allCols: ColDef[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const col of allCols) {
    if (col.filterType !== 'text' && col.filterType !== 'multiselect') continue;
    if (col.filterOptions) continue;
    const seen = new Set<string>();
    for (const row of rawItems) {
      const v = col.getValue(row);
      if (v == null || v === '') continue;
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
}