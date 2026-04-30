import { Link } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { DataQualityRadar } from '@/components/charts/DataQualityRadar';
import { Table, type Column } from '@/components/ds';
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

interface ScoreRow {
  label: string;
  pct: number;
}

interface IssueRow extends HrPersonAttentionItem {
  rowKey: string;
  index: number;
  issue: string;
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

  const scoreRows: ScoreRow[] = [
    { label: 'Manager Coverage', pct: scores.managerPct },
    { label: 'Org Unit Coverage', pct: scores.orgUnitPct },
    { label: 'Email Coverage', pct: scores.emailPct },
    { label: 'Assignment Coverage', pct: scores.assignmentPct },
    { label: 'Resource Pool', pct: scores.resourcePoolPct },
  ];

  const scoreColumns: Column<ScoreRow>[] = [
    { key: 'dimension', title: 'Dimension', getValue: (r) => r.label, render: (r) => r.label },
    { key: 'score', title: 'Score', align: 'right', getValue: (r) => r.pct, render: (r) => <span style={{ ...NUM, fontWeight: 600, color: scoreColor(r.pct) }}>{r.pct}%</span> },
    { key: 'bar', title: 'Bar', width: 120, render: (r) => (
      <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: 2, background: scoreColor(r.pct) }} />
      </div>
    ) },
  ];

  const issueRows: IssueRow[] = [
    ...employeesWithoutManager.map((item, i) => ({ ...item, rowKey: `nm-${item.personId}`, index: i + 1, issue: 'No manager' })),
    ...employeesWithoutOrgUnit.map((item, i) => ({ ...item, rowKey: `no-${item.personId}`, index: withoutManager + i + 1, issue: 'No org unit' })),
  ];

  const issueColumns: Column<IssueRow>[] = [
    { key: 'index', title: '#', width: 28, getValue: (r) => r.index, render: (r) => <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{r.index}</span> },
    { key: 'employee', title: 'Employee', getValue: (r) => r.displayName, render: (r) => <span style={{ fontWeight: 500 }}>{r.displayName}</span> },
    { key: 'email', title: 'Email', getValue: (r) => r.primaryEmail ?? '', render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.primaryEmail ?? '—'}</span> },
    { key: 'issue', title: 'Issue', width: 140, getValue: (r) => r.issue, render: (r) => <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>{r.issue}</span> },
    { key: 'go', title: '', width: 40, render: (r) => (
      <Link to={`/people/${r.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link>
    ) },
  ];

  return (
    <>
      <div className="dashboard-main-grid">
        <SectionCard title="Data Quality Radar" collapsible>
          <DataQualityRadar scores={scores} />
        </SectionCard>
        <SectionCard title="Quality Scores" collapsible>
          <Table
            variant="compact"
            columns={scoreColumns}
            rows={scoreRows}
            getRowKey={(r) => r.label}
          />
        </SectionCard>
      </div>

      {dataIssues > 0 && (
        <div className="dash-action-section" style={{ position: 'relative' }}>
          <TipBalloon tip="Employees with missing data that needs correction." arrow="left" />
          <div className="dash-action-section__header">
            <span className="dash-action-section__title">Data Quality Issues ({dataIssues})</span>
          </div>
          <Table
            variant="compact"
            columns={issueColumns}
            rows={issueRows}
            getRowKey={(r) => r.rowKey}
            onRowClick={(r) => onPersonClick(r.personId)}
          />
        </div>
      )}
    </>
  );
}
