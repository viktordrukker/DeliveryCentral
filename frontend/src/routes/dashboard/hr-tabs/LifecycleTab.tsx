import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { formatDate } from '@/lib/format-date';
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

export function HrLifecycleTab({
  atRisk,
  openCaseSubjects,
  recentJoinerActivity,
  recentDeactivationActivity,
  onPersonClick,
}: Props): JSX.Element {
  return (
    <>
      {atRisk.length > 0 && (
        <div className="dash-action-section" style={{ position: 'relative' }}>
          <TipBalloon tip="Employees flagged as at-risk based on multiple signals. Review and take action." arrow="left" />
          <div className="dash-action-section__header">
            <span className="dash-action-section__title">At-Risk Employees ({atRisk.length})</span>
          </div>
          <div style={{ overflow: 'auto' }} data-testid="at-risk-employees-panel">
            <table className="dash-compact-table" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Risk Factors</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((emp, i) => (
                  <tr key={emp.personId} style={{ cursor: 'pointer' }} onClick={() => onPersonClick(emp.personId)}>
                    <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{emp.displayName}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{emp.primaryEmail ?? '\u2014'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {emp.riskFactors.map((factor) => (
                          <span key={factor} style={{ background: 'var(--color-status-danger)', color: '#fff', borderRadius: 3, fontSize: 10, fontWeight: 600, padding: '1px 6px' }}>{factor}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/people/${emp.personId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 10, color: 'var(--color-accent)' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                style={{ display: 'inline-block', background: 'var(--color-status-danger)', color: '#fff', borderRadius: 3, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace' }}
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
        {recentJoinerActivity.length === 0 && recentDeactivationActivity.length === 0 ? (
          <EmptyState description="No joiners or deactivations recorded recently." title="No recent lifecycle activity" />
        ) : (
          <table className="dash-compact-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Type</th>
                <th>Name</th>
                <th style={{ width: 100 }}>Date</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {recentJoinerActivity.map((item) => (
                <tr key={`join-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => onPersonClick(item.personId)}>
                  <td><span style={{ color: 'var(--color-status-active)', fontWeight: 600, fontSize: 11 }}>Joined</span></td>
                  <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.occurredAt)}</td>
                  <td>
                    <Link
                      to={`/people/${item.personId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 10, color: 'var(--color-accent)' }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {recentDeactivationActivity.map((item) => (
                <tr key={`deact-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => onPersonClick(item.personId)}>
                  <td><span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>Deactivated</span></td>
                  <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.occurredAt)}</td>
                  <td>
                    <Link
                      to={`/people/${item.personId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 10, color: 'var(--color-accent)' }}
                    >
                      View
                    </Link>
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
