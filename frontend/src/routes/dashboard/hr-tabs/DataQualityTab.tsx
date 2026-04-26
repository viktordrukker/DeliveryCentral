import { Link } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { DataQualityRadar } from '@/components/charts/DataQualityRadar';
import type { HrPersonAttentionItem } from '@/lib/api/dashboard-hr-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

export interface DataQualityScores {
  assignmentPct: number;
  emailPct: number;
  managerPct: number;
  orgUnitPct: number;
  resourcePoolPct: number;
}

interface Props {
  scores: DataQualityScores;
  employeesWithoutManager: HrPersonAttentionItem[];
  employeesWithoutOrgUnit: HrPersonAttentionItem[];
  onPersonClick: (personId: string) => void;
}

function scoreColor(pct: number): string {
  if (pct >= 90) return 'var(--color-status-active)';
  if (pct >= 70) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

export function HrDataQualityTab({
  scores,
  employeesWithoutManager,
  employeesWithoutOrgUnit,
  onPersonClick,
}: Props): JSX.Element {
  const withoutManager = employeesWithoutManager.length;
  const withoutOrgUnit = employeesWithoutOrgUnit.length;
  const dataIssues = withoutManager + withoutOrgUnit;

  const scoreRows = [
    { label: 'Manager Coverage', pct: scores.managerPct },
    { label: 'Org Unit Coverage', pct: scores.orgUnitPct },
    { label: 'Email Coverage', pct: scores.emailPct },
    { label: 'Assignment Coverage', pct: scores.assignmentPct },
    { label: 'Resource Pool', pct: scores.resourcePoolPct },
  ];

  return (
    <>
      <div className="dashboard-main-grid">
        <SectionCard title="Data Quality Radar" collapsible>
          <DataQualityRadar scores={scores} />
        </SectionCard>
        <SectionCard title="Quality Scores" collapsible>
          <table className="dash-compact-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th style={NUM}>Score</th>
                <th style={{ width: 120 }}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td style={{ ...NUM, fontWeight: 600, color: scoreColor(row.pct) }}>{row.pct}%</td>
                  <td>
                    <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${row.pct}%`, borderRadius: 2, background: scoreColor(row.pct) }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {dataIssues > 0 && (
        <div className="dash-action-section" style={{ position: 'relative' }}>
          <TipBalloon tip="Employees with missing data that needs correction." arrow="left" />
          <div className="dash-action-section__header">
            <span className="dash-action-section__title">Data Quality Issues ({dataIssues})</span>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table className="dash-compact-table" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>Employee</th>
                  <th>Email</th>
                  <th style={{ width: 140 }}>Issue</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {employeesWithoutManager.map((item, i) => (
                  <tr key={`nm-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => onPersonClick(item.personId)}>
                    <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.primaryEmail ?? '\u2014'}</td>
                    <td><span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>No manager</span></td>
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
                {employeesWithoutOrgUnit.map((item, i) => (
                  <tr key={`no-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => onPersonClick(item.personId)}>
                    <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{withoutManager + i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.primaryEmail ?? '\u2014'}</td>
                    <td><span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>No org unit</span></td>
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
          </div>
        </div>
      )}
    </>
  );
}
