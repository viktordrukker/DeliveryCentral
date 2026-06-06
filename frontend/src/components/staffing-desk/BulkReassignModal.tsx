import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button, Modal } from '@/components/ds';
import { ErrorState } from '@/components/common/ErrorState';
import {
  bulkReassignPositions,
  type BulkReassignPositionsRequest,
} from '@/lib/api/project-positions';
import {
  fetchPersonDirectory,
  type PersonDirectoryItem,
} from '@/lib/api/person-directory';
import {
  fetchProjectDirectory,
  type ProjectDirectoryItem,
} from '@/lib/api/project-registry';

interface Props {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onApplied: () => void;
}

/**
 * LEAN-P4-missing-1 — bulk reassign modal.
 *
 * Lets a PM (or other PROJECT_DELIVERY_ROLES principal) pick up to two
 * targets for the currently-selected positions:
 *   - a new active person (or "unassign" to clear)
 *   - a new project (move the position rows to a different parent project)
 *
 * Mounted by `StaffingDeskPage` and rendered only when `open` is true so the
 * directory fetches don't fire on every page render.
 */
export function BulkReassignModal({ open, selectedIds, onClose, onApplied }: Props): JSX.Element {
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toPersonId, setToPersonId] = useState<string>(''); // '' = no change, '__unassign__' = clear
  const [toProjectId, setToProjectId] = useState<string>(''); // '' = no change
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load directories whenever the modal opens. Cleanup guards against state
  // updates after close (CLAUDE.md pattern: let active = true; ...).
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    setToPersonId('');
    setToProjectId('');
    setReason('');
    Promise.all([
      fetchPersonDirectory({ pageSize: 500 }),
      fetchProjectDirectory({ pageSize: 200 }),
    ])
      .then(([peopleRes, projectsRes]) => {
        if (!active) return;
        setPeople(peopleRes.items);
        const eligible = projectsRes.items.filter(
          (p) => !['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED'].includes(p.status.toUpperCase()),
        );
        setProjects(eligible);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Could not load people / projects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (toPersonId === '' && toProjectId === '') {
      setError('Pick a new person, a new project, or both.');
      return;
    }
    setSubmitting(true);
    try {
      const request: BulkReassignPositionsRequest = {
        positionIds: selectedIds,
        reason: reason.trim() || undefined,
      };
      if (toPersonId !== '') {
        request.toPersonId = toPersonId === '__unassign__' ? null : toPersonId;
      }
      if (toProjectId !== '') {
        request.toProjectId = toProjectId;
      }
      const result = await bulkReassignPositions(request);
      if (result.errors.length > 0) {
        setError(result.errors.join('; '));
        return;
      }
      toast.success(`Reassigned ${result.reassigned} position(s).`);
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk reassign failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reassign ${selectedIds.length} position${selectedIds.length === 1 ? '' : 's'}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting} type="button">Cancel</Button>
          <Button
            variant="primary"
            onClick={() => { void handleSubmit(); }}
            disabled={submitting || loading || selectedIds.length === 0}
            data-autofocus="true"
            type="button"
          >
            {submitting ? 'Applying…' : 'Apply'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {error && <ErrorState description={error} />}
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading people and projects…</p>
        ) : (
          <>
            <label className="field">
              <span className="field__label">Reassign to person</span>
              <select
                className="field__control"
                value={toPersonId}
                onChange={(e) => setToPersonId(e.target.value)}
                disabled={submitting}
                data-testid="bulk-reassign-person-select"
              >
                <option value="">— leave person unchanged —</option>
                <option value="__unassign__">— unassign (clear person) —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}{p.role ? ` — ${p.role}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Move to project</span>
              <select
                className="field__control"
                value={toProjectId}
                onChange={(e) => setToProjectId(e.target.value)}
                disabled={submitting}
                data-testid="bulk-reassign-project-select"
              >
                <option value="">— leave project unchanged —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectCode} — {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Reason (optional, written to audit log)</span>
              <textarea
                className="field__control"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Maternity cover, project re-org, slate approval"
                data-testid="bulk-reassign-reason"
              />
            </label>

            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Applies to {selectedIds.length} position(s). Any single failure
              rolls the whole batch back — staffing state will never land
              half-applied.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
