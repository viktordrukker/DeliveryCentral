import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { formatDate } from '@/lib/format-date';
import { Table, type Column } from '@/components/ds';
import type {
  HrAtRiskEmployee,
  HrLifecycleActivityItem,
} from '@/lib/api/dashboard-hr-manager';

interface Props {
  atRisk: HrAtRiskEmployee[];
  openCaseSubjects: string[];
  recentJoinerActivity: HrLifecycleActivityItem[];
  recentDeactivationActivity: HrLifecycleActivityItem[];
  onPersonClick: (personId: string) => void;
}

interface LifecycleRow extends HrLifecycleActivityItem {
  kind: 'joined' | 'deactivated';
  rowKey: string;
}

export function HrLifecycleTab({
  atRisk,
  openCaseSubjects,
  recentJoinerActivity,
  recentDeactivationActivity,
  onPersonClick,
}: Props): JSX.Element {
  const lifecycleRows: LifecycleRow[] = [
    ...recentJoinerActivity.map((i) => ({ ...i, kind: 'joined' as const, rowKey: `join-${i.personId}` })),
    ...recentDeactivationActivity.map((i) => ({ ...i, kind: 'deactivated' as const, rowKey: `deact-${i.personId}` })),
  ];

  const atRiskColumns: Column<HrAtRiskEmployee & { _index: number }>[] = [
    { key: 'index', title: '#', width: 28, getValue: (e) => e._index, render: (e) => <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{e._index}</span> },
    { key: 'name', title: 'Name', getValue: (e) => e.displayName, render: (e) => <span style={{ fontWeight: 500 }}>{e.displayName}</span> },
    { key: 'email', title: 'Email', getValue: (e) => e.primaryEmail ?? '', render: (e) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{e.primaryEmail ?? '—'}</span> },
    { key: 'risk', title: 'Risk Factors', render: (e) => (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {e.riskFactors.map((factor) => (
          <span key={factor} style={{ background: 'var(--color-status-danger)', color: 'var(--color-surface)', borderRadius: 3, fontSize: 10, fontWeight: 600, padding: '1px 6px' }}>{factor}</span>
        ))}
      </div>
    ) },
    { key: 'go', title: '', width: 40, render: (e) => (
      <Link to={`/people/${e.personId}`} onClick={(ev) => ev.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link>
    ) },
  ];

  const lifecycleColumns: Column<LifecycleRow>[] = [
    { key: 'type', title: 'Type', width: 90, getValue: (r) => r.kind === 'joined' ? 'Joined' : 'Deactivated', render: (r) => (
      <span style={{ color: r.kind === 'joined' ? 'var(--color-status-active)' : 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>
        {r.kind === 'joined' ? 'Joined' : 'Deactivated'}
      </span>
    ) },
    { key: 'name', title: 'Name', getValue: (r) => r.displayName, render: (r) => <span style={{ fontWeight: 500 }}>{r.displayName}</span> },
    { key: 'date', title: 'Date', width: 100, getValue: (r) => r.occurredAt, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(r.occurredAt)}</span> },
    { key: 'go', title: '', width: 40, render: (r) => (
      <Link to={`/people/${r.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link>
    ) },
  ];

  return (
    <>
      {atRisk.length > 0 && (
        <div className="dash-action-section" style={{ position: 'relative' }}>
          <TipBalloon tip="Employees flagged as at-risk based on multiple signals. Review and take action." arrow="left" />
          <div className="dash-action-section__header">
            <span className="dash-action-section__title">At-Risk Employees ({atRisk.length})</span>
          </div>
          <div data-testid="at-risk-employees-panel">
            <Table
              variant="compact"
              columns={atRiskColumns}
              rows={atRisk.map((e, i) => ({ ...e, _index: i + 1 }))}
              getRowKey={(e) => e.personId}
              onRowClick={(e) => onPersonClick(e.personId)}
            />
          </div>
        </div>
      )}

      {openCaseSubjects.length > 0 && (
        <SectionCard title={`People with Open Cases (${openCaseSubjects.length})`} collapsible>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {openCaseSubjects.length} person{openCaseSubjects.length !== 1 ? 's have' : ' has'} an open case and may need HR attention.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {openCaseSubjects.slice(0, 20).map((id) => (
              <span
                key={id}
                style={{ display: 'inline-block', background: 'var(--color-status-danger)', color: 'var(--color-surface)', borderRadius: 3, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace' }}
              >
                {id.slice(0, 8)}...
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <Link style={{ fontSize: 11, color: 'var(--color-accent)' }} to="/cases">View all cases</Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Lifecycle Activity"
        collapsible
        chartExport={{
          headers: ['Type', 'Name', 'Date'],
          rows: [
            ...recentJoinerActivity.map((i) => ({ Type: 'Joined', Name: i.displayName, Date: i.occurredAt.slice(0, 10) })),
            ...recentDeactivationActivity.map((i) => ({ Type: 'Deactivated', Name: i.displayName, Date: i.occurredAt.slice(0, 10) })),
          ],
        }}
      >
        {lifecycleRows.length === 0 ? (
          <EmptyState description="No joiners or deactivations recorded recently." title="No recent lifecycle activity" />
        ) : (
          <Table
            variant="compact"
            columns={lifecycleColumns}
            rows={lifecycleRows}
            getRowKey={(r) => r.rowKey}
            onRowClick={(r) => onPersonClick(r.personId)}
          />
        )}
      </SectionCard>
    </>
  );
}
