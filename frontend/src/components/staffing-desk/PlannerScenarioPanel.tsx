import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, FormField, FormModal, Input } from '@/components/ds';
import {
  type PlannerScenarioDto,
  type PlannerScenarioStateDto,
  getScenario,
} from '@/lib/api/planner-scenarios';
import {
  type UsePlannerScenariosResult,
  usePlannerScenarios,
} from '@/features/staffing-desk/usePlannerScenarios';

/**
 * LEAN-P4a-2 — Planner scenario panel.
 *
 * Sidebar/drawer panel that lists the current user's saved planner
 * scenarios with Save / Load / Cancel actions. Backed by the
 * `usePlannerScenarios` hook on top of `/api/staffing/scenarios`.
 *
 *   - Save → opens a name prompt (FormModal); POSTs a new scenario.
 *   - Load → calls onLoad(scenario.state) so the embedding planner can
 *            replace its in-memory proposed assignments.
 *   - Cancel → ConfirmDialog + soft-cancel via DELETE.
 *
 * The panel is theme-driven (uses `--color-*` tokens, no raw hex) and
 * goes through DS primitives (Button, FormModal, ConfirmDialog) per the
 * design-system rules.
 */
export interface PlannerScenarioPanelProps {
  /**
   * Current proposed-assignment state on the planner. Snapshotted at Save
   * time. When omitted, the panel saves an empty scenario.
   */
  currentState?: PlannerScenarioStateDto;
  /**
   * Called after the user confirms loading a scenario. Receives the full
   * proposed-assignment state so the planner can replace its in-memory
   * state. The hook itself only owns the scenario list.
   */
  onLoad?: (scenario: PlannerScenarioDto) => void;
  /**
   * Inject a pre-existing hook instance — useful for tests and when the
   * parent already manages the scenarios list (e.g. Distribution Studio).
   * When omitted, the panel owns its own hook.
   */
  hook?: UsePlannerScenariosResult;
  /** Override the default panel title. */
  title?: string;
}

export function PlannerScenarioPanel({
  currentState,
  onLoad,
  hook,
  title,
}: PlannerScenarioPanelProps): JSX.Element {
  const ownHook = usePlannerScenarios({ autoLoad: !hook });
  const state = hook ?? ownHook;
  const { scenarios, loading, error, activeId, setActiveId, reload, save, rename, cancel } = state;

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PlannerScenarioDto | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [cancelTarget, setCancelTarget] = useState<PlannerScenarioDto | null>(null);
  const [busy, setBusy] = useState(false);

  function openSave(): void {
    const next = (scenarios?.length ?? 0) + 1;
    setSaveName(`Scenario ${next}`);
    setSaveOpen(true);
  }

  async function submitSave(): Promise<void> {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await save({
        name,
        state: currentState ?? { proposedAssignments: [] },
      });
      toast.success(`Scenario "${created.name}" saved`);
      setSaveOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openRename(scenario: PlannerScenarioDto): void {
    setRenameValue(scenario.name);
    setRenameTarget(scenario);
  }

  async function submitRename(): Promise<void> {
    const name = renameValue.trim();
    if (!name || !renameTarget) return;
    if (name === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    try {
      await rename(renameTarget.id, name);
      toast.success(`Renamed to "${name}"`);
      setRenameTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed');
    }
  }

  async function handleLoad(scenario: PlannerScenarioDto): Promise<void> {
    setActiveId(scenario.id);
    if (!onLoad) return;
    setBusy(true);
    try {
      // Always fetch the detail to guarantee `state.proposedAssignments` is
      // present — list responses are summary-shaped per BE contract.
      const detail = await getScenario(scenario.id);
      onLoad(detail);
      toast.success(`Loaded "${detail.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel(): Promise<void> {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    setBusy(true);
    try {
      await cancel(target.id);
      toast.success(`Scenario "${target.name}" cancelled`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState variant="skeleton" skeletonType="cards" />;
  if (error) return <ErrorState description={error} onRetry={() => void reload()} />;

  const headerTitle = title ?? 'Saved scenarios';

  return (
    <div data-testid="planner-scenario-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>
              {headerTitle} ({scenarios?.length ?? 0})
            </span>
            <Button size="sm" onClick={openSave} disabled={busy || saving} data-testid="scenario-save">
              + Save current
            </Button>
          </span>
        }
      >
        {!scenarios || scenarios.length === 0 ? (
          <EmptyState
            title="No scenarios saved yet"
            description="Save the current planner state as a scenario to compare alternative staffing plans."
            actions={[{ label: '+ Save current', onClick: openSave }]}
          />
        ) : (
          <ul
            data-testid="planner-scenario-list"
            style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {scenarios.map((s) => (
              <li
                key={s.id}
                data-testid={`scenario-row-${s.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 220px',
                  gap: 8,
                  padding: '6px 10px',
                  alignItems: 'center',
                  background: s.id === activeId ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  borderLeft:
                    s.id === activeId ? '3px solid var(--color-accent)' : '3px solid var(--color-border)',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {s.summary.assignments} assigns · +{s.summary.hires} · −{s.summary.releases} · ~{s.summary.extensions}
                  </span>
                </div>
                {s.summary.anomalies > 0 ? (
                  <StatusBadge tone="warning" variant="chip" label={`${s.summary.anomalies} anomalies`} />
                ) : (
                  <StatusBadge tone="active" variant="chip" label="clean" />
                )}
                <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleLoad(s)}
                    disabled={busy}
                    data-testid={`scenario-load-${s.id}`}
                  >
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openRename(s)}
                    disabled={busy}
                    data-testid={`scenario-rename-${s.id}`}
                  >
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setCancelTarget(s)}
                    disabled={busy}
                    data-testid={`scenario-cancel-${s.id}`}
                  >
                    Cancel
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <FormModal
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        onSubmit={submitSave}
        title="Save scenario"
        submitLabel={saving ? 'Saving…' : 'Save'}
        submitDisabled={!saveName.trim() || saving}
        testId="save-scenario"
      >
        <FormField label="Scenario name">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Scenario name"
            autoFocus
          />
        </FormField>
      </FormModal>

      <FormModal
        open={renameTarget !== null}
        onCancel={() => setRenameTarget(null)}
        onSubmit={submitRename}
        title="Rename scenario"
        submitLabel="Save"
        submitDisabled={!renameValue.trim()}
        testId="rename-scenario"
      >
        <FormField label="Scenario name">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Scenario name"
            autoFocus
          />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel this scenario?"
        message={
          cancelTarget
            ? `Cancel "${cancelTarget.name}"? It will be removed from your scenario list.`
            : ''
        }
        confirmLabel="Cancel scenario"
        tone="danger"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
