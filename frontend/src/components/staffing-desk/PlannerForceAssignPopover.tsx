import { useState } from 'react';

import type { CellClass, PlannerBenchPerson, PlannerDemandBlock } from '@/lib/api/staffing-desk';
import type { ForceAssignReason, ForceAssignReasonType } from '@/features/staffing-desk/usePlannerSimulation';

export interface PendingForceAssign {
  person: PlannerBenchPerson;
  demand: PlannerDemandBlock | null;
  projectId: string;
  projectName: string;
  weekStart: string;
  cellClass: CellClass;
  matchScore: number;
  matchedSkills: string[];
  mismatchedSkills: string[];
  effectiveAllocationPercent: number;
  blockedReason: string | null;
}

interface Props {
  pending: PendingForceAssign;
  onCancel: () => void;
  onConfirm: (reason: ForceAssignReason) => void;
}

const REASONS: Array<{ value: ForceAssignReasonType; label: string }> = [
  { value: 'TRAINING', label: 'Training / growth opportunity' },
  { value: 'EMERGENCY', label: 'Emergency coverage' },
  { value: 'CLIENT_PREFERENCE', label: 'Client preference' },
  { value: 'OTHER', label: 'Other (explain)' },
];

const S_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 95,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const S_PANEL: React.CSSProperties = {
  width: 'min(460px, 96vw)',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-modal)',
  display: 'flex', flexDirection: 'column',
};
const S_HEADER: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const S_BODY: React.CSSProperties = { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 };
const S_FOOTER: React.CSSProperties = {
  padding: '10px 16px', borderTop: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'flex-end', gap: 6,
};

export function PlannerForceAssignPopover({ pending, onCancel, onConfirm }: Props): JSX.Element {
  const [type, setType] = useState<ForceAssignReasonType>(pending.cellClass === 'BLOCKED' ? 'EMERGENCY' : 'TRAINING');
  const [note, setNote] = useState('');

  const tone = pending.cellClass === 'BLOCKED' ? 'var(--color-status-danger)' : 'var(--color-status-warning)';
  const heading = pending.cellClass === 'BLOCKED'
    ? 'Over-allocation — assign anyway?'
    : `Skill mismatch — ${Math.round(pending.matchScore * 100)}% match. Proceed?`;

  return (
    <div style={S_BACKDROP} role="dialog" aria-modal="true" aria-label="Force assign">
      <div style={S_PANEL}>
        <div style={S_HEADER}>
          <div style={{ fontWeight: 600, color: tone }}>{heading}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {pending.person.displayName} → {pending.projectName} · {pending.demand?.role ?? 'open cell'} · week {pending.weekStart.slice(5)}
          </div>
        </div>

        <div style={S_BODY}>
          {pending.blockedReason && (
            <div style={{ fontSize: 11, color: 'var(--color-status-danger)', background: 'rgba(220,38,38,0.08)', padding: '6px 8px', borderRadius: 4 }}>
              {pending.blockedReason}
            </div>
          )}
          {pending.mismatchedSkills.length > 0 && (
            <div style={{ fontSize: 11 }}>
              <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Required but missing:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {pending.mismatchedSkills.map((sk) => (
                  <span key={sk} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(220,38,38,0.12)', color: 'var(--color-status-danger)' }}>{sk}</span>
                ))}
              </div>
            </div>
          )}
          {pending.matchedSkills.length > 0 && (
            <div style={{ fontSize: 11 }}>
              <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Has:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {pending.matchedSkills.map((sk) => (
                  <span key={sk} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: 'var(--color-status-active)' }}>{sk}</span>
                ))}
              </div>
            </div>
          )}

          <label className="field" style={{ gap: 4 }}>
            <span className="field__label">Reason (saved on assignment)</span>
            <select
              className="field__control"
              value={type}
              onChange={(e) => setType(e.target.value as ForceAssignReasonType)}
              data-testid="force-assign-reason"
            >
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>

          {type === 'OTHER' && (
            <label className="field" style={{ gap: 4 }}>
              <span className="field__label">Note</span>
              <textarea
                className="field__control"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                placeholder="Describe why this override is justified…"
                data-testid="force-assign-note"
              />
            </label>
          )}
        </div>

        <div style={S_FOOTER}>
          <button className="button button--secondary button--sm" onClick={onCancel} type="button">Cancel</button>
          <button
            className="button button--sm"
            onClick={() => onConfirm({ type, note: note.trim() || undefined })}
            disabled={type === 'OTHER' && note.trim().length === 0}
            type="button"
            data-testid="force-assign-confirm"
          >
            Assign anyway
          </button>
        </div>
      </div>
    </div>
  );
}
