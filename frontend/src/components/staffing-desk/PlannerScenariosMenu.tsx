import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  archivePlannerScenario,
  createPlannerScenario,
  getPlannerScenario,
  listPlannerScenarios,
  type PlannerScenarioSummary,
} from '@/lib/api/staffing-desk';
import type { PlannerSimulation, SerializedSimState } from '@/features/staffing-desk/usePlannerSimulation';
import { Button, FormField, FormModal, Input } from '@/components/ds';

type PendingConfirm =
  | { kind: 'load'; id: string; name: string }
  | { kind: 'archive'; id: string; name: string }
  | null;

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
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  // V2-C.14 follow-up — name entry via DS FormModal instead of a browser prompt.
  const [nameDialog, setNameDialog] = useState<{ mode: 'save' } | { mode: 'fork'; id: string; sourceName: string } | null>(null);
  const [nameValue, setNameValue] = useState('');

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

  const openSave = useCallback(() => {
    setNameValue('');
    setNameDialog({ mode: 'save' });
  }, []);

  const performLoad = useCallback(async (id: string, name: string) => {
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

  const handleLoad = useCallback((id: string, name: string) => {
    if (simulation.hasChanges) {
      setPendingConfirm({ kind: 'load', id, name });
      return;
    }
    void performLoad(id, name);
  }, [simulation.hasChanges, performLoad]);

  const openFork = useCallback((id: string, sourceName: string) => {
    setNameValue(`${sourceName} (copy)`);
    setNameDialog({ mode: 'fork', id, sourceName });
  }, []);

  // Single submit handler for both save + fork; FormModal tracks the pending
  // state and keeps the modal open if this throws.
  const submitName = useCallback(async () => {
    const name = nameValue.trim();
    if (!name || !nameDialog) return;
    if (!principal?.personId) { toast.error('Not authenticated'); return; }

    if (nameDialog.mode === 'save') {
      setSaving(true);
      try {
        const state = simulation.serialize();
        await createPlannerScenario({
          actorId: principal.personId,
          name,
          state,
          summaryAssignments: simulation.moves.length + simulation.suggestions.filter((s) => s.accepted).length,
          summaryHires: simulation.hireIntents.reduce((s, h) => s + h.count, 0),
          summaryReleases: simulation.releases.length,
          summaryExtensions: simulation.extensions.length,
          summaryAnomalies: simulation.getAnomalies().length,
          horizonFrom,
          horizonWeeks,
        });
        toast.success(`Scenario "${name}" saved`);
        setNameDialog(null);
        await refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    } else {
      try {
        const source = await getPlannerScenario(nameDialog.id);
        await createPlannerScenario({
          actorId: principal.personId,
          name,
          description: `Forked from ${nameDialog.sourceName}`,
          state: source.state,
          summaryAssignments: source.summaryAssignments,
          summaryHires: source.summaryHires,
          summaryReleases: source.summaryReleases,
          summaryExtensions: source.summaryExtensions,
          summaryAnomalies: source.summaryAnomalies,
          horizonFrom: source.horizonFrom ?? undefined,
          horizonWeeks: source.horizonWeeks ?? undefined,
        });
        toast.success(`Forked as "${name}"`);
        setNameDialog(null);
        await refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Fork failed');
      }
    }
  }, [nameValue, nameDialog, principal, simulation, horizonFrom, horizonWeeks, refresh]);

  const performArchive = useCallback(async (id: string, name: string) => {
    try {
      await archivePlannerScenario(id);
      toast.success(`Archived "${name}"`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }, [refresh]);

  const handleDelete = useCallback((id: string, name: string) => {
    setPendingConfirm({ kind: 'archive', id, name });
  }, []);

  const handleConfirmPending = useCallback(() => {
    if (!pendingConfirm) return;
    const { kind, id, name } = pendingConfirm;
    setPendingConfirm(null);
    if (kind === 'load') {
      void performLoad(id, name);
    } else if (kind === 'archive') {
      void performArchive(id, name);
    }
  }, [pendingConfirm, performLoad, performArchive]);

  return (
    <div style={{ position: 'relative' }} data-scenarios-menu>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} style={{ fontSize: 10 }} title="Planner scenarios" data-testid="scenarios-menu-toggle">
        Scenarios ▾
      </Button>
      {open && (
        <div style={S_MENU}>
          <div style={S_HEADER}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Scenarios</span>
              <Button type="button" variant="primary" size="sm" onClick={openSave} disabled={saving || !simulation.hasChanges} style={{ fontSize: 9 }} title={simulation.hasChanges ? 'Save current simulation' : 'No changes to save'}>
                {saving ? 'Saving…' : 'Save current'}
              </Button>
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
                <Button type="button" variant="primary" size="sm" onClick={() => handleLoad(s.id, s.name)} style={{ fontSize: 9 }} title="Replace current sim with this scenario">
                  Load
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => openFork(s.id, s.name)} style={{ fontSize: 9 }} title="Duplicate this scenario">
                  Fork
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleDelete(s.id, s.name)} style={{ fontSize: 9, color: 'var(--color-status-danger)' }} title="Archive scenario">
                  Archive
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingConfirm != null}
        title={pendingConfirm?.kind === 'archive' ? 'Archive scenario?' : 'Replace current simulation?'}
        message={
          pendingConfirm?.kind === 'archive'
            ? `Archive scenario "${pendingConfirm.name}"? It will be hidden from the list.`
            : pendingConfirm
            ? `Replace current simulation with "${pendingConfirm.name}"? Unsaved changes will be lost.`
            : ''
        }
        confirmLabel={pendingConfirm?.kind === 'archive' ? 'Archive' : 'Replace'}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={handleConfirmPending}
      />

      <FormModal
        open={nameDialog != null}
        onCancel={() => setNameDialog(null)}
        onSubmit={submitName}
        title={nameDialog?.mode === 'fork' ? 'Fork scenario' : 'Save scenario'}
        submitLabel={nameDialog?.mode === 'fork' ? 'Fork' : 'Save'}
        submitDisabled={!nameValue.trim()}
        testId="scenario-name"
      >
        <FormField label="Scenario name">
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Scenario name"
            autoFocus
          />
        </FormField>
      </FormModal>
    </div>
  );
}
