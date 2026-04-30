import { FormEvent, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { createAssignment } from '@/lib/api/assignments';
import { STAFFING_ROLES } from '@/lib/staffing-roles';
import type { PlannerBenchPerson } from '@/lib/api/staffing-desk';
import {
  Button,
  DatePicker,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/ds';

interface Props {
  projectId: string;
  projectName: string;
  startDate: string;
  benchPeople: PlannerBenchPerson[];
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Phase DS-2-7 Tier C1 — rebuilt on `<Modal>` (not `<FormModal>`) because
 * the form has TWO submit paths: "Save draft" and "Create & request".
 * `<Modal>` gives us focus trap / backdrop / scroll lock / mobile auto-
 * fullscreen — the dual-action footer is custom.
 */
export function PlannerDraftAssignmentModal({ projectId, projectName, startDate, benchPeople, onClose, onCreated }: Props): JSX.Element {
  const { principal } = useAuth();
  const [personId, setPersonId] = useState('');
  const [staffingRole, setStaffingRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [alloc, setAlloc] = useState('100');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRole = staffingRole === '__custom__' ? customRole.trim() : staffingRole;
  const allocPercent = parseInt(alloc, 10) || 0;
  const actorId = principal?.personId ?? '';

  const sortedBench = useMemo(() => {
    return [...benchPeople].sort((a, b) => b.availablePercent - a.availablePercent || b.daysOnBench - a.daysOnBench);
  }, [benchPeople]);

  const selectedPerson = sortedBench.find((p) => p.personId === personId) ?? null;

  const submit = useCallback(async (e: FormEvent | undefined, asDraft: boolean) => {
    if (e) e.preventDefault();
    if (!actorId) { setError('Not authenticated'); return; }
    if (!personId) { setError('Pick a person'); return; }
    if (!effectiveRole) { setError('Staffing role is required'); return; }
    if (allocPercent <= 0 || allocPercent > 100) { setError('Allocation must be 1–100%'); return; }
    if (endDate && endDate < startDate) { setError('End date must be after start date'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await createAssignment({
        actorId,
        personId,
        projectId,
        staffingRole: effectiveRole,
        allocationPercent: allocPercent,
        startDate,
        ...(endDate ? { endDate } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(asDraft ? { draft: true } : {}),
      });
      toast.success(asDraft ? 'Draft assignment saved' : 'Assignment requested');
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  }, [actorId, personId, effectiveRole, allocPercent, endDate, startDate, note, projectId, onCreated]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Draft assignment"
      description={`${projectName} · week of ${startDate} — Creates a REQUESTED or DRAFT ProjectAssignment visible in team tabs, staffing desk, and planner.`}
      size="md"
      closeOnBackdropClick={!submitting}
      closeOnEscape={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={() => void submit(undefined, true)}
            disabled={submitting || !personId || !effectiveRole}
            data-testid="draft-save"
          >
            {submitting ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            variant="primary"
            onClick={() => void submit(undefined, false)}
            disabled={submitting || !personId || !effectiveRole}
            data-testid="draft-request"
            data-autofocus="true"
          >
            {submitting ? 'Creating…' : 'Create & request'}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FormField label="Person" required>
          {(props) => (
            <>
              <Select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                required
                data-testid="draft-person-select"
                {...props}
              >
                <option value="">Pick from bench ({sortedBench.length})…</option>
                {sortedBench.map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {p.displayName}{p.grade ? ` · ${p.grade}` : ''} · {p.availablePercent}% free · {p.daysOnBench}d bench
                  </option>
                ))}
              </Select>
              {selectedPerson && selectedPerson.skills.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Skills: {selectedPerson.skills.slice(0, 6).join(', ')}{selectedPerson.skills.length > 6 ? '…' : ''}
                </div>
              )}
            </>
          )}
        </FormField>

        <FormField label="Staffing role" required>
          {(props) => (
            <Select value={staffingRole} onChange={(e) => setStaffingRole(e.target.value)} required {...props}>
              <option value="">Select a role…</option>
              {STAFFING_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="__custom__">Other (custom)</option>
            </Select>
          )}
        </FormField>

        {staffingRole === '__custom__' && (
          <FormField label="Custom role" required>
            {(props) => <Input value={customRole} onChange={(e) => setCustomRole(e.target.value)} required {...props} />}
          </FormField>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Allocation %" required>
            {(props) => (
              <Input
                type="number" min={1} max={100}
                value={alloc}
                onChange={(e) => setAlloc(e.target.value)}
                {...props}
              />
            )}
          </FormField>
          <FormField label="End date">
            {(props) => <DatePicker value={endDate} min={startDate} onValueChange={setEndDate} {...props} />}
          </FormField>
        </div>

        <FormField label="Note">
          {(props) => (
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional context (e.g. tentative — pending client confirmation)"
              {...props}
            />
          )}
        </FormField>

        {error && <div style={{ fontSize: 11, color: 'var(--color-status-danger)' }}>{error}</div>}
      </form>
    </Modal>
  );
}
