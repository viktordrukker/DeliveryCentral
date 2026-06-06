import { useMemo, useState } from 'react';

import { Button, Table, type Column } from '@/components/ds';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { humanizeEnum } from '@/lib/labels';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';

import { BulkReassignModal } from './BulkReassignModal';

interface Props {
  items: StaffingDeskRow[];
  onApplied: () => void;
}

function columns(
  selected: Set<string>,
  toggle: (id: string) => void,
): Array<Column<StaffingDeskRow>> {
  return [
    {
      key: 'select',
      title: '',
      width: 32,
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.role} on ${row.projectName}`}
          checked={selected.has(row.id)}
          onChange={() => toggle(row.id)}
          data-testid={`bulk-reassign-row-${row.id}`}
        />
      ),
    },
    {
      key: 'person',
      title: 'Person',
      render: (row) =>
        row.personName ?? (
          <span style={{ color: 'var(--color-text-muted)' }}>(open)</span>
        ),
    },
    {
      key: 'project',
      title: 'Project',
      render: (row) => row.projectName,
    },
    {
      key: 'role',
      title: 'Role',
      render: (row) => row.role,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <StatusBadge label={humanizeEnum(row.status)} status={row.status} variant="dot" />
      ),
    },
  ];
}

/**
 * LEAN-P4-missing-1 — bulk-reassign panel mounted below the staffing-desk
 * table when the `dsRefresh` flag is on. Lets a PM tick multiple rows and
 * apply a single batch reassignment (new active person and/or new project)
 * via `POST /api/project-positions/bulk-reassign`.
 *
 * Eligibility filter: positions that can be reassigned (every non-RELEASED
 * row in the visible list). The BE re-validates and refuses RELEASED rows
 * even if the FE accidentally sends them.
 */
export function BulkReassignPanel({ items, onApplied }: Props): JSX.Element | null {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  const eligible = useMemo(
    () => items.filter((row) => row.kind === 'assignment' && row.status?.toUpperCase() !== 'RELEASED'),
    [items],
  );

  if (eligible.length === 0) return null;

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setSelected((prev) =>
      prev.size === eligible.length ? new Set() : new Set(eligible.map((row) => row.id)),
    );
  }

  return (
    <SectionCard title="Bulk reassign">
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        Pick multiple positions and reassign them to a new person or move them to
        a different project in one batch action. Released positions are not eligible.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'center',
          padding: 'var(--space-2) 0',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <input
          type="checkbox"
          aria-label="Select all eligible positions"
          checked={selected.size === eligible.length && eligible.length > 0}
          onChange={toggleAll}
          data-testid="bulk-reassign-select-all"
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {selected.size} of {eligible.length} selected
        </span>
        <div style={{ flex: 1 }} />
        <Button
          variant="primary"
          size="sm"
          disabled={selected.size === 0}
          onClick={() => setModalOpen(true)}
          type="button"
          data-testid="bulk-reassign-open"
        >
          Reassign {selected.size > 0 ? `(${selected.size})` : ''}
        </Button>
      </div>

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
        }}
      >
        <Table<StaffingDeskRow>
          variant="compact"
          getRowKey={(row) => row.id}
          rows={eligible}
          columns={columns(selected, toggle)}
        />
      </div>

      <BulkReassignModal
        open={modalOpen}
        selectedIds={Array.from(selected)}
        onClose={() => setModalOpen(false)}
        onApplied={() => {
          setSelected(new Set());
          onApplied();
        }}
      />
    </SectionCard>
  );
}
