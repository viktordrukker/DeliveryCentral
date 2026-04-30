import { useCallback, useEffect, useRef, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { validateExtension, type ExtensionConflict, type ExtensionValidateResponse } from '@/lib/api/staffing-desk';
import type { ForceAssignReason, ForceAssignReasonType, PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';
import { Button, DatePicker, FormField, FormModal, Select, Textarea } from '@/components/ds';

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

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const SEVERITY_TONE: Record<'info' | 'warning' | 'danger', 'info' | 'warning' | 'danger'> = {
  info: 'info', warning: 'warning', danger: 'danger',
};

/**
 * Phase DS-2-7 Tier C2 — rebuilt on `<FormModal>`. Single-submit shape; the
 * server-side `validateExtension` flow runs in a debounced effect and only
 * gates the submit button via `submitDisabled`. The "Extend"/"Extend anyway"
 * label switches based on whether soft conflicts are present. The status
 * line below the form (legacy footer text) is rendered as the FormModal
 * description's secondary slot — kept as a small footer-status block inside
 * the body so it's adjacent to the action button.
 */
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
  const submitDisabled = hasBlocking || datesInvalid || isOtherWithoutNote || !validation || loading;

  const handleConfirm = useCallback(async () => {
    if (submitDisabled || !validation) return;
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
  }, [submitDisabled, validation, softConflicts.length, reasonType, reasonNote, simulation, target, newValidTo, onClose]);

  return (
    <FormModal
      open
      onCancel={onClose}
      onSubmit={handleConfirm}
      title="Extend assignment"
      description={`${target.personName} · ${target.projectName} · ${target.staffingRole || '—'} · ${target.allocationPercent}% — Current end: ${target.currentValidTo ?? 'open-ended'}`}
      submitLabel={softConflicts.length > 0 ? 'Extend anyway' : 'Extend'}
      submitDisabled={submitDisabled}
      dirty={newValidTo !== addDaysStr(baseDate, 28) || reasonNote !== ''}
      size="md"
    >
      <div>
        <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick extend</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[14, 28, 42, 84, 180].map((d) => (
            <Button key={d} variant="secondary" size="sm" onClick={() => quickSet(d)} style={{ fontSize: 10 }}>
              {d < 28 ? `+${d}d` : d < 84 ? `+${Math.round(d / 7)}w` : `+${Math.round(d / 30)}mo`}
            </Button>
          ))}
        </div>
      </div>

      <FormField label="New end date">
        {(props) => (
          <DatePicker
            value={newValidTo}
            min={addDaysStr(baseDate, 1)}
            onValueChange={setNewValidTo}
            data-testid="extend-new-date"
            {...props}
          />
        )}
      </FormField>

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
          <FormField label="Reason for proceeding (saved with anomaly)">
            {(props) => (
              <Select
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value as ForceAssignReasonType)}
                data-testid="extend-reason"
                {...props}
              >
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            )}
          </FormField>
          {reasonType === 'OTHER' && (
            <FormField label="Note" required>
              {(props) => (
                <Textarea
                  rows={2}
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  maxLength={240}
                  placeholder="Explain why the extension is justified despite the anomaly…"
                  {...props}
                />
              )}
            </FormField>
          )}
        </>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
        {hasBlocking
          ? 'Resolve blocking issues to proceed'
          : softConflicts.length > 0
            ? `${softConflicts.length} anomaly marker(s) will be logged`
            : ' '}
      </div>
    </FormModal>
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
