import { useMemo } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { StaffingDeskRow, StatusGroup } from '@/lib/api/staffing-desk';
import { statusTone, priorityTone } from '@/features/staffing-desk/staffing-desk.types';
import { humanizeEnum } from '@/lib/labels';

interface Props {
  items: StaffingDeskRow[];
  onCardClick?: (row: StaffingDeskRow) => void;
}

interface Column {
  color: string;
  groups: StatusGroup[];
  label: string;
}

const COLUMNS: Column[] = [
  { label: 'Draft', groups: ['draft'], color: 'var(--color-status-info)' },
  { label: 'Pending', groups: ['pending'], color: 'var(--color-status-pending)' },
  { label: 'Active', groups: ['active'], color: 'var(--color-status-active)' },
  { label: 'Done', groups: ['done'], color: 'var(--color-status-neutral)' },
  { label: 'Cancelled', groups: ['cancelled'], color: 'var(--color-status-danger)' },
];

const S_BOARD: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(180px, 1fr))`,
  gap: 'var(--space-2)', overflowX: 'auto', padding: 'var(--space-2) 0',
};
const S_COL: React.CSSProperties = {
  background: 'var(--color-surface-alt)', borderRadius: 8, padding: 'var(--space-2)',
  minHeight: 200, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
};
const S_COL_HEADER: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 'var(--space-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const S_CARD: React.CSSProperties = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 6, padding: '8px 10px', cursor: 'pointer',
  transition: 'box-shadow 100ms',
};

function priorityOrder(p: string | null): number {
  if (!p) return 4;
  switch (p.toUpperCase()) {
    case 'URGENT': return 0;
    case 'HIGH': return 1;
    case 'MEDIUM': return 2;
    case 'LOW': return 3;
    default: return 4;
  }
}

export function StaffingDeskBoard({ items, onCardClick }: Props): JSX.Element {
  const grouped = useMemo(() => {
    const map = new Map<StatusGroup, StaffingDeskRow[]>();
    for (const col of COLUMNS) {
      for (const g of col.groups) map.set(g, []);
    }
    for (const item of items) {
      const arr = map.get(item.statusGroup);
      if (arr) arr.push(item);
    }
    // Sort each group by priority then startDate
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const pd = priorityOrder(a.priority) - priorityOrder(b.priority);
        if (pd !== 0) return pd;
        return a.startDate.localeCompare(b.startDate);
      });
    }
    return map;
  }, [items]);

  return (
    <div style={S_BOARD}>
      {COLUMNS.map((col) => {
        const colItems = col.groups.flatMap((g) => grouped.get(g) ?? []);
        return (
          <div key={col.label} style={S_COL}>
            <div style={S_COL_HEADER}>
              <span style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: 2 }}>{col.label}</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>{colItems.length}</span>
            </div>
            {colItems.map((row) => (
              <div
                key={row.id}
                style={S_CARD}
                onClick={() => onCardClick?.(row)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-dropdown)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{row.projectName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {row.kind === 'assignment' ? '👤 ' : '📋 '}
                  {row.personName ?? row.role}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                    {row.allocationPercent}%
                  </span>
                  <StatusBadge label={humanizeEnum(row.status)} tone={statusTone(row)} variant="dot" size="small" />
                  {row.priority && <StatusBadge label={row.priority} tone={priorityTone(row.priority)} variant="chip" size="small" />}
                </div>
              </div>
            ))}
            {colItems.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', textAlign: 'center', padding: 'var(--space-4)' }}>
                No items
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
