import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { OrgDistributionTreemap } from '@/components/charts/OrgDistributionTreemap';
import type { HrDistributionItem } from '@/lib/api/dashboard-hr-manager';

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
          <table className="dash-compact-table">
            <thead>
              <tr>
                <th>Org Unit</th>
                <th style={NUM}>Employees</th>
                <th style={NUM}>% of Total</th>
                <th style={{ width: 120 }}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {orgDistribution.map((item) => (
                <tr key={item.key}>
                  <td style={{ fontWeight: 500 }}>{item.label}</td>
                  <td style={NUM}>{item.count}</td>
                  <td style={NUM}>{totalHeadcount > 0 ? Math.round((item.count / totalHeadcount) * 100) : 0}%</td>
                  <td>
                    <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: totalHeadcount > 0 ? `${Math.round((item.count / totalHeadcount) * 100)}%` : '0%', borderRadius: 2, background: 'var(--color-chart-5)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
