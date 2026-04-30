import { useState } from 'react';

import type { CellClass, PlannerBenchPerson, PlannerDemandBlock } from '@/lib/api/staffing-desk';
import type { ForceAssignReason, ForceAssignReasonType } from '@/features/staffing-desk/usePlannerSimulation';
import { Button, FormField, Modal, Select, Textarea } from '@/components/ds';

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

/**
 * Phase DS-2-6 (Group B) — rebuilt on `<Modal>`. Despite the legacy "popover"
 * name, this surface is functionally a centered modal: aria-modal, focus
 * trap, backdrop, escape close. The DS shell takes over all that. Single
 * "Assign anyway" submit; tone color in the title is preserved.
 */
export function PlannerForceAssignPopover({ pending, onCancel, onConfirm }: Props): JSX.Element {
  const [type, setType] = useState<ForceAssignReasonType>(pending.cellClass === 'BLOCKED' ? 'EMERGENCY' : 'TRAINING');
  const [note, setNote] = useState('');

  const tone = pending.cellClass === 'BLOCKED' ? 'var(--color-status-danger)' : 'var(--color-status-warning)';
  const heading = pending.cellClass === 'BLOCKED'
    ? 'Over-allocation — assign anyway?'
    : `Skill mismatch — ${Math.round(pending.matchScore * 100)}% match. Proceed?`;

  const submitDisabled = type === 'OTHER' && note.trim().length === 0;

  return (
    <Modal
      open
      onClose={onCancel}
      ariaLabel="Force assign"
      size="md"
      title={
        <div>
          <div style={{ fontWeight: 600, color: tone }}>{heading}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginTop: 2 }}>
            {pending.person.displayName} → {pending.projectName} · {pending.demand?.role ?? 'open cell'} · week {pending.weekStart.slice(5)}
          </div>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm({ type, note: note.trim() || undefined })}
            disabled={submitDisabled}
            data-testid="force-assign-confirm"
            data-autofocus="true"
          >
            Assign anyway
          </Button>
        </>
      }
    >
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

      <FormField label="Reason (saved on assignment)">
        {(props) => (
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as ForceAssignReasonType)}
            data-testid="force-assign-reason"
            {...props}
          >
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        )}
      </FormField>

      {type === 'OTHER' && (
        <FormField label="Note" required>
          {(props) => (
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={240}
              placeholder="Describe why this override is justified…"
              data-testid="force-assign-note"
              {...props}
            />
          )}
        </FormField>
      )}
    </Modal>
  );
}
