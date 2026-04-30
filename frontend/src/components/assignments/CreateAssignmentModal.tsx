import { FormEvent, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  createAssignment,
  type CreateAssignmentRequest,
  type ProjectAssignmentResponse,
} from '@/lib/api/assignments';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { UtilisationPeek } from '@/components/assignments/UtilisationPeek';
import { STAFFING_ROLES } from '@/lib/staffing-roles';
import {
  Button,
  DatePicker,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/ds';

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

/**
 * Phase DS-2-7 Tier C3 — rebuilt on `<Modal>` (not `<FormModal>`) because
 * this modal has THREE submit paths (Save Draft / Create & Request /
 * Override & Create) plus an alternate primary action (Create HR Case for
 * inactive persons). FormModal assumes a single primary submit.
 *
 * Nested confirmations (overlap-confirm + discard-changes) are rendered as
 * separate `<ConfirmDialog>` layers — the DS Modal stack manager handles
 * z-index allocation and focus trap stacking.
 *
 * UX contract: see [docs/planning/ux-contracts/CreateAssignmentModal.md].
 *
 * Outer/inner split preserved (CLAUDE.md pitfall #15) — inner is mounted
 * only when `open && preFill`, so `useAuth()` and `useState` are deferred
 * until the modal is actually visible.
 */
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

  const isPersonInactive = preFill.personStatus ? preFill.personStatus !== 'ACTIVE' : false;

  const actorId = principal?.personId ?? '';
  const effectiveRole = staffingRole === '__custom__' ? customRole : staffingRole;
  const allocationPercent = parseInt(allocInput, 10) || 0;
  const isDirty = staffingRole !== '' || startDate !== '' || endDate !== '' || note !== '' || allocInput !== '100';

  function handleClose(): void {
    if (isSubmitting) return;
    if (isDirty) { setConfirmClose(true); return; }
    onCancel();
  }

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

  async function handleSubmit(e: FormEvent | undefined, asDraft = false, forceOverlap = false): Promise<void> {
    if (e) e.preventDefault();
    if (!preFill || !actorId) return;
    if (!effectiveRole.trim()) { setError('Staffing role is required.'); return; }
    if (allocationPercent < 0 || allocationPercent > 100) { setError('Allocation must be 0–100%.'); return; }
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

  function navigateToHrCase(): void {
    const note = `Reconciliation anomaly: evidence exists for ${preFill.personName} on ${preFill.projectName} but employee is ${preFill.personStatus}. Review evidence eligibility and resolve.`;
    onCancel();
    window.location.href = `/cases/new?subjectPersonId=${preFill.personId}&type=PERFORMANCE&note=${encodeURIComponent(note)}`;
  }

  const showHrCaseFooter = isPersonInactive && !inactiveOverride;
  const submitDisabled = isSubmitting || !actorId;

  return (
    <>
      <Modal
        open
        onClose={handleClose}
        closeOnBackdropClick={!isSubmitting}
        closeOnEscape={!isSubmitting}
        size="lg"
        title="Create Assignment"
        footer={
          showHrCaseFooter ? (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
              <Button variant="primary" onClick={navigateToHrCase}>Create HR Case</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
              <Button variant="secondary" disabled={submitDisabled} onClick={() => void handleSubmit(undefined, true)}>
                {isSubmitting ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button variant="primary" disabled={submitDisabled} onClick={() => void handleSubmit(undefined, false)} data-autofocus="true">
                {isSubmitting ? 'Creating…' : inactiveOverride ? 'Override & Create' : 'Create & Request'}
              </Button>
            </>
          )
        }
      >
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

        <form onSubmit={(e) => void handleSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <FormField label="Staffing Role" required>
            {(props) => (
              <Select
                value={staffingRole}
                onChange={(e) => setStaffingRole(e.target.value)}
                required={staffingRole !== '__custom__'}
                {...props}
              >
                <option value="">Select a role…</option>
                {STAFFING_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                <option value="__custom__">Other (custom)</option>
              </Select>
            )}
          </FormField>

          {staffingRole === '__custom__' && (
            <FormField label="Custom Role" required>
              {(props) => (
                <Input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Enter custom role"
                  required
                  {...props}
                />
              )}
            </FormField>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <FormField label="Allocation %" required>
              {(props) => (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={allocInput}
                  onChange={(e) => setAllocInput(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(allocInput, 10);
                    if (Number.isNaN(v) || v < 0) setAllocInput('0');
                    else if (v > 100) setAllocInput('100');
                    else setAllocInput(String(v));
                  }}
                  {...props}
                />
              )}
            </FormField>
            <FormField label="Start Date" required>
              {(props) => (
                <DatePicker value={startDate} onValueChange={setStartDate} required {...props} />
              )}
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <FormField label="End Date">
              {(props) => <DatePicker value={endDate} onValueChange={setEndDate} {...props} />}
            </FormField>
            <div />
          </div>

          <UtilisationPeek
            personId={preFill.personId}
            startDate={startDate}
            endDate={endDate}
            allocationPercent={allocationPercent}
          />

          <FormField label="Note">
            {(props) => (
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional context"
                {...props}
              />
            )}
          </FormField>
        </form>
      </Modal>

      {/* Overlap confirmation — second modal layer */}
      <ConfirmDialog
        open={overlapConfirm}
        onCancel={() => setOverlapConfirm(false)}
        onConfirm={() => {
          setOverlapConfirm(false);
          void handleSubmit(undefined, pendingDraft, true);
        }}
        title="Overlapping Assignment"
        message="An assignment for this person and project already exists in this period. Overallocation will occur. Do you want to proceed?"
        confirmLabel={isSubmitting ? 'Creating…' : 'Accept Overlap'}
      />

      {/* Discard-changes confirmation — second modal layer */}
      <ConfirmDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          onCancel();
        }}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to close?"
        confirmLabel="Discard"
        tone="danger"
      />
    </>
  );
}

export function CreateAssignmentModal({ onCancel, onSuccess, open, preFill }: CreateAssignmentModalProps): JSX.Element | null {
  if (!open || !preFill) return null;
  return <CreateAssignmentModalInner onCancel={onCancel} onSuccess={onSuccess} preFill={preFill} />;
}
