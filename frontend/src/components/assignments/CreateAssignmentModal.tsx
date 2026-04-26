import { FormEvent, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import {
  createAssignment,
  type CreateAssignmentRequest,
  type ProjectAssignmentResponse,
} from '@/lib/api/assignments';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { UtilisationPeek } from '@/components/assignments/UtilisationPeek';
import { STAFFING_ROLES } from '@/lib/staffing-roles';

export interface AssignmentModalPreFill {
  contextDate: string | null;
  contextHours: number | null;
  personId: string;
  personName: string;
  personStatus?: string;
  personTerminatedAt?: string | null;
  projectId: string;
  projectName: string;
}

interface CreateAssignmentModalProps {
  onCancel: () => void;
  onSuccess: (response: ProjectAssignmentResponse) => void;
  open: boolean;
  preFill: AssignmentModalPreFill | null;
}

/* ── Modal inner (only rendered when open) ── */

function CreateAssignmentModalInner({ onCancel, onSuccess, preFill }: { onCancel: () => void; onSuccess: (r: ProjectAssignmentResponse) => void; preFill: AssignmentModalPreFill }): JSX.Element {
  const { principal } = useAuth();
  const [staffingRole, setStaffingRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [allocInput, setAllocInput] = useState('100');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [overlapConfirm, setOverlapConfirm] = useState(false);
  const [inactiveOverride, setInactiveOverride] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);
  const overlayMouseDownRef = useRef(false);

  const isPersonInactive = preFill.personStatus ? preFill.personStatus !== 'ACTIVE' : false;

  const actorId = principal?.personId ?? '';
  const effectiveRole = staffingRole === '__custom__' ? customRole : staffingRole;
  const allocationPercent = parseInt(allocInput, 10) || 0;
  const isDirty = staffingRole !== '' || startDate !== '' || endDate !== '' || note !== '' || allocInput !== '100';

  function handleClose(): void {
    if (isDirty && !isSubmitting) { setConfirmClose(true); return; }
    onCancel();
  }

  // Block Escape key from closing without confirmation
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') { e.stopPropagation(); handleClose(); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });

  function buildRequest(asDraft: boolean, forceOverlap: boolean): CreateAssignmentRequest & { personValidated?: boolean } {
    return {
      actorId,
      allocationPercent,
      personId: preFill.personId,
      projectId: preFill.projectId,
      staffingRole: effectiveRole.trim(),
      startDate,
      ...(asDraft ? { draft: true } : {}),
      ...(forceOverlap ? { allowOverlapOverride: true, overrideReason: 'Accepted overlap from reconciliation dashboard' } : {}),
      ...(isPersonInactive && inactiveOverride ? { personValidated: true } : {}),
      ...(endDate ? { endDate } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
  }

  async function handleSubmit(e: FormEvent, asDraft = false, forceOverlap = false): Promise<void> {
    e.preventDefault();
    if (!preFill || !actorId) return;
    if (!effectiveRole.trim()) { setError('Staffing role is required.'); return; }
    if (allocationPercent < 0 || allocationPercent > 100) { setError('Allocation must be 0\u2013100%.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }
    if (endDate && endDate < startDate) { setError('End date must be after start date.'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createAssignment(buildRequest(asDraft, forceOverlap));
      setStaffingRole('');
      setCustomRole('');
      setAllocInput('100');
      setStartDate('');
      setEndDate('');
      setNote('');
      onSuccess(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assignment.';
      if (msg.toLowerCase().includes('overlapping')) {
        setPendingDraft(asDraft);
        setOverlapConfirm(true);
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="confirm-dialog-overlay"
      onMouseDown={(e) => { overlayMouseDownRef.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) handleClose(); }}
    >
      <div className="confirm-dialog" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__title">Create Assignment</div>

        {/* Context (read-only) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', fontSize: 12 }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Person</span>
            <div style={{ fontWeight: 600 }}>{preFill.personName}</div>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Project</span>
            <div style={{ fontWeight: 600 }}>{preFill.projectName}</div>
          </div>
          {preFill.contextHours !== null && (
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Evidence Hours</span>
              <div style={{ fontWeight: 600 }}>{preFill.contextHours}h</div>
            </div>
          )}
          {preFill.contextDate && (
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Evidence Date</span>
              <div style={{ fontWeight: 600 }}>{preFill.contextDate.slice(0, 10)}</div>
            </div>
          )}
        </div>

        {/* Inactive person warning */}
        {isPersonInactive && (
          <div style={{
            background: 'var(--color-status-warning)', color: 'var(--color-surface)',
            padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 'var(--space-2)',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {preFill.personName} is currently {preFill.personStatus?.toLowerCase() ?? 'inactive'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 6 }}>
              Evidence exists but the employee is no longer active. Choose a resolution:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="inactive-resolution" checked={!inactiveOverride} onChange={() => setInactiveOverride(false)} />
                <span><strong>Create HR case</strong> — route to HR/RM to review evidence eligibility, reactivate if needed, or write off</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="inactive-resolution" checked={inactiveOverride} onChange={() => setInactiveOverride(true)} />
                <span><strong>Retroactive assignment</strong> — accept evidence and create a backdated assignment (requires override)</span>
              </label>
            </div>
          </div>
        )}

        {/* Workload timeline */}
        <WorkloadTimeline
          personId={preFill.personId}
          personStatus={preFill.personStatus}
          personTerminatedAt={preFill.personTerminatedAt}
          planned={startDate ? { allocationPercent, endDate, projectName: preFill.projectName, startDate } : undefined}
        />

        {error && <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginBottom: 'var(--space-2)' }}>{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* Staffing role: dropdown + custom option */}
          <label className="field">
            <span className="field__label">Staffing Role *</span>
            <select className="field__control" value={staffingRole} onChange={(e) => setStaffingRole(e.target.value)} required={staffingRole !== '__custom__'}>
              <option value="">Select a role...</option>
              {STAFFING_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              <option value="__custom__">Other (custom)</option>
            </select>
          </label>
          {staffingRole === '__custom__' && (
            <label className="field">
              <span className="field__label">Custom Role *</span>
              <input className="field__control" value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Enter custom role" required />
            </label>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <label className="field">
              <span className="field__label">Allocation % *</span>
              <input className="field__control" type="number" min={0} max={100} step="any"
                value={allocInput}
                onChange={(e) => setAllocInput(e.target.value)}
                onBlur={() => {
                  const v = parseInt(allocInput, 10);
                  if (Number.isNaN(v) || v < 0) setAllocInput('0');
                  else if (v > 100) setAllocInput('100');
                  else setAllocInput(String(v));
                }}
              />
            </label>
            <label className="field">
              <span className="field__label">Start Date *</span>
              <input className="field__control" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <label className="field">
              <span className="field__label">End Date</span>
              <input className="field__control" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <div />
          </div>

          <UtilisationPeek
            personId={preFill.personId}
            startDate={startDate}
            endDate={endDate}
            allocationPercent={allocationPercent}
          />
          <label className="field">
            <span className="field__label">Note</span>
            <textarea className="field__control" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context" />
          </label>

          <div className="confirm-dialog__actions" style={{ justifyContent: 'space-between' }}>
            <button className="button button--secondary" type="button" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            {isPersonInactive && !inactiveOverride ? (
              <button className="button button--primary" type="button"
                onClick={() => { onCancel(); window.location.href = `/cases/new?subjectPersonId=${preFill.personId}&type=PERFORMANCE&note=${encodeURIComponent(`Reconciliation anomaly: evidence exists for ${preFill.personName} on ${preFill.projectName} but employee is ${preFill.personStatus}. Review evidence eligibility and resolve.`)}`; }}>
                Create HR Case
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="button button--secondary" type="button" disabled={isSubmitting || !actorId}
                  onClick={(e) => void handleSubmit(e as unknown as FormEvent, true)}>
                  {isSubmitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button className="button button--primary" type="submit" disabled={isSubmitting || !actorId}>
                  {isSubmitting ? 'Creating...' : inactiveOverride ? 'Override & Create' : 'Create & Request'}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Overlap confirmation */}
        {overlapConfirm && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-overlay)', borderRadius: 12, zIndex: 30,
          }}>
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '16px 20px', maxWidth: 340, textAlign: 'center',
              boxShadow: 'var(--shadow-modal)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-status-warning)' }}>Overlapping Assignment</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                An assignment for this person and project already exists in this period. Overallocation will occur. Do you want to proceed?
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                <button className="button button--secondary button--sm" type="button" onClick={() => setOverlapConfirm(false)}>Cancel</button>
                <button className="button button--primary button--sm" type="button" disabled={isSubmitting}
                  onClick={() => { setOverlapConfirm(false); void handleSubmit(new Event('submit') as unknown as FormEvent, pendingDraft, true); }}>
                  {isSubmitting ? 'Creating...' : 'Accept Overlap'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm close dialog */}
        {confirmClose && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-overlay)', borderRadius: 12, zIndex: 30,
          }}>
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '16px 20px', maxWidth: 300, textAlign: 'center',
              boxShadow: 'var(--shadow-modal)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Discard changes?</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>You have unsaved changes. Are you sure you want to close?</div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                <button className="button button--secondary button--sm" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button>
                <button className="button button--danger button--sm" type="button" onClick={onCancel}>Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateAssignmentModal({ onCancel, onSuccess, open, preFill }: CreateAssignmentModalProps): JSX.Element | null {
  if (!open || !preFill) return null;
  return <CreateAssignmentModalInner onCancel={onCancel} onSuccess={onSuccess} preFill={preFill} />;
}
