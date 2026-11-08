import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { HeadcountTrendLine } from '@/components/charts/HeadcountTrendLine';
import { Pct, Table, type Column } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface Props {
  totalHeadcount: number;
  activeHeadcount: number;
  inactiveHeadcount: number;
  withoutManager: number;
  withoutOrgUnit: number;
  // W2-08: `null` while loading or after a failed fetch — render EmptyState
  // rather than a fabricated trend. `[]` is treated the same.
  headcountTrend: Array<{ count: number; month: string }> | null;
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
        <div className="dashboard-hero__chart" data-testid="hr-headcount-trend-chart">
          {headcountTrend && headcountTrend.length > 0 ? (
            <HeadcountTrendLine data={headcountTrend} />
          ) : (
            <EmptyState
              title="Headcount trend unavailable"
              description="Historical headcount data is not available yet. Check back once people records include hire and termination dates."
              action={{ href: '/people', label: 'View employee directory' }}
            />
          )}
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
        <Table
          variant="compact"
          columns={[
            { key: 'label', title: 'Metric', getValue: (r) => r.label, render: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
            { key: 'value', title: 'Count', align: 'right', getValue: (r) => r.value, render: (r) => <span style={{ ...NUM, fontWeight: 600 }}>{r.value}</span> },
            { key: 'pct', title: '% of Total', align: 'right', getValue: (r) => totalHeadcount > 0 ? Math.round((r.value / totalHeadcount) * 100) : 0, render: (r) => <Pct value={totalHeadcount > 0 ? Math.round((r.value / totalHeadcount) * 100) : 0} fractionDigits={0} /> },
            { key: 'bar', title: 'Bar', width: 120, render: (r) => (
              <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: totalHeadcount > 0 ? `${Math.round((r.value / totalHeadcount) * 100)}%` : '0%', borderRadius: 2, background: r.color }} />
              </div>
            ) },
          ] as Column<typeof rows[number]>[]}
          rows={rows}
          getRowKey={(r) => r.label}
        />
      </SectionCard>
    </>
  );
}
