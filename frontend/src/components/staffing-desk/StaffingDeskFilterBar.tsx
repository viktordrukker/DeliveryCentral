import { useCallback, useState } from 'react';

import { FilterBar } from '@/components/common/FilterBar';
import { ChipInput } from '@/components/staffing-desk/ChipInput';

interface Filters {
  allocMax: string;
  allocMin: string;
  from: string;
  kind: string;
  orgUnitId: string;
  person: string;
  poolId: string;
  priority: string;
  project: string;
  role: string;
  skills: string;
  status: string;
  to: string;
}

interface Props {
  filters: Filters;
  onReset: () => void;
  setFilters: (updates: Partial<Filters>) => void;
}

const STATUS_OPTIONS = [
  'DRAFT', 'REQUESTED', 'OPEN', 'IN_REVIEW', 'APPROVED', 'ACTIVE',
  'ENDED', 'FULFILLED', 'REJECTED', 'REVOKED', 'CANCELLED', 'ARCHIVED',
];

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function splitComma(s: string): string[] {
  return s ? s.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

export function StaffingDeskFilterBar({ filters, onReset, setFilters }: Props): JSX.Element {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const statusValues = splitComma(filters.status);
  const priorityValues = splitComma(filters.priority);
  const skillValues = splitComma(filters.skills);

  const setStatus = useCallback((vals: string[]) => setFilters({ status: vals.join(',') }), [setFilters]);
  const setPriority = useCallback((vals: string[]) => setFilters({ priority: vals.join(',') }), [setFilters]);
  const setSkills = useCallback((vals: string[]) => setFilters({ skills: vals.join(',') }), [setFilters]);

  return (
    <FilterBar
      actions={
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button className="button button--secondary button--sm" onClick={() => setShowAdvanced((v) => !v)} type="button">
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          <button className="button button--secondary button--sm" onClick={onReset} type="button">
            Reset
          </button>
        </div>
      }
    >
      {/* Tier 1: always visible */}
      <label className="field">
        <span className="field__label">Person</span>
        <input className="field__control" type="search" placeholder="Name search" value={filters.person} onChange={(e) => setFilters({ person: e.target.value })} />
      </label>
      <label className="field">
        <span className="field__label">Project</span>
        <input className="field__control" type="search" placeholder="Project name" value={filters.project} onChange={(e) => setFilters({ project: e.target.value })} />
      </label>
      <ChipInput label="Status" values={statusValues} onChange={setStatus} suggestions={STATUS_OPTIONS} placeholder="Add status..." />
      <label className="field">
        <span className="field__label">From</span>
        <input className="field__control" type="date" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} />
      </label>
      <label className="field">
        <span className="field__label">To</span>
        <input className="field__control" type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} />
      </label>

      {/* Tier 2: advanced */}
      {showAdvanced && (
        <>
          <ChipInput label="Priority" values={priorityValues} onChange={setPriority} suggestions={PRIORITY_OPTIONS} placeholder="Add priority..." />
          <label className="field">
            <span className="field__label">Role</span>
            <input className="field__control" type="search" placeholder="Staffing role" value={filters.role} onChange={(e) => setFilters({ role: e.target.value })} />
          </label>
          <ChipInput label="Skills" values={skillValues} onChange={setSkills} placeholder="Add skill..." />
          <label className="field">
            <span className="field__label">Alloc Min %</span>
            <input className="field__control" type="number" min={0} max={200} value={filters.allocMin} onChange={(e) => setFilters({ allocMin: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Alloc Max %</span>
            <input className="field__control" type="number" min={0} max={200} value={filters.allocMax} onChange={(e) => setFilters({ allocMax: e.target.value })} />
          </label>
        </>
      )}
    </FilterBar>
  );
}
