import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { OrgDistributionTreemap } from '@/components/charts/OrgDistributionTreemap';
import type { HrDistributionItem } from '@/lib/api/dashboard-hr-manager';
import { Table, type Column } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface Props {
  orgDistribution: HrDistributionItem[];
  totalHeadcount: number;
}

export function HrOrganizationTab({ orgDistribution, totalHeadcount }: Props): JSX.Element {
  const treemapData = orgDistribution.map((item) => ({ name: item.label, size: item.count }));

  return (
    <>
      {treemapData.length > 0 && (
        <div className="dashboard-hero" style={{ position: 'relative' }}>
          <TipBalloon tip="Visual breakdown of headcount by org unit. Larger blocks = more people." arrow="left" />
          <div className="dashboard-hero__header">
            <div>
              <div className="dashboard-hero__title">Org Distribution</div>
              <div className="dashboard-hero__subtitle">Headcount across organizational units</div>
            </div>
          </div>
          <div className="dashboard-hero__chart">
            <OrgDistributionTreemap data={treemapData} />
          </div>
        </div>
      )}
      <SectionCard
        title="Org Units"
        collapsible
        chartExport={{
          headers: ['Org Unit', 'Employees'],
          rows: orgDistribution.map((i) => ({ 'Org Unit': i.label, Employees: String(i.count) })),
        }}
      >
        {orgDistribution.length === 0 ? (
          <EmptyState description="No organization distribution data is available." title="No org distribution" />
        ) : (
          <Table
            variant="compact"
            columns={[
              { key: 'label', title: 'Org Unit', getValue: (i) => i.label, render: (i) => <span style={{ fontWeight: 500 }}>{i.label}</span> },
              { key: 'count', title: 'Employees', align: 'right', getValue: (i) => i.count, render: (i) => <span style={NUM}>{i.count}</span> },
              { key: 'pct', title: '% of Total', align: 'right', getValue: (i) => totalHeadcount > 0 ? Math.round((i.count / totalHeadcount) * 100) : 0, render: (i) => <span style={NUM}>{totalHeadcount > 0 ? Math.round((i.count / totalHeadcount) * 100) : 0}%</span> },
              { key: 'bar', title: 'Bar', width: 120, render: (i) => (
                <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: totalHeadcount > 0 ? `${Math.round((i.count / totalHeadcount) * 100)}%` : '0%', borderRadius: 2, background: 'var(--color-chart-5)' }} />
                </div>
              ) },
            ] as Column<HrDistributionItem>[]}
            rows={orgDistribution}
            getRowKey={(i) => i.key}
          />
        )}
      </SectionCard>
    </>
  );
}
