import { FormEvent, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { createAssignment } from '@/lib/api/assignments';
import { STAFFING_ROLES } from '@/lib/staffing-roles';
import type { PlannerBenchPerson } from '@/lib/api/staffing-desk';

interface Props {
  projectId: string;
  projectName: string;
  startDate: string;
  benchPeople: PlannerBenchPerson[];
  onClose: () => void;
  onCreated: () => void;
}

const S_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const S_PANEL: React.CSSProperties = {
  width: 'min(520px, 96vw)', maxHeight: '92vh',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-modal)',
  display: 'flex', flexDirection: 'column',
};
const S_HEADER: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const S_BODY: React.CSSProperties = { padding: '12px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 };
const S_FOOTER: React.CSSProperties = {
  padding: '10px 16px', borderTop: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', gap: 8,
};

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

  // Sort bench by availability desc, then days-on-bench desc
  const sortedBench = useMemo(() => {
    return [...benchPeople].sort((a, b) => b.availablePercent - a.availablePercent || b.daysOnBench - a.daysOnBench);
  }, [benchPeople]);

  const selectedPerson = sortedBench.find((p) => p.personId === personId) ?? null;

  const submit = useCallback(async (e: FormEvent, asDraft: boolean) => {
    e.preventDefault();
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
    <div style={S_BACKDROP} onClick={onClose} role="dialog" aria-modal="true" aria-label="Draft assignment">
      <div style={S_PANEL} onClick={(e) => e.stopPropagation()}>
        <div style={S_HEADER}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Draft assignment</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {projectName} · week of {startDate}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>
            Creates a REQUESTED or DRAFT ProjectAssignment visible in team tabs, staffing desk, and planner.
          </div>
        </div>

        <form onSubmit={(e) => void submit(e, false)} style={{ display: 'contents' }}>
          <div style={S_BODY}>
            <label className="field" style={{ gap: 4 }}>
              <span className="field__label">Person *</span>
              <select
                className="field__control"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                required
                data-testid="draft-person-select"
              >
                <option value="">Pick from bench ({sortedBench.length})…</option>
                {sortedBench.map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {p.displayName}{p.grade ? ` · ${p.grade}` : ''} · {p.availablePercent}% free · {p.daysOnBench}d bench
                  </option>
                ))}
              </select>
              {selectedPerson && selectedPerson.skills.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Skills: {selectedPerson.skills.slice(0, 6).join(', ')}{selectedPerson.skills.length > 6 ? '…' : ''}
                </div>
              )}
            </label>

            <label className="field" style={{ gap: 4 }}>
              <span className="field__label">Staffing role *</span>
              <select className="field__control" value={staffingRole} onChange={(e) => setStaffingRole(e.target.value)} required>
                <option value="">Select a role…</option>
                {STAFFING_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                <option value="__custom__">Other (custom)</option>
              </select>
            </label>
            {staffingRole === '__custom__' && (
              <label className="field" style={{ gap: 4 }}>
                <span className="field__label">Custom role *</span>
                <input className="field__control" value={customRole} onChange={(e) => setCustomRole(e.target.value)} required />
              </label>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field" style={{ gap: 4 }}>
                <span className="field__label">Allocation % *</span>
                <input
                  type="number" min={1} max={100}
                  className="field__control"
                  value={alloc}
                  onChange={(e) => setAlloc(e.target.value)}
                />
              </label>
              <label className="field" style={{ gap: 4 }}>
                <span className="field__label">End date</span>
                <input
                  type="date"
                  className="field__control"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>

            <label className="field" style={{ gap: 4 }}>
              <span className="field__label">Note</span>
              <textarea
                className="field__control"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional context (e.g. tentative — pending client confirmation)"
              />
            </label>

            {error && <div style={{ fontSize: 11, color: 'var(--color-status-danger)' }}>{error}</div>}
          </div>

          <div style={S_FOOTER}>
            <button className="button button--secondary" onClick={onClose} type="button" disabled={submitting}>Cancel</button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="button button--secondary"
                onClick={(e) => void submit(e as unknown as FormEvent, true)}
                type="button"
                disabled={submitting || !personId || !effectiveRole}
                data-testid="draft-save"
              >
                {submitting ? 'Saving…' : 'Save draft'}
              </button>
              <button
                className="button"
                type="submit"
                disabled={submitting || !personId || !effectiveRole}
                data-testid="draft-request"
              >
                {submitting ? 'Creating…' : 'Create & request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
