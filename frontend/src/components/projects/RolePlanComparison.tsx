import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import type { RolePlanComparisonResult } from '@/lib/api/project-role-plan';

interface RolePlanComparisonProps {
  data: RolePlanComparisonResult;
}

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

function fillRateTone(rate: number): StatusTone {
  if (rate >= 100) return 'active';
  if (rate >= 50) return 'warning';
  return 'danger';
}

type RolePlanRow = RolePlanComparisonResult['rows'][number];

export function RolePlanComparison({ data }: RolePlanComparisonProps): JSX.Element {
  if (data.rows.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No role plan defined. Add roles above to start tracking staffing gaps.</p>;
  }

  const columns: Column<RolePlanRow>[] = [
    { key: 'role', title: 'Role', getValue: (r) => r.roleName, render: (r) => <span style={{ fontWeight: 500 }}>{r.roleName}</span> },
    { key: 'seniority', title: 'Seniority', getValue: (r) => r.seniorityLevel ?? '', render: (r) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{r.seniorityLevel || '—'}</span> },
    { key: 'planned', title: 'Planned', align: 'right', width: 55, getValue: (r) => r.plannedHeadcount, render: (r) => <span style={NUM}>{r.plannedHeadcount}</span> },
    { key: 'internal', title: 'Internal', align: 'right', width: 55, getValue: (r) => r.internalFilled, render: (r) => <span style={NUM}>{r.internalFilled}</span> },
    { key: 'vendor', title: 'Vendor', align: 'right', width: 55, getValue: (r) => r.vendorFilled, render: (r) => <span style={NUM}>{r.vendorFilled}</span> },
    { key: 'total', title: 'Total', align: 'right', width: 55, getValue: (r) => r.totalFilled, render: (r) => <span style={{ ...NUM, fontWeight: 600 }}>{r.totalFilled}</span> },
    { key: 'fillRate', title: 'Fill Rate', width: 70, getValue: (r) => r.fillRate, render: (r) => <StatusBadge status={fillRateTone(r.fillRate) as string} label={`${r.fillRate}%`} variant="chip" /> },
    { key: 'gap', title: 'Gap', align: 'right', width: 40, getValue: (r) => r.gap, render: (r) => <span style={{ ...NUM, color: r.gap > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{r.gap}</span> },
    { key: 'status', title: 'Status', width: 80, getValue: (r) => r.status, render: (r) => <StatusBadge status={r.status === 'FILLED' ? 'active' : r.status === 'PARTIAL' ? 'warning' : 'danger'} label={r.status} variant="dot" /> },
  ];

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', fontSize: 12 }}>
        <span>Planned: <strong>{data.totalPlanned}</strong></span>
        <span>Filled: <strong>{data.totalFilled}</strong></span>
        <span>Gaps: <strong style={{ color: data.totalGap > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>{data.totalGap}</strong></span>
        <span>Fill Rate: <StatusBadge status={data.overallFillRate >= 100 ? 'active' : data.overallFillRate >= 50 ? 'warning' : 'danger'} label={`${data.overallFillRate}%`} variant="chip" /></span>
      </div>

      <Table
        variant="compact"
        columns={columns}
        rows={data.rows}
        getRowKey={(r, i) => `${r.roleName}-${r.seniorityLevel}-${i}`}
      />
    </div>
  );
}
