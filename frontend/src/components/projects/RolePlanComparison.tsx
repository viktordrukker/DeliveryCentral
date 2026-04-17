import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import type { RolePlanComparisonResult } from '@/lib/api/project-role-plan';

interface RolePlanComparisonProps {
  data: RolePlanComparisonResult;
}

function fillRateTone(rate: number): StatusTone {
  if (rate >= 100) return 'active';
  if (rate >= 50) return 'warning';
  return 'danger';
}

export function RolePlanComparison({ data }: RolePlanComparisonProps): JSX.Element {
  if (data.rows.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No role plan defined. Add roles above to start tracking staffing gaps.</p>;
  }

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', fontSize: 12 }}>
        <span>Planned: <strong>{data.totalPlanned}</strong></span>
        <span>Filled: <strong>{data.totalFilled}</strong></span>
        <span>Gaps: <strong style={{ color: data.totalGap > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>{data.totalGap}</strong></span>
        <span>Fill Rate: <StatusBadge status={data.overallFillRate >= 100 ? 'active' : data.overallFillRate >= 50 ? 'warning' : 'danger'} label={`${data.overallFillRate}%`} variant="chip" /></span>
      </div>

      {/* Comparison table */}
      <table className="dash-compact-table">
        <caption className="sr-only">Role plan vs actual staffing comparison</caption>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Seniority</th>
            <th scope="col" style={{ textAlign: 'right', width: 55 }}>Planned</th>
            <th scope="col" style={{ textAlign: 'right', width: 55 }}>Internal</th>
            <th scope="col" style={{ textAlign: 'right', width: 55 }}>Vendor</th>
            <th scope="col" style={{ textAlign: 'right', width: 55 }}>Total</th>
            <th scope="col" style={{ width: 70 }}>Fill Rate</th>
            <th scope="col" style={{ textAlign: 'right', width: 40 }}>Gap</th>
            <th scope="col" style={{ width: 80 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={`${row.roleName}-${row.seniorityLevel}-${i}`}>
              <td style={{ fontWeight: 500 }}>{row.roleName}</td>
              <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{row.seniorityLevel || '\u2014'}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.plannedHeadcount}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.internalFilled}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.vendorFilled}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{row.totalFilled}</td>
              <td><StatusBadge status={fillRateTone(row.fillRate) as string} label={`${row.fillRate}%`} variant="chip" /></td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: row.gap > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{row.gap}</td>
              <td><StatusBadge status={row.status === 'FILLED' ? 'active' : row.status === 'PARTIAL' ? 'warning' : 'danger'} label={row.status} variant="dot" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
