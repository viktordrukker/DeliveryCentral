import { useCallback, useEffect, useRef, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { validateExtension, type ExtensionConflict, type ExtensionValidateResponse } from '@/lib/api/staffing-desk';
import type { ForceAssignReason, ForceAssignReasonType, PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';

export interface ExtendTarget {
  assignmentId: string;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  staffingRole: string;
  allocationPercent: number;
  currentValidTo: string | null;
  currentValidFrom: string;
}

interface Props {
  target: ExtendTarget;
  simulation: PlannerSimulation;
  onClose: () => void;
}

const REASONS: Array<{ value: ForceAssignReasonType; label: string }> = [
  { value: 'TRAINING', label: 'Training / growth' },
  { value: 'EMERGENCY', label: 'Emergency coverage' },
  { value: 'CLIENT_PREFERENCE', label: 'Client preference' },
  { value: 'OTHER', label: 'Other (explain)' },
];

const S_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 95,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const S_PANEL: React.CSSProperties = {
  width: 'min(520px, 96vw)', maxHeight: '90vh',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-modal)',
  display: 'flex', flexDirection: 'column',
};
const S_HEADER: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const S_BODY: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 };
const S_FOOTER: React.CSSProperties = {
  padding: '10px 16px', borderTop: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
};
const S_QUICK: React.CSSProperties = { display: 'flex', gap: 4, flexWrap: 'wrap' };

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const SEVERITY_TONE: Record<'info' | 'warning' | 'danger', 'info' | 'warning' | 'danger'> = {
  info: 'info', warning: 'warning', danger: 'danger',
};

export function PlannerExtendAssignmentModal({ target, simulation, onClose }: Props): JSX.Element {
  const baseDate = target.currentValidTo ?? target.currentValidFrom;
  const [newValidTo, setNewValidTo] = useState(() => addDaysStr(baseDate, 28));
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<ExtensionValidateResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState<ForceAssignReasonType>('CLIENT_PREFERENCE');
  const [reasonNote, setReasonNote] = useState('');
  const debounceRef = useRef<number | null>(null);

  const runValidation = useCallback(async (dateStr: string) => {
    if (!dateStr) return;
    setLoading(true);
    setValidationError(null);
    try {
      const result = await validateExtension({ assignmentId: target.assignmentId, newValidTo: dateStr });
      setValidation(result);
    } catch (e: unknown) {
      setValidationError(e instanceof Error ? e.message : 'Validation failed');
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, [target.assignmentId]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void runValidation(newValidTo); }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [newValidTo, runValidation]);

  const quickSet = useCallback((days: number) => {
    setNewValidTo(addDaysStr(baseDate, days));
  }, [baseDate]);

  const blockingConflicts = validation?.conflicts.filter((c) => c.blocking) ?? [];
  const softConflicts = validation?.conflicts.filter((c) => !c.blocking) ?? [];
  const hasBlocking = blockingConflicts.length > 0;
  const isOtherWithoutNote = reasonType === 'OTHER' && reasonNote.trim().length === 0;
  const datesInvalid = !newValidTo || newValidTo <= baseDate;

  const handleConfirm = useCallback(() => {
    if (hasBlocking || datesInvalid || isOtherWithoutNote || !validation) return;
    const reason: ForceAssignReason | undefined = softConflicts.length > 0
      ? { type: reasonType, note: reasonNote.trim() || undefined }
      : undefined;
    simulation.addExtension({
      assignmentId: target.assignmentId,
      personId: target.personId,
      personName: target.personName,
      projectId: target.projectId,
      projectName: target.projectName,
      staffingRole: target.staffingRole,
      allocationPercent: target.allocationPercent,
      currentValidTo: target.currentValidTo,
      newValidTo,
      conflicts: validation.conflicts,
      reason,
    });
    onClose();
  }, [hasBlocking, datesInvalid, isOtherWithoutNote, validation, softConflicts.length, reasonType, reasonNote, simulation, target, newValidTo, onClose]);

  return (
    <div style={S_BACKDROP} role="dialog" aria-modal="true" aria-label="Extend assignment">
      <div style={S_PANEL}>
        <div style={S_HEADER}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Extend assignment</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {target.personName} · {target.projectName} · {target.staffingRole || '—'} · {target.allocationPercent}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Current end: <strong>{target.currentValidTo ?? 'open-ended'}</strong>
          </div>
        </div>

        <div style={S_BODY}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick extend</div>
            <div style={S_QUICK}>
              {[14, 28, 42, 84, 180].map((d) => (
                <button key={d} type="button" className="button button--secondary button--sm" onClick={() => quickSet(d)} style={{ fontSize: 10 }}>
                  {d < 28 ? `+${d}d` : d < 84 ? `+${Math.round(d / 7)}w` : `+${Math.round(d / 30)}mo`}
                </button>
              ))}
            </div>
          </div>

          <label className="field" style={{ gap: 4 }}>
            <span className="field__label">New end date</span>
            <input
              type="date"
              className="field__control"
              value={newValidTo}
              min={addDaysStr(baseDate, 1)}
              onChange={(e) => setNewValidTo(e.target.value)}
              data-testid="extend-new-date"
            />
          </label>

          {loading && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Checking constraints…</div>}
          {validationError && <div style={{ fontSize: 11, color: 'var(--color-status-danger)' }}>{validationError}</div>}

          {validation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {validation.conflicts.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--color-status-active)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusBadge label="OK" tone="active" variant="chip" size="small" /> No conflicts — safe to extend.
                </div>
              )}
              {validation.conflicts.map((c, i) => (
                <ConflictRow key={`${c.kind}-${i}`} conflict={c} />
              ))}
            </div>
          )}

          {softConflicts.length > 0 && !hasBlocking && (
            <>
              <label className="field" style={{ gap: 4 }}>
                <span className="field__label">Reason for proceeding (saved with anomaly)</span>
                <select
                  className="field__control"
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value as ForceAssignReasonType)}
                  data-testid="extend-reason"
                >
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              {reasonType === 'OTHER' && (
                <label className="field" style={{ gap: 4 }}>
                  <span className="field__label">Note</span>
                  <textarea
                    className="field__control"
                    rows={2}
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    maxLength={240}
                    placeholder="Explain why the extension is justified despite the anomaly…"
                  />
                </label>
              )}
            </>
          )}
        </div>

        <div style={S_FOOTER}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {hasBlocking ? 'Resolve blocking issues to proceed' : softConflicts.length > 0 ? `${softConflicts.length} anomaly marker(s) will be logged` : ' '}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="button button--secondary button--sm" onClick={onClose} type="button">Cancel</button>
            <button
              className="button button--sm"
              onClick={handleConfirm}
              disabled={hasBlocking || datesInvalid || isOtherWithoutNote || !validation || loading}
              type="button"
              data-testid="extend-confirm"
            >
              {softConflicts.length > 0 ? 'Extend anyway' : 'Extend'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConflictRow({ conflict }: { conflict: ExtensionConflict }): JSX.Element {
  const tone = SEVERITY_TONE[conflict.severity];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11 }}>
      <StatusBadge label={conflict.blocking ? 'BLOCK' : 'ANOMALY'} tone={tone} variant="chip" size="small" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{labelFor(conflict.kind)}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{conflict.message}</div>
      </div>
    </div>
  );
}

function labelFor(kind: string): string {
  switch (kind) {
    case 'employment-inactive': return 'Employment not active';
    case 'termination-conflict': return 'Terminates before new end';
    case 'project-end-overrun': return 'Past project close date';
    case 'leave-overlap': return 'Overlaps approved leave';
    case 'over-allocation': return 'Would over-allocate';
    default: return kind;
  }
}
