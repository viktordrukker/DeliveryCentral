import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import {
  archivePlannerScenario,
  createPlannerScenario,
  getPlannerScenario,
  listPlannerScenarios,
  type PlannerScenarioSummary,
} from '@/lib/api/staffing-desk';
import type { PlannerSimulation, SerializedSimState } from '@/features/staffing-desk/usePlannerSimulation';

interface Props {
  simulation: PlannerSimulation;
  horizonFrom: string;
  horizonWeeks: number;
  onLoaded: () => void;
}

const S_MENU: React.CSSProperties = {
  position: 'absolute', top: 32, right: 0, zIndex: 70,
  width: 340, maxHeight: 440, overflowY: 'auto',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-dropdown)',
  fontSize: 11,
};
const S_HEADER: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontWeight: 600 };
const S_ROW: React.CSSProperties = {
  display: 'flex', gap: 6, alignItems: 'flex-start',
  padding: '6px 12px', borderBottom: '1px solid var(--color-border)',
};

export function PlannerScenariosMenu({ simulation, horizonFrom, horizonWeeks, onLoaded }: Props): JSX.Element {
  const { principal } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<PlannerScenarioSummary[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPlannerScenarios();
      setScenarios(list);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-scenarios-menu]')) setOpen(false);
    };
    // Delay so the same click that opened it doesn't close it
    const t = window.setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => { window.clearTimeout(t); document.removeEventListener('click', onClick); };
  }, [open]);

  const handleSave = useCallback(async () => {
    const name = window.prompt('Scenario name');
    if (!name || !name.trim()) return;
    if (!principal?.personId) { toast.error('Not authenticated'); return; }

    setSaving(true);
    try {
      const state = simulation.serialize();
      const summary = {
        summaryAssignments: simulation.moves.length + simulation.suggestions.filter((s) => s.accepted).length,
        summaryHires: simulation.hireIntents.reduce((s, h) => s + h.count, 0),
        summaryReleases: simulation.releases.length,
        summaryExtensions: simulation.extensions.length,
        summaryAnomalies: simulation.getAnomalies().length,
      };
      await createPlannerScenario({
        actorId: principal.personId,
        name: name.trim(),
        state,
        ...summary,
        horizonFrom,
        horizonWeeks,
      });
      toast.success(`Scenario "${name.trim()}" saved`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [principal, simulation, horizonFrom, horizonWeeks, refresh]);

  const handleLoad = useCallback(async (id: string, name: string) => {
    if (simulation.hasChanges) {
      if (!window.confirm(`Replace current simulation with "${name}"? Unsaved changes will be lost.`)) return;
    }
    try {
      const detail = await getPlannerScenario(id);
      simulation.loadState(detail.state as SerializedSimState);
      toast.success(`Loaded "${name}"`);
      setOpen(false);
      onLoaded();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    }
  }, [simulation, onLoaded]);

  const handleFork = useCallback(async (id: string, sourceName: string) => {
    const name = window.prompt('New scenario name', `${sourceName} (copy)`);
    if (!name || !name.trim()) return;
    if (!principal?.personId) { toast.error('Not authenticated'); return; }

    try {
      const source = await getPlannerScenario(id);
      await createPlannerScenario({
        actorId: principal.personId,
        name: name.trim(),
        description: `Forked from ${sourceName}`,
        state: source.state,
        summaryAssignments: source.summaryAssignments,
        summaryHires: source.summaryHires,
        summaryReleases: source.summaryReleases,
        summaryExtensions: source.summaryExtensions,
        summaryAnomalies: source.summaryAnomalies,
        horizonFrom: source.horizonFrom ?? undefined,
        horizonWeeks: source.horizonWeeks ?? undefined,
      });
      toast.success(`Forked as "${name.trim()}"`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fork failed');
    }
  }, [principal, refresh]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Archive scenario "${name}"? This hides it from the list.`)) return;
    try {
      await archivePlannerScenario(id);
      toast.success(`Archived "${name}"`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }, [refresh]);

  return (
    <div style={{ position: 'relative' }} data-scenarios-menu>
      <button
        type="button"
        className="button button--secondary button--sm"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 10 }}
        title="Planner scenarios"
        data-testid="scenarios-menu-toggle"
      >
        Scenarios ▾
      </button>
      {open && (
        <div style={S_MENU}>
          <div style={S_HEADER}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Scenarios</span>
              <button
                type="button"
                className="button button--sm"
                onClick={() => void handleSave()}
                disabled={saving || !simulation.hasChanges}
                style={{ fontSize: 9 }}
                title={simulation.hasChanges ? 'Save current simulation' : 'No changes to save'}
              >
                {saving ? 'Saving…' : 'Save current'}
              </button>
            </div>
          </div>

          {loading && <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading…</div>}

          {!loading && scenarios.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No scenarios yet. Save the current simulation to create one.
            </div>
          )}

          {!loading && scenarios.map((s) => (
            <div key={s.id} style={S_ROW}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>
                  {s.createdByName ?? '—'} · {format(new Date(s.updatedAt), 'dd MMM yyyy HH:mm')}
                </div>
                <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {s.summaryAssignments} assigns · {s.summaryHires} hires · {s.summaryExtensions} extends
                  {s.summaryAnomalies > 0 && <span style={{ color: 'var(--color-status-warning)' }}> · {s.summaryAnomalies} anomalies</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" className="button button--sm" onClick={() => void handleLoad(s.id, s.name)} style={{ fontSize: 9 }} title="Replace current sim with this scenario">
                  Load
                </button>
                <button type="button" className="button button--secondary button--sm" onClick={() => void handleFork(s.id, s.name)} style={{ fontSize: 9 }} title="Duplicate this scenario">
                  Fork
                </button>
                <button type="button" className="button button--secondary button--sm" onClick={() => void handleDelete(s.id, s.name)} style={{ fontSize: 9, color: 'var(--color-status-danger)' }} title="Archive scenario">
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
