import { useEffect, useState } from 'react';

import { httpGet } from '@/lib/api/http-client';

interface ClosureReadiness {
  projectId: string;
  activeAssignmentCount: number;
  activeVendorEngagementCount: number;
  pendingTimesheetCount: number;
  budgetVariancePercent: number | null;
  openAlertCount: number;
  hasCurrentWeekRag: boolean;
  isReady: boolean;
  blockers: string[];
}

interface ClosureChecklistProps {
  projectId: string;
  onClose: () => void;
  onOverride: () => void;
  canOverride: boolean;
}

interface CheckItem {
  label: string;
  passed: boolean;
  detail: string;
}

export function ClosureChecklist({ projectId, onClose, onOverride, canOverride }: ClosureChecklistProps): JSX.Element {
  const [readiness, setReadiness] = useState<ClosureReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    void httpGet<ClosureReadiness>(`/projects/${projectId}/closure-readiness`)
      .then(setReadiness)
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [projectId]);

  if (isLoading) {
    return <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Checking closure readiness...</p>;
  }

  if (!readiness) {
    return <p style={{ fontSize: 13, color: 'var(--color-status-danger)' }}>Failed to check closure readiness.</p>;
  }

  const checks: CheckItem[] = [
    {
      label: 'All staff released or end-dated',
      passed: readiness.activeAssignmentCount === 0,
      detail: readiness.activeAssignmentCount === 0 ? 'No active assignments' : `${readiness.activeAssignmentCount} active assignment(s)`,
    },
    {
      label: 'All vendor engagements ended',
      passed: readiness.activeVendorEngagementCount === 0,
      detail: readiness.activeVendorEngagementCount === 0 ? 'No active vendors' : `${readiness.activeVendorEngagementCount} active vendor(s)`,
    },
    {
      label: 'All timesheets approved',
      passed: readiness.pendingTimesheetCount === 0,
      detail: readiness.pendingTimesheetCount === 0 ? 'All time approved' : `${readiness.pendingTimesheetCount} entry(-ies) pending`,
    },
    {
      label: 'Budget within threshold',
      passed: readiness.budgetVariancePercent === null || readiness.budgetVariancePercent <= 10,
      detail: readiness.budgetVariancePercent !== null ? `${readiness.budgetVariancePercent}% variance` : 'No budget defined',
    },
    {
      label: 'Final RAG status recorded',
      passed: readiness.hasCurrentWeekRag,
      detail: readiness.hasCurrentWeekRag ? 'Current week RAG recorded' : 'No RAG for current week',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {checks.map((check, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: check.passed ? 'var(--color-surface)' : 'var(--color-surface-alt)',
              borderLeft: `3px solid ${check.passed ? 'var(--color-status-active)' : 'var(--color-status-danger)'}`,
              borderRadius: 'var(--radius-control, 4px)',
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{check.passed ? '\u2705' : '\u274C'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{check.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{check.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          className="button button--primary"
          disabled={!readiness.isReady}
          onClick={onClose}
          type="button"
        >
          Close Project
        </button>
        {canOverride && !readiness.isReady ? (
          <button
            className="button button--danger button--sm"
            onClick={onOverride}
            type="button"
          >
            Override & Close (Director)
          </button>
        ) : null}
      </div>

      {readiness.blockers.length > 0 && !readiness.isReady ? (
        <div style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--color-text-muted)' }}>
          <strong>Blockers:</strong>
          <ul style={{ margin: 'var(--space-1) 0 0 var(--space-4)', padding: 0 }}>
            {readiness.blockers.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
