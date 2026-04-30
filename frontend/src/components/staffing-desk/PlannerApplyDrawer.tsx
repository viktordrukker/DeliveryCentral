import { useCallback, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { CellClass } from '@/lib/api/staffing-desk';
import type { PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';
import { Button, Drawer } from '@/components/ds';

interface Props {
  onApply: (dispatches: string[], hires: string[], releases: string[], extensions: string[]) => void;
  onClose: () => void;
  open: boolean;
  simulation: PlannerSimulation;
  budgetDelta: number;
}

interface DrawerDispatchRow {
  id: string;
  personName: string;
  projectName: string;
  role: string;
  alloc: number;
  week: string;
  cellClass: CellClass;
  mismatchedSkills: string[];
  reasonType?: string;
  reasonNote?: string;
  origin: 'move' | 'suggestion';
}

const CLASS_TONE: Record<CellClass, 'active' | 'warning' | 'danger' | 'neutral'> = {
  SUGGESTED: 'active',
  ACCEPTABLE: 'warning',
  MISMATCH: 'danger',
  BLOCKED: 'neutral',
};

/**
 * Phase DS-2-5 — rebuilt on `<Drawer>`. Backdrop / focus trap / scroll lock /
 * escape close handled by the DS shell. External API unchanged.
 */
export function PlannerApplyDrawer({ onApply, onClose, open, simulation, budgetDelta }: Props): JSX.Element | null {
  const [checkedDispatches, setCheckedDispatches] = useState<Set<string>>(new Set());
  const [checkedHires, setCheckedHires] = useState<Set<string>>(new Set());
  const [checkedReleases, setCheckedReleases] = useState<Set<string>>(new Set());
  const [checkedExtensions, setCheckedExtensions] = useState<Set<string>>(new Set());

  const acceptedSuggestions = simulation.suggestions.filter((s) => s.accepted);
  const projectNameById = new Map<string, string>();
  for (const s of simulation.suggestions) projectNameById.set(s.targetProjectId, s.targetProjectName);
  const allMoves: DrawerDispatchRow[] = [
    ...simulation.moves.map((m) => ({
      id: m.id,
      personName: m.personName,
      projectName: projectNameById.get(m.toProjectId) ?? m.toProjectId,
      role: m.staffingRole,
      alloc: m.allocationPercent,
      week: m.weekStart,
      cellClass: m.cellClass,
      mismatchedSkills: m.mismatchedSkills,
      reasonType: m.reason?.type,
      reasonNote: m.reason?.note,
      origin: 'move' as const,
    })),
    ...acceptedSuggestions.map((s) => ({
      id: s.id,
      personName: s.benchPersonName,
      projectName: s.targetProjectName,
      role: s.demandRole,
      alloc: s.allocationPercent,
      week: s.weekStart,
      cellClass: s.cellClass,
      mismatchedSkills: s.mismatchedSkills,
      origin: 'suggestion' as const,
    })),
  ];
  const overrideCount = allMoves.filter((m) => m.cellClass === 'MISMATCH' || m.cellClass === 'BLOCKED').length;

  // Auto-check all on first render
  if (open && checkedDispatches.size === 0 && allMoves.length > 0) {
    const ids = new Set(allMoves.map((m) => m.id));
    if (ids.size > 0) setTimeout(() => setCheckedDispatches(ids), 0);
  }
  if (open && checkedHires.size === 0 && simulation.hireIntents.length > 0) {
    const ids = new Set(simulation.hireIntents.map((h) => h.id));
    if (ids.size > 0) setTimeout(() => setCheckedHires(ids), 0);
  }
  if (open && checkedReleases.size === 0 && simulation.releases.length > 0) {
    const ids = new Set(simulation.releases.map((r) => r.id));
    if (ids.size > 0) setTimeout(() => setCheckedReleases(ids), 0);
  }
  if (open && checkedExtensions.size === 0 && simulation.extensions.length > 0) {
    const ids = new Set(simulation.extensions.map((e) => e.id));
    if (ids.size > 0) setTimeout(() => setCheckedExtensions(ids), 0);
  }

  const toggleCheck = useCallback((set: Set<string>, setFn: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFn(next);
  }, []);

  const handleApply = useCallback(() => {
    onApply([...checkedDispatches], [...checkedHires], [...checkedReleases], [...checkedExtensions]);
    setCheckedDispatches(new Set());
    setCheckedHires(new Set());
    setCheckedReleases(new Set());
    setCheckedExtensions(new Set());
  }, [checkedDispatches, checkedHires, checkedReleases, checkedExtensions, onApply]);

  const totalSelected = checkedDispatches.size + checkedHires.size + checkedExtensions.size;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="md"
      ariaLabel="Review and apply plan"
      title="Review & Apply Plan"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>
            Apply All ({totalSelected} actions)
          </Button>
        </>
      }
    >
      {/* Dispatches */}
      {allMoves.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-status-active)', marginBottom: 'var(--space-1)' }}>
            Assignments to Create ({checkedDispatches.size}/{allMoves.length})
            {overrideCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--color-status-warning)' }}>
                · {overrideCount} override{overrideCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {allMoves.map((m) => (
            <label key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', padding: '4px 0', fontSize: 11, cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
              <input type="checkbox" checked={checkedDispatches.has(m.id)} onChange={() => toggleCheck(checkedDispatches, setCheckedDispatches, m.id)} style={{ accentColor: 'var(--color-accent)', marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 500 }}>{m.personName}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span>{m.projectName}</span>
                  <StatusBadge label={m.cellClass} tone={CLASS_TONE[m.cellClass]} variant="chip" size="small" />
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {m.role || '—'} · {m.alloc}% · week {m.week.slice(5)}
                </div>
                {(m.cellClass === 'MISMATCH' || m.cellClass === 'BLOCKED') && m.mismatchedSkills.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--color-status-danger)', marginTop: 2 }}>
                    Missing: {m.mismatchedSkills.join(', ')}
                  </div>
                )}
                {m.reasonType && (
                  <div style={{ fontSize: 10, color: 'var(--color-status-warning)', marginTop: 2 }}>
                    Reason: {m.reasonType}{m.reasonNote ? ` — ${m.reasonNote}` : ''}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Hire Requests */}
      {simulation.hireIntents.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgb(168,85,247)', marginBottom: 'var(--space-1)' }}>
            Staffing Requests to Create ({checkedHires.size}/{simulation.hireIntents.length})
          </div>
          {simulation.hireIntents.map((h) => (
            <label key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0', fontSize: 11, cursor: 'pointer' }}>
              <input type="checkbox" checked={checkedHires.has(h.id)} onChange={() => toggleCheck(checkedHires, setCheckedHires, h.id)} style={{ accentColor: 'rgb(168,85,247)' }} />
              <span>{h.role} ×{h.count} · {h.projectName} · {h.allocationPercent}%</span>
            </label>
          ))}
        </div>
      )}

      {/* Releases */}
      {simulation.releases.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-status-danger)', marginBottom: 'var(--space-1)' }}>
            Releases to Note ({checkedReleases.size}/{simulation.releases.length})
          </div>
          {simulation.releases.map((r) => (
            <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0', fontSize: 11, cursor: 'pointer' }}>
              <input type="checkbox" checked={checkedReleases.has(r.id)} onChange={() => toggleCheck(checkedReleases, setCheckedReleases, r.id)} style={{ accentColor: 'var(--color-status-danger)' }} />
              <span>{r.personName} — notify HR</span>
            </label>
          ))}
        </div>
      )}

      {/* Extensions */}
      {simulation.extensions.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-status-active)', marginBottom: 'var(--space-1)' }}>
            Extensions to Apply ({checkedExtensions.size}/{simulation.extensions.length})
          </div>
          {simulation.extensions.map((ext) => (
            <label key={ext.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', padding: '4px 0', fontSize: 11, cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
              <input type="checkbox" checked={checkedExtensions.has(ext.id)} onChange={() => toggleCheck(checkedExtensions, setCheckedExtensions, ext.id)} style={{ accentColor: 'var(--color-status-active)', marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 500 }}>{ext.personName}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span>{ext.projectName}</span>
                  {ext.conflicts.length > 0 && <StatusBadge label={`${ext.conflicts.length} ANOMALY`} tone="warning" variant="chip" size="small" />}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {ext.staffingRole || '—'} · {ext.allocationPercent}% · through {ext.newValidTo}
                </div>
                {ext.conflicts.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--color-status-warning)', marginTop: 2 }}>
                    {ext.conflicts.map((c) => c.message).join(' · ')}
                  </div>
                )}
                {ext.reason && (
                  <div style={{ fontSize: 10, color: 'var(--color-status-warning)', marginTop: 2 }}>
                    Reason: {ext.reason.type}{ext.reason.note ? ` — ${ext.reason.note}` : ''}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Budget */}
      <div style={{ padding: 'var(--space-2)', borderTop: '1px solid var(--color-border)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        Budget Impact: <strong style={{ color: budgetDelta > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>
          {budgetDelta > 0 ? '+' : ''}{Math.round(budgetDelta / 1000)}K/mo
        </strong>
      </div>
    </Drawer>
  );
}
