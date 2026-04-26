import { useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { PlannerSimulation, SimAnomaly, AnomalyKind, AnomalySeverity } from '@/features/staffing-desk/usePlannerSimulation';

interface Props {
  simulation: PlannerSimulation;
}

const KIND_LABEL: Record<AnomalyKind, string> = {
  'skill-mismatch': 'Skill mismatch',
  'over-allocation-override': 'Over-allocation override',
  'employment-inactive': 'Employment inactive',
  'termination-conflict': 'Termination conflict',
  'project-end-overrun': 'Project-end overrun',
  'leave-overlap': 'Leave overlap',
  'over-allocation': 'Over-allocation',
};

const SEVERITY_TONE: Record<AnomalySeverity, 'info' | 'warning' | 'danger'> = {
  info: 'info', warning: 'warning', danger: 'danger',
};

const SEVERITY_ORDER: Record<AnomalySeverity, number> = { danger: 0, warning: 1, info: 2 };

const S_STRIP: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  padding: '4px 12px',
  fontSize: 11,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  cursor: 'pointer',
  flex: '0 0 auto',
};
const S_EXPANDED: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: 11,
  display: 'flex', flexDirection: 'column',
  flex: '0 0 auto',
  maxHeight: '35vh',
};
const S_EXPANDED_HEADER: React.CSSProperties = {
  padding: '6px 12px', borderBottom: '1px solid var(--color-border)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--color-surface-alt)',
};
const S_BODY: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '0 12px' };
const S_TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const S_TH: React.CSSProperties = {
  textAlign: 'left', padding: '4px 6px', fontSize: 9, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--color-text-subtle)', borderBottom: '1px solid var(--color-border)',
};
const S_TD: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' };

export function PlannerAnomalyTable({ simulation }: Props): JSX.Element | null {
  const [expanded, setExpanded] = useState(false);

  const anomalies = [...simulation.getAnomalies()].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return a.personName.localeCompare(b.personName);
  });

  if (anomalies.length === 0) return null;

  const resolveSource = (anomaly: SimAnomaly) => {
    if (anomaly.sourceKind === 'move') simulation.removeMove(anomaly.sourceId);
    else if (anomaly.sourceKind === 'suggestion') simulation.rejectSuggestion(anomaly.sourceId);
    else if (anomaly.sourceKind === 'extension') simulation.removeExtension(anomaly.sourceId);
  };

  const counts = anomalies.reduce<Record<AnomalySeverity, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] ?? 0) + 1;
    return acc;
  }, { info: 0, warning: 0, danger: 0 });

  const StripBadges = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 600 }}>
        Anomalies{' '}
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>({anomalies.length})</span>
      </span>
      {counts.danger > 0 && <StatusBadge label={`${counts.danger} blocking`} tone="danger" variant="chip" size="small" />}
      {counts.warning > 0 && <StatusBadge label={`${counts.warning} warn`} tone="warning" variant="chip" size="small" />}
      {counts.info > 0 && <StatusBadge label={`${counts.info} info`} tone="info" variant="chip" size="small" />}
    </div>
  );

  if (!expanded) {
    return (
      <div
        style={S_STRIP}
        data-testid="planner-anomaly-strip"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(true); }}
      >
        <StripBadges />
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>click to review ▴</span>
      </div>
    );
  }

  return (
    <div style={S_EXPANDED} data-testid="planner-anomaly-table">
      <div style={S_EXPANDED_HEADER}>
        <StripBadges />
        <button
          type="button"
          className="button button--secondary button--sm"
          onClick={() => setExpanded(false)}
          style={{ fontSize: 10 }}
        >
          Collapse ▾
        </button>
      </div>
      <div style={S_BODY}>
        <table style={S_TABLE}>
          <thead>
            <tr>
              <th style={{ ...S_TH, width: 80 }}>Severity</th>
              <th style={{ ...S_TH, width: 180 }}>Kind</th>
              <th style={S_TH}>Person</th>
              <th style={S_TH}>Project</th>
              <th style={{ ...S_TH, width: 80 }}>Source</th>
              <th style={S_TH}>Reason</th>
              <th style={S_TH}>Message</th>
              <th style={{ ...S_TH, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (
              <tr key={a.id}>
                <td style={S_TD}>
                  <StatusBadge label={a.severity.toUpperCase()} tone={SEVERITY_TONE[a.severity]} variant="chip" size="small" />
                </td>
                <td style={S_TD}>{KIND_LABEL[a.kind]}</td>
                <td style={S_TD}>{a.personName}</td>
                <td style={S_TD}>{a.projectName || '—'}</td>
                <td style={S_TD}>{a.sourceKind}</td>
                <td style={S_TD} title={a.reasonNote ?? ''}>
                  {a.reasonType ? <StatusBadge label={a.reasonType} tone="info" variant="chip" size="small" /> : '—'}
                </td>
                <td style={{ ...S_TD, color: 'var(--color-text-muted)' }}>{a.message}</td>
                <td style={S_TD}>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => resolveSource(a)}
                    style={{ fontSize: 9 }}
                    title="Undo the sim action that created this anomaly"
                  >
                    Undo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
