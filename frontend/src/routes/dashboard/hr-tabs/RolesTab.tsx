import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { ManagerSpanDistributionBar } from '@/components/charts/ManagerSpanDistributionBar';
import type { HrDistributionItem } from '@/lib/api/dashboard-hr-manager';
import { Table, type Column } from '@/components/ds';

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
          <Table
            variant="compact"
            columns={[
              { key: 'type', title: 'Type', width: 70, getValue: (r) => r.kind, render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.kind === 'role' ? 'Role' : 'Grade'}</span> },
              { key: 'label', title: 'Label', getValue: (r) => r.label, render: (r) => <span style={{ fontWeight: 500 }}>{humanize(r.label)}</span> },
              { key: 'count', title: 'Count', align: 'right', getValue: (r) => r.count, render: (r) => <span style={NUM}>{r.count}</span> },
              { key: 'bar', title: 'Bar', width: 120, render: (r) => (
                <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round((r.count / Math.max(1, totalHeadcount)) * 100))}%`, borderRadius: 2, background: r.kind === 'role' ? 'var(--color-chart-3)' : 'var(--color-chart-5)' }} />
                </div>
              ) },
            ] as Column<HrDistributionItem & { kind: 'role' | 'grade' }>[]}
            rows={[
              ...roleDistribution.map((item) => ({ ...item, kind: 'role' as const })),
              ...gradeDistribution.map((item) => ({ ...item, kind: 'grade' as const })),
            ]}
            getRowKey={(r) => `${r.kind}-${r.key}`}
          />
        )}
      </SectionCard>
    </>
  );
}
