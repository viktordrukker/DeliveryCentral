import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { ManagerSpanDistributionBar } from '@/components/charts/ManagerSpanDistributionBar';
import type { HrDistributionItem } from '@/lib/api/dashboard-hr-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface Props {
  roleDistribution: HrDistributionItem[];
  gradeDistribution: HrDistributionItem[];
  totalHeadcount: number;
}

function humanize(label: string): string {
  return label.includes(' ') ? label : label.replace(/([A-Z])/g, ' $1').trim();
}

export function HrRolesTab({ roleDistribution, gradeDistribution, totalHeadcount }: Props): JSX.Element {
  const managerSpanData = roleDistribution.filter((r) => r.count > 0).map((r) => ({ managerName: r.label, reportCount: r.count }));

  return (
    <>
      {managerSpanData.length > 0 && (
        <div className="dashboard-hero" style={{ position: 'relative' }}>
          <TipBalloon tip="Distribution of roles across the organization." arrow="left" />
          <div className="dashboard-hero__header">
            <div>
              <div className="dashboard-hero__title">Role Distribution</div>
              <div className="dashboard-hero__subtitle">Headcount by role and grade</div>
            </div>
          </div>
          <div className="dashboard-hero__chart">
            <ManagerSpanDistributionBar data={managerSpanData} />
          </div>
        </div>
      )}
      <SectionCard
        title="Roles and Grades"
        collapsible
        chartExport={{
          headers: ['Type', 'Label', 'Count'],
          rows: [
            ...roleDistribution.map((i) => ({ Type: 'Role', Label: i.label, Count: String(i.count) })),
            ...gradeDistribution.map((i) => ({ Type: 'Grade', Label: i.label, Count: String(i.count) })),
          ],
        }}
      >
        {roleDistribution.length === 0 && gradeDistribution.length === 0 ? (
          <EmptyState description="No role or grade distribution data is available." title="No role or grade data" />
        ) : (
          <table className="dash-compact-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Label</th>
                <th style={NUM}>Count</th>
                <th style={{ width: 120 }}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {roleDistribution.map((item) => (
                <tr key={`role-${item.key}`}>
                  <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Role</td>
                  <td style={{ fontWeight: 500 }}>{humanize(item.label)}</td>
                  <td style={NUM}>{item.count}</td>
                  <td>
                    <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.round((item.count / Math.max(1, totalHeadcount)) * 100))}%`, borderRadius: 2, background: 'var(--color-chart-3)' }} />
                    </div>
                  </td>
                </tr>
              ))}
              {gradeDistribution.map((item) => (
                <tr key={`grade-${item.key}`}>
                  <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Grade</td>
                  <td style={{ fontWeight: 500 }}>{humanize(item.label)}</td>
                  <td style={NUM}>{item.count}</td>
                  <td>
                    <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.round((item.count / Math.max(1, totalHeadcount)) * 100))}%`, borderRadius: 2, background: 'var(--color-chart-5)' }} />
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
