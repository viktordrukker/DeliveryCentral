import { useEffect, useState } from 'react';
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
  type SolverStrategy,
  applyScenario,
  createScenario,
  deleteScenario,
  listScenarios,
  runSolver,
} from '@/lib/api/planner-scenarios';

const STRATEGIES: { id: SolverStrategy; label: string; hint: string }[] = [
  { id: 'BALANCED', label: 'Balanced', hint: 'Fairness + utilization + bench drain' },
  { id: 'BEST_FIT', label: 'Best fit', hint: 'Highest skill/role match' },
  { id: 'UTILIZE_BENCH', label: 'Use bench', hint: 'Prefer people currently on bench' },
  { id: 'CHEAPEST', label: 'Cheapest', hint: 'Minimize cost rate' },
  { id: 'GROWTH', label: 'Growth', hint: 'Stretch assignments for grade growth' },
];

interface DistributionStudioProps {
  /** When true, surfaces destructive actions (delete / apply). */
  canEdit?: boolean;
}

/**
 * Phase B4 — Distribution Studio (planner scenarios surface).
 *
 * Backed by:
 *   GET    /api/staffing/scenarios          — list
 *   POST   /api/staffing/scenarios          — create
 *   DELETE /api/staffing/scenarios/:id      — soft-delete (archive)
 *   POST   /api/staffing/solver/run         — solver (5 strategies)
 *   POST   /api/staffing/scenarios/:id/apply — transactional apply
 *
 * v1 surfaces the scenarios list + create + delete + solver-run + apply
 * actions. The editable swimlane Timeline + JQL filter bar are tracked as
 * follow-ups (Phase B4.2+); they require the Timeline editable-mode
 * upgrade which is a separate change.
 *
 * Reference: DS/page-staffing-desk.jsx — Planner view.
 */
export function DistributionStudio({ canEdit = false }: DistributionStudioProps): JSX.Element {
  const [scenarios, setScenarios] = useState<PlannerScenarioDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [strategy, setStrategy] = useState<SolverStrategy>('BALANCED');
  const [solverOutput, setSolverOutput] = useState<{ score: number; explanation: string } | null>(null);
  // V2-C.14 DS-conformance — replaced the browser scenario-name prompt with a DS FormModal.
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  // S1-5 DS-conformance — replaced two browser confirm() calls with ConfirmDialog.
  // Pending state tracks which destructive action is awaiting confirmation.
  const [deleteCandidate, setDeleteCandidate] = useState<PlannerScenarioDto | null>(null);
  const [applyPending, setApplyPending] = useState<PlannerScenarioDto | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const rows = await listScenarios({ ownedByMe: true });
      setScenarios(rows);
      if (rows.length > 0 && !activeId) setActiveId(rows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = scenarios?.find((s) => s.id === activeId) ?? null;

  function openCreate(): void {
    setNewName(`Scenario ${(scenarios?.length ?? 0) + 1}`);
    setCreateOpen(true);
  }

  async function submitCreate(): Promise<void> {
    const name = newName.trim();
    if (!name) return;
    const created = await createScenario({
      name,
      state: { proposedAssignments: [] },
    });
    setActiveId(created.id);
    setCreateOpen(false);
    toast.success(`Scenario "${created.name}" created`);
    await reload();
  }

  async function confirmDelete(scenario: PlannerScenarioDto): Promise<void> {
    setDeleteCandidate(null);
    setBusy(true);
    try {
      await deleteScenario(scenario.id);
      if (activeId === scenario.id) setActiveId(null);
      toast.success('Scenario archived');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunSolver(): Promise<void> {
    if (!active) return;
    setBusy(true);
    setSolverOutput(null);
    try {
      const result = await runSolver({ scenarioId: active.id, strategy });
      setSolverOutput({ score: result.score, explanation: result.explanation });
      toast.success(`Solver (${strategy}) proposed ${result.proposedSegmentChanges.length} changes`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Solver failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmApply(scenario: PlannerScenarioDto): Promise<void> {
    setApplyPending(null);
    setBusy(true);
    try {
      const result = await applyScenario(scenario.id);
      toast.success(
        `Applied: +${result.assignmentsCreated} · ~${result.assignmentsUpdated} · −${result.assignmentsReleased}`,
      );
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState variant="skeleton" skeletonType="cards" />;
  if (error) return <ErrorState description={error} onRetry={() => void reload()} />;

  return (
    <div data-testid="distribution-studio" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Scenarios ({scenarios?.length ?? 0})</span>
            <Button size="sm" onClick={openCreate} disabled={busy}>
              + New scenario
            </Button>
          </span>
        }
      >
        {!scenarios || scenarios.length === 0 ? (
          <EmptyState
            title="No scenarios yet"
            description="Create a new scenario to draft proposed assignments without affecting live staffing."
          />
        ) : (
          <ul
            data-testid="scenarios-list"
            style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {scenarios.map((s) => (
              <li
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px 80px 80px 70px',
                  gap: 8,
                  padding: '6px 10px',
                  alignItems: 'center',
                  background:
                    s.id === activeId ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  borderLeft:
                    s.id === activeId
                      ? '3px solid var(--color-accent)'
                      : '3px solid var(--color-border)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={() => setActiveId(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setActiveId(s.id);
                }}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{s.name}</span>
                  {s.description ? (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {s.description}
                    </span>
                  ) : null}
                </div>
                <span style={{ fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  +{s.summary.hires}
                </span>
                <span style={{ fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  −{s.summary.releases}
                </span>
                <span style={{ fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  ~{s.summary.extensions}
                </span>
                {s.summary.anomalies > 0 ? (
                  <StatusBadge tone="warning" variant="chip" label={`${s.summary.anomalies} anomalies`} />
                ) : (
                  <StatusBadge tone="active" variant="chip" label="clean" />
                )}
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCandidate(s);
                    }}
                    disabled={busy}
                  >
                    Archive
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {active ? (
        <SectionCard title={`Solver — ${active.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STRATEGIES.map((s) => {
                const isActive = s.id === strategy;
                return (
                  <Button
                    key={s.id}
                    size="xs"
                    variant={isActive ? 'primary' : 'secondary'}
                    onClick={() => setStrategy(s.id)}
                    title={s.hint}
                    aria-pressed={isActive}
                    style={{ borderRadius: 999 }}
                  >
                    {s.label}
                  </Button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={handleRunSolver} disabled={busy}>
                Run solver ({strategy})
              </Button>
              {canEdit && active ? (
                <Button variant="primary" onClick={() => setApplyPending(active)} disabled={busy}>
                  Apply scenario to live
                </Button>
              ) : null}
            </div>
            {solverOutput ? (
              <div
                data-testid="solver-output"
                style={{
                  padding: 12,
                  background: 'var(--color-surface-alt)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>Solver score</strong>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{solverOutput.score.toFixed(2)}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {solverOutput.explanation}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <ConfirmDialog
        open={deleteCandidate !== null}
        title="Archive this scenario?"
        message={
          deleteCandidate
            ? `Archive "${deleteCandidate.name}"? You can recreate it later but the current scenario state is lost.`
            : ''
        }
        confirmLabel="Archive"
        tone="danger"
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) void confirmDelete(deleteCandidate);
        }}
      />

      <ConfirmDialog
        open={applyPending !== null}
        title="Apply scenario to live assignments?"
        message={
          applyPending
            ? `Apply "${applyPending.name}" to real assignments? This is transactional — all proposed changes commit together or none do.`
            : ''
        }
        confirmLabel="Apply scenario"
        tone="danger"
        onCancel={() => setApplyPending(null)}
        onConfirm={() => {
          if (applyPending) void confirmApply(applyPending);
        }}
      />

      <FormModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSubmit={submitCreate}
        title="New scenario"
        submitLabel="Create"
        submitDisabled={!newName.trim()}
        testId="create-scenario"
      >
        <FormField label="Scenario name">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name"
            autoFocus
          />
        </FormField>
      </FormModal>
    </div>
  );
}
