import { useCallback, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { ColumnConfigurator } from '@/components/staffing-desk/ColumnConfigurator';
import { TextFilter, MultiSelectFilter, DateFilter, NumericFilter, NoFilter } from '@/components/staffing-desk/InlineFilters';
import { useColumnVisibility } from '@/lib/hooks/useColumnVisibility';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import { priorityTone } from '@/features/staffing-desk/staffing-desk.types';
import { humanizeEnum } from '@/lib/labels';
import { formatDateShort } from '@/lib/format-date';
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

export type WorkflowTab = 'assignments' | 'positions';

interface Props {
  items: StaffingDeskRow[];
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  onRowClick?: (item: StaffingDeskRow) => void;
  columnsOpen?: boolean;
  onColumnsClose?: () => void;
}

/* ── Next Step rendering ── */

function renderNextStep(status: string, kind: 'assignment' | 'request'): React.ReactNode {
  const normalized = status.toUpperCase();
  const commonClosed = <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>&mdash; Closed</span>;
  const assignmentSteps: Record<string, React.ReactNode> = {
    CREATED: <span style={{ color: 'var(--color-status-info)', fontSize: 11 }}>&#x2192; Propose candidate</span>,
    PROPOSED: <span style={{ color: 'var(--color-status-warning)', fontSize: 11, fontWeight: 600 }}>&#x23F3; Review proposal</span>,
    BOOKED: <span style={{ color: 'var(--color-status-info)', fontSize: 11 }}>&#x2713; Start onboarding</span>,
    ONBOARDING: <span style={{ color: 'var(--color-status-pending)', fontSize: 11 }}>&#x25B6; Begin work</span>,
    ASSIGNED: <span style={{ color: 'var(--color-status-active)', fontSize: 11 }}>&#x25CF; In progress</span>,
    ON_HOLD: <span style={{ color: 'var(--color-status-warning)', fontSize: 11, fontWeight: 600 }}>&#x23F8; Release or cancel</span>,
  };
  if (kind === 'assignment') {
    return assignmentSteps[normalized] ?? commonClosed;
  }
  const requestSteps: Record<string, React.ReactNode> = {
    CREATED: <span style={{ color: 'var(--color-status-info)', fontSize: 11 }}>&#x2192; Propose candidate</span>,
    PROPOSED: <span style={{ color: 'var(--color-status-warning)', fontSize: 11, fontWeight: 600 }}>&#x23F3; Review proposal</span>,
    BOOKED: <span style={{ color: 'var(--color-status-active)', fontSize: 11 }}>&#x2713; Booked</span>,
    ONBOARDING: <span style={{ color: 'var(--color-status-pending)', fontSize: 11 }}>&#x25B6; Onboarding</span>,
    ASSIGNED: <span style={{ color: 'var(--color-status-active)', fontSize: 11 }}>&#x25CF; Filled</span>,
  };
  return requestSteps[normalized] ?? commonClosed;
}

/* ── Assignment columns ── */

const ASSIGNMENT_COLUMNS: ColDef[] = [
  { key: 'person', label: 'Person', category: 'Core', width: 130, filterType: 'text', getValue: (r) => r.personName, render: (r) => <span style={{ fontWeight: 500 }}>{r.personName ?? 'Unknown'}</span> },
  { key: 'project', label: 'Project', category: 'Core', width: 120, filterType: 'multiselect', getValue: (r) => r.projectName, render: (r) => r.projectName },
  { key: 'role', label: 'Role', category: 'Core', width: 100, filterType: 'multiselect', getValue: (r) => r.role, render: (r) => r.role },
  { key: 'alloc', label: '%', category: 'Core', width: 45, align: 'right', filterType: 'numeric', getValue: (r) => r.allocationPercent, render: (r) => <span style={NUM}>{r.allocationPercent}%</span> },
  { key: 'startDate', label: 'Start', category: 'Core', width: 78, filterType: 'date', getValue: (r) => r.startDate.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.startDate)}</span> },
  { key: 'endDate', label: 'End', category: 'Core', width: 78, filterType: 'date', getValue: (r) => r.endDate?.slice(0, 10) ?? null, render: (r) => r.endDate ? <span style={{ fontSize: 10 }}>{formatDateShort(r.endDate)}</span> : <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>Open</span> },
  { key: 'status', label: 'Status', category: 'Core', width: 85, filterType: 'multiselect', filterOptions: STATUS_OPTS, getValue: (r) => r.status, render: (r) => <StatusBadge label={humanizeEnum(r.status)} status={r.status} variant="dot" /> },
  { key: 'nextStep', label: 'Next Step', category: 'Core', width: 140, filterType: 'none', getValue: (r) => r.status, render: (r) => renderNextStep(r.status, 'assignment') },
  { key: 'grade', label: 'Grade', category: 'Person', width: 55, filterType: 'text', getValue: (r) => r.personGrade, render: (r) => r.personGrade ?? '' },
  { key: 'orgUnit', label: 'Dept', category: 'Person', width: 90, filterType: 'multiselect', getValue: (r) => r.personOrgUnit, render: (r) => r.personOrgUnit ?? '' },
  { key: 'manager', label: 'Manager', category: 'Person', width: 100, filterType: 'multiselect', getValue: (r) => r.personManager, render: (r) => r.personManager ?? '' },
  { key: 'pool', label: 'Pool', category: 'Person', width: 90, filterType: 'multiselect', getValue: (r) => r.personPool, render: (r) => r.personPool ?? '' },
  { key: 'empStatus', label: 'Emp.', category: 'Person', width: 70, filterType: 'multiselect', filterOptions: EMP_STATUS_OPTS, getValue: (r) => r.personEmploymentStatus, render: (r) => r.personEmploymentStatus ?? '' },
  { key: 'code', label: 'Code', category: 'Assignment', width: 80, filterType: 'text', getValue: (r) => r.assignmentCode, render: (r) => r.assignmentCode ?? '' },
  { key: 'createdAt', label: 'Created', category: 'Assignment', width: 78, filterType: 'date', getValue: (r) => r.createdAt.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.createdAt)}</span> },
];

/* ── Position columns ── */

const POSITION_COLUMNS: ColDef[] = [
  { key: 'project', label: 'Project', category: 'Core', width: 130, filterType: 'multiselect', getValue: (r) => r.projectName, render: (r) => <span style={{ fontWeight: 500 }}>{r.projectName}</span> },
  { key: 'role', label: 'Role', category: 'Core', width: 110, filterType: 'multiselect', getValue: (r) => r.role, render: (r) => r.role },
  { key: 'priority', label: 'Priority', category: 'Core', width: 75, filterType: 'multiselect', filterOptions: PRIORITY_OPTS, getValue: (r) => r.priority, render: (r) => r.priority ? <StatusBadge label={r.priority} tone={priorityTone(r.priority)} variant="chip" /> : null },
  { key: 'hc', label: 'HC', category: 'Core', width: 50, align: 'right', filterType: 'none', getValue: (r) => r.headcountFulfilled, render: (r) => <span style={NUM}>{r.headcountFulfilled ?? 0}/{r.headcountRequired ?? 1}</span> },
  { key: 'alloc', label: '%', category: 'Core', width: 45, align: 'right', filterType: 'numeric', getValue: (r) => r.allocationPercent, render: (r) => <span style={NUM}>{r.allocationPercent}%</span> },
  { key: 'startDate', label: 'Start', category: 'Core', width: 78, filterType: 'date', getValue: (r) => r.startDate.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.startDate)}</span> },
  { key: 'endDate', label: 'End', category: 'Core', width: 78, filterType: 'date', getValue: (r) => r.endDate?.slice(0, 10) ?? null, render: (r) => r.endDate ? <span style={{ fontSize: 10 }}>{formatDateShort(r.endDate)}</span> : <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>Open</span> },
  { key: 'status', label: 'Status', category: 'Core', width: 85, filterType: 'multiselect', filterOptions: STATUS_OPTS, getValue: (r) => r.status, render: (r) => <StatusBadge label={humanizeEnum(r.status)} status={r.status} variant="dot" /> },
  { key: 'nextStep', label: 'Next Step', category: 'Core', width: 140, filterType: 'none', getValue: (r) => r.status, render: (r) => renderNextStep(r.status, 'request') },
  { key: 'skills', label: 'Skills', category: 'Request', width: 120, filterType: 'multiselect', getValue: (r) => r.skills.join(','), render: (r) => <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.skills.slice(0, 3).join(', ')}{r.skills.length > 3 ? ` +${r.skills.length - 3}` : ''}</span> },
  { key: 'requestedBy', label: 'Requested By', category: 'Request', width: 100, filterType: 'multiselect', getValue: (r) => r.requestedByName, render: (r) => r.requestedByName ?? '' },
  { key: 'summary', label: 'Summary', category: 'Request', width: 160, filterType: 'text', getValue: (r) => r.summary, render: (r) => <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.summary ?? ''}</span> },
  { key: 'createdAt', label: 'Created', category: 'Request', width: 78, filterType: 'date', getValue: (r) => r.createdAt.slice(0, 10), render: (r) => <span style={{ fontSize: 10 }}>{formatDateShort(r.createdAt)}</span> },
];

/* ── Component ── */

/**
 * Phase DS-4-12 — drop-in repeat of `StaffingDeskTable`'s migration. Ported
 * to the DS `<Table>` primitive with `tableLayout="fixed"` + the bespoke
 * `renderFilterCell` / `cellProps` extensions added there. Same justification:
 * UX contract requires bespoke filter UX (autocomplete + multiselect-with-
 * search) and the column configurator with drag-reorder + presets — both
 * richer than DataView's MVP.
 *
 * Preserved: `useColumnVisibility('asn-assignments' | 'asn-positions')`
 * localStorage keys, ColumnConfigurator, `data-testid="workflow-table"` (now
 * on the Table wrapper), `tab-assignments` / `tab-positions` on the tab
 * buttons, the per-tab empty-state copy ("No ${activeTab} found." vs "No rows
 * match the current filters."), and the bespoke "Next Step" column.
 */
export function AssignmentsWorkflowTable({ items, activeTab, onTabChange, onRowClick, columnsOpen, onColumnsClose }: Props): JSX.Element {
  const [assignmentFilters, setAssignmentFilters] = useState<InlineFilterState>({});
  const [positionFilters, setPositionFilters] = useState<InlineFilterState>({});

  const assignmentColKeys = useMemo(() => ASSIGNMENT_COLUMNS.map((c) => c.key), []);
  const positionColKeys = useMemo(() => POSITION_COLUMNS.map((c) => c.key), []);
  const assignmentVis = useColumnVisibility('asn-assignments', assignmentColKeys);
  const positionVis = useColumnVisibility('asn-positions', positionColKeys);

  const vis = activeTab === 'assignments' ? assignmentVis : positionVis;
  const allCols = activeTab === 'assignments' ? ASSIGNMENT_COLUMNS : POSITION_COLUMNS;
  const colMap = useMemo(() => new Map(allCols.map((c) => [c.key, c])), [allCols]);
  const visibleCols = useMemo(
    () => vis.columnOrder.map((key) => colMap.get(key)).filter((c): c is ColDef => !!c && vis.isVisible(c.key)),
    [vis.columnOrder, colMap, vis],
  );
  const inlineFilters = activeTab === 'assignments' ? assignmentFilters : positionFilters;
  const setInlineFilters = activeTab === 'assignments' ? setAssignmentFilters : setPositionFilters;

  const setFilter = useCallback((key: string, value: string) => {
    setInlineFilters((prev) => ({ ...prev, [key]: value }));
  }, [setInlineFilters]);

  const assignmentItems = useMemo(() => items.filter((r) => r.kind === 'assignment'), [items]);
  const positionItems = useMemo(() => items.filter((r) => r.kind === 'request'), [items]);
  const rawItems = activeTab === 'assignments' ? assignmentItems : positionItems;

  const currentItems = useMemo(
    () => applyInlineFilters(rawItems, inlineFilters, allCols),
    [rawItems, inlineFilters, allCols],
  );

  const activeFilterCount = Object.values(inlineFilters).filter(Boolean).length;
  const uniqueValuesMap = useMemo(() => computeUniqueValues(rawItems, allCols), [rawItems, allCols]);

  // ── ColDef → Column<StaffingDeskRow> mapping for the DS primitive ────────
  const dsColumns: Column<StaffingDeskRow>[] = useMemo(
    () => visibleCols.map((c) => ({
      key: c.key,
      title: c.label,
      width: c.width,
      align: c.align,
      getValue: c.getValue,
      // Wrap render output in `<span>` so the `.cell-truncate > span` CSS rule
      // applies (display:block + nowrap + ellipsis) — keeps inline children
      // like `<StatusBadge variant="dot">` on a single line.
      render: (row) => <span>{c.render(row)}</span>,
      className: 'cell-truncate',
    })),
    [visibleCols],
  );

  // Per-cell `data-full` for the cell-truncate hover-tooltip CSS attr.
  const cellProps = useCallback(
    (row: StaffingDeskRow, column: Column<StaffingDeskRow>): Record<string, string | undefined> => {
      if (!column.getValue) return {};
      const val = column.getValue(row);
      const fullText = val != null ? String(val) : '';
      return fullText.length > 15 ? { 'data-full': fullText } : {};
    },
    [],
  );

  // Bespoke filter row — one cell per visible column.
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

  // Per-tab empty-state copy preserved verbatim from the contract.
  const emptyState = (
    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
      {rawItems.length === 0 ? `No ${activeTab} found.` : 'No rows match the current filters.'}
    </div>
  );

  return (
    <div>
      <div style={S_TOOLBAR}>
        <div style={S_TABS}>
          <Button
            data-testid="tab-assignments"
            variant={activeTab === 'assignments' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onTabChange('assignments')}
            type="button"
          >
            Assignments ({assignmentItems.length})
          </Button>
          <Button
            data-testid="tab-positions"
            variant={activeTab === 'positions' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onTabChange('positions')}
            type="button"
          >
            Positions ({positionItems.length})
          </Button>
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
        testId="workflow-table"
        variant="compact"
        tableLayout="fixed"
        columns={dsColumns}
        rows={currentItems}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick ? (r) => onRowClick(r) : undefined}
        renderFilterCell={renderFilterCell}
        cellProps={cellProps}
        emptyState={emptyState}
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
