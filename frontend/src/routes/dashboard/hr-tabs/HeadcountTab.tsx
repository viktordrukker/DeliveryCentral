import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { HeadcountTrendLine } from '@/components/charts/HeadcountTrendLine';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface Props {
  totalHeadcount: number;
  activeHeadcount: number;
  inactiveHeadcount: number;
  withoutManager: number;
  withoutOrgUnit: number;
  headcountTrend: Array<{ count: number; month: string }>;
}

export function HrHeadcountTab({
  totalHeadcount,
  activeHeadcount,
  inactiveHeadcount,
  withoutManager,
  withoutOrgUnit,
  headcountTrend,
}: Props): JSX.Element {
  const rows = [
    { label: 'Active', value: activeHeadcount, color: 'var(--color-status-active)' },
    { label: 'Inactive', value: inactiveHeadcount, color: 'var(--color-status-neutral)' },
    { label: 'Without Manager', value: withoutManager, color: 'var(--color-status-warning)' },
    { label: 'Without Org Unit', value: withoutOrgUnit, color: 'var(--color-status-warning)' },
  ];

  return (
    <>
      <div className="dashboard-hero" style={{ position: 'relative' }}>
        <TipBalloon tip="6-month headcount trend showing active employee count over time." arrow="left" />
        <div className="dashboard-hero__header">
          <div>
            <div className="dashboard-hero__title">Headcount Trend (6 Months)</div>
            <div className="dashboard-hero__subtitle">Active employee count over time</div>
          </div>
        </div>
        <div className="dashboard-hero__chart">
          <HeadcountTrendLine data={headcountTrend} />
        </div>
      </div>
      <SectionCard
        title="Headcount Breakdown"
        collapsible
        chartExport={{
          headers: ['Metric', 'Value'],
          rows: [
            { Metric: 'Total', Value: String(totalHeadcount) },
            { Metric: 'Active', Value: String(activeHeadcount) },
            { Metric: 'Inactive', Value: String(inactiveHeadcount) },
            { Metric: 'Without Manager', Value: String(withoutManager) },
            { Metric: 'Without Org Unit', Value: String(withoutOrgUnit) },
          ],
        }}
      >
        <table className="dash-compact-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th style={NUM}>Count</th>
              <th style={NUM}>% of Total</th>
              <th style={{ width: 120 }}>Bar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td style={{ fontWeight: 500 }}>{row.label}</td>
                <td style={{ ...NUM, fontWeight: 600 }}>{row.value}</td>
                <td style={NUM}>{totalHeadcount > 0 ? Math.round((row.value / totalHeadcount) * 100) : 0}%</td>
                <td>
                  <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: totalHeadcount > 0 ? `${Math.round((row.value / totalHeadcount) * 100)}%` : '0%', borderRadius: 2, background: row.color }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </>
  );
}
