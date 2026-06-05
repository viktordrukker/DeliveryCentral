import { useCallback, useEffect, useState } from 'react';

import {
  type CreatePlannerScenarioRequest,
  type PlannerScenarioDto,
  type PlannerScenarioStateDto,
  type UpdatePlannerScenarioRequest,
  createScenario,
  deleteScenario,
  listScenarios,
  updateScenario,
} from '@/lib/api/planner-scenarios';

/**
 * LEAN-P4a-2 — Distribution Studio planner-scenario hook.
 *
 * Wraps the `/api/staffing/scenarios` CRUD surface (BE shipped via issue 224)
 * with a stable, panel-friendly API:
 *
 *   - list   → fetch user's scenarios (sorted by updatedAt desc by the BE)
 *   - save   → POST a new scenario from the current planner state
 *   - load   → fetch a single scenario by id (returns proposedAssignments)
 *   - rename → PATCH the scenario name
 *   - cancel → DELETE (soft-cancel → archivedAt set on the row)
 *
 * The hook owns: list, active selection, loading/error state.
 * Side-effects (toasts, modal flows) live in the panel that consumes it.
 */
export interface UsePlannerScenariosResult {
  scenarios: PlannerScenarioDto[] | null;
  loading: boolean;
  error: string | null;
  activeId: string | null;
  active: PlannerScenarioDto | null;
  setActiveId: (id: string | null) => void;
  reload: () => Promise<void>;
  save: (input: CreatePlannerScenarioRequest) => Promise<PlannerScenarioDto>;
  rename: (id: string, name: string) => Promise<PlannerScenarioDto>;
  patch: (id: string, body: UpdatePlannerScenarioRequest) => Promise<PlannerScenarioDto>;
  cancel: (id: string) => Promise<void>;
}

export interface UsePlannerScenariosOptions {
  /** When true (default), the list is filtered to scenarios owned by the caller. */
  ownedByMe?: boolean;
  /** When true (default), the hook fetches the list on mount. */
  autoLoad?: boolean;
}

export function usePlannerScenarios(
  options: UsePlannerScenariosOptions = {},
): UsePlannerScenariosResult {
  const ownedByMe = options.ownedByMe ?? true;
  const autoLoad = options.autoLoad ?? true;

  const [scenarios, setScenarios] = useState<PlannerScenarioDto[] | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listScenarios({ ownedByMe });
      setScenarios(rows);
      setActiveId((current) => {
        if (current && rows.some((r) => r.id === current)) return current;
        return rows.length > 0 ? rows[0].id : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, [ownedByMe]);

  useEffect(() => {
    if (!autoLoad) return;
    void reload();
  }, [autoLoad, reload]);

  const save = useCallback(
    async (input: CreatePlannerScenarioRequest): Promise<PlannerScenarioDto> => {
      const state: PlannerScenarioStateDto = input.state ?? { proposedAssignments: [] };
      const created = await createScenario({ ...input, state });
      await reload();
      setActiveId(created.id);
      return created;
    },
    [reload],
  );

  const patch = useCallback(
    async (id: string, body: UpdatePlannerScenarioRequest): Promise<PlannerScenarioDto> => {
      const updated = await updateScenario(id, body);
      await reload();
      return updated;
    },
    [reload],
  );

  const rename = useCallback(
    async (id: string, name: string): Promise<PlannerScenarioDto> => {
      return patch(id, { name });
    },
    [patch],
  );

  const cancel = useCallback(
    async (id: string): Promise<void> => {
      await deleteScenario(id);
      setActiveId((current) => (current === id ? null : current));
      await reload();
    },
    [reload],
  );

  const active = scenarios?.find((s) => s.id === activeId) ?? null;

  return {
    scenarios,
    loading,
    error,
    activeId,
    active,
    setActiveId,
    reload,
    save,
    rename,
    patch,
    cancel,
  };
}
