import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { buildTeam, type TeamBuilderRoleInput, type TeamBuilderResponse, type TeamBuilderCandidate } from '@/lib/api/staffing-desk';

interface Props {
  onClose: () => void;
  open: boolean;
}

const OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const BACKDROP: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' };
const MODAL: React.CSSProperties = {
  position: 'relative', width: 700, maxWidth: '95vw', maxHeight: '90vh',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 12, boxShadow: 'var(--shadow-modal)', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};

const emptyRole = (): TeamBuilderRoleInput => ({
  role: '', skills: [], allocationPercent: 100, headcount: 1,
});

export function TeamBuilderModal({ onClose, open }: Props): JSX.Element | null {
  const [projectId, setProjectId] = useState('');
  const [roles, setRoles] = useState<TeamBuilderRoleInput[]>([emptyRole()]);
  const [result, setResult] = useState<TeamBuilderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelinePerson, setTimelinePerson] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function updateRole(index: number, updates: Partial<TeamBuilderRoleInput>): void {
    setRoles((prev) => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  }

  function addRole(): void {
    setRoles((prev) => [...prev, emptyRole()]);
  }

  function removeRole(index: number): void {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate(): Promise<void> {
    if (!projectId.trim()) { setError('Project ID is required.'); return; }
    if (roles.some((r) => !r.role.trim())) { setError('All roles must have a name.'); return; }

    setLoading(true);
    setError(null);
    try {
      const response = await buildTeam({ projectId: projectId.trim(), roles });
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate team suggestions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={OVERLAY}>
      <div style={BACKDROP} onClick={onClose} />
      <div style={MODAL}>
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Team Builder</div>
          <button className="button button--secondary button--sm" onClick={onClose} type="button">&times;</button>
        </div>

        <div style={{ padding: 'var(--space-3) var(--space-4)', overflowY: 'auto', flex: 1 }}>
          {/* Project selector */}
          <label className="field" style={{ marginBottom: 'var(--space-2)' }}>
            <span className="field__label">Project ID</span>
            <input className="field__control" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="UUID of target project" />
          </label>

          {/* Role requirements */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Required Roles</div>
          {roles.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'flex-end', marginBottom: 'var(--space-1)' }}>
              <label className="field" style={{ flex: 2 }}>
                <span className="field__label">Role</span>
                <input className="field__control" value={r.role} onChange={(e) => updateRole(i, { role: e.target.value })} placeholder="e.g. Senior Java Dev" />
              </label>
              <label className="field" style={{ flex: 2 }}>
                <span className="field__label">Skills (comma-sep)</span>
                <input className="field__control" value={r.skills.join(', ')} onChange={(e) => updateRole(i, { skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Java, Spring" />
              </label>
              <label className="field" style={{ flex: 0, minWidth: 60 }}>
                <span className="field__label">%</span>
                <input className="field__control" type="number" min={10} max={100} step={10} value={r.allocationPercent} onChange={(e) => updateRole(i, { allocationPercent: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ flex: 0, minWidth: 50 }}>
                <span className="field__label">HC</span>
                <input className="field__control" type="number" min={1} max={10} value={r.headcount} onChange={(e) => updateRole(i, { headcount: Number(e.target.value) })} />
              </label>
              {roles.length > 1 && (
                <button className="button button--secondary button--sm" onClick={() => removeRole(i)} type="button" style={{ fontSize: 12, marginBottom: 4 }}>&times;</button>
              )}
            </div>
          ))}
          <button className="button button--secondary button--sm" onClick={addRole} type="button" style={{ fontSize: 10, marginBottom: 'var(--space-2)' }}>
            + Add Role
          </button>

          {error && <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginBottom: 'var(--space-2)' }}>{error}</div>}

          <button className="button button--sm" onClick={() => void handleGenerate()} disabled={loading} type="button">
            {loading ? 'Generating...' : 'Generate Team'}
          </button>

          {/* Results */}
          {result && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-2)' }}>Suggested Team Composition</div>
              {result.suggestions.map((s) => (
                <div key={s.role} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 'var(--space-1)', color: 'var(--color-text-muted)' }}>
                    {s.role} ({s.candidates.length} candidates)
                  </div>
                  {s.candidates.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--color-status-danger)' }}>No matching candidates found.</div>
                  )}
                  {s.candidates.map((c) => (
                    <div key={c.personId} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 4,
                      fontSize: 12, marginBottom: 2,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{c.displayName}</div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>
                          {c.matchedSkills.join(', ') || 'No skill match data'}
                        </div>
                      </div>
                      <StatusBadge label={`Score: ${c.score}`} tone={c.score >= 0.7 ? 'active' : c.score >= 0.4 ? 'warning' : 'neutral'} variant="chip" size="small" />
                      <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {c.availableCapacityPercent}% free
                      </span>
                      <button
                        className="button button--secondary button--sm"
                        onClick={() => setTimelinePerson(c.personId)}
                        type="button"
                        style={{ fontSize: 9, padding: '2px 6px' }}
                      >
                        Timeline
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {/* Timeline viewer */}
              {timelinePerson && (
                <div style={{ marginTop: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Candidate Timeline</span>
                    <button className="button button--secondary button--sm" onClick={() => setTimelinePerson(null)} type="button" style={{ fontSize: 10 }}>Close</button>
                  </div>
                  <WorkloadTimeline personId={timelinePerson} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
