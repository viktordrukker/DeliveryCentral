import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchWhyNot, type WhyNotResponse, type WhyNotDisqualifier } from '@/lib/api/staffing-desk';
import { Button } from '@/components/ds';

interface Props {
  demandId: string;
  onClose: () => void;
}

const S_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 92,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const S_PANEL: React.CSSProperties = {
  width: 'min(620px, 96vw)', maxHeight: '86vh',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-modal)',
  display: 'flex', flexDirection: 'column',
};
const S_HEADER: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const S_BODY: React.CSSProperties = { padding: '10px 16px', flex: 1, overflowY: 'auto' };
const S_ROW: React.CSSProperties = {
  padding: '8px 0', borderBottom: '1px solid var(--color-border)',
  display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11,
};

const DQ_LABEL: Record<WhyNotDisqualifier, string> = {
  'fully-allocated': 'Over capacity',
  'on-leave': 'On leave',
  'missing-skills': 'Skills gap',
  'wrong-grade': 'Grade mismatch',
  'inactive': 'Inactive',
  'not-available': 'Unavailable',
};

export function PlannerWhyNotModal({ demandId, onClose }: Props): JSX.Element {
  const [result, setResult] = useState<WhyNotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchWhyNot({ demandId, topN: 5 })
      .then((r) => { if (active) setResult(r); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Failed to load analysis'); });
    return () => { active = false; };
  }, [demandId]);

  return (
    <div style={S_BACKDROP} onClick={onClose} role="dialog" aria-modal="true" aria-label="Why not filled?">
      <div style={S_PANEL} onClick={(e) => e.stopPropagation()}>
        <div style={S_HEADER}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Why wasn't this filled?</div>
          {result && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {result.projectName} · {result.demandRole} · {result.demandAllocationPercent}%
              {result.demandSkills.length > 0 && <span> · needs {result.demandSkills.join(', ')}</span>}
            </div>
          )}
        </div>

        <div style={S_BODY}>
          {!result && !error && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Analyzing candidates…</div>}
          {error && <div style={{ fontSize: 11, color: 'var(--color-status-danger)' }}>{error}</div>}

          {result && result.candidates.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No bench candidates to compare.
            </div>
          )}

          {result && result.candidates.map((c) => (
            <div key={c.personId} style={S_ROW}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 500 }}>{c.personName}</span>
                {c.grade && <span style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>{c.grade}</span>}
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  · {Math.round(c.skillScore * 100)}% skill · {c.availablePercent}% free
                </span>
                {c.disqualifiers.map((dq) => (
                  <StatusBadge key={dq} label={DQ_LABEL[dq]} tone={dq === 'inactive' ? 'danger' : 'warning'} variant="chip" size="small" />
                ))}
                {c.disqualifiers.length === 0 && (
                  <StatusBadge label="ELIGIBLE" tone="active" variant="chip" size="small" />
                )}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{c.message}</div>
              {c.matchedSkills.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--color-status-active)' }}>Has: {c.matchedSkills.join(', ')}</div>
              )}
              {c.missingSkills.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--color-status-danger)' }}>Missing: {c.missingSkills.join(', ')}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onClose} type="button">Close</Button>
        </div>
      </div>
    </div>
  );
}
