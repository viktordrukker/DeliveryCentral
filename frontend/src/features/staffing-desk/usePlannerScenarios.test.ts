import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PlannerScenarioDto } from '@/lib/api/planner-scenarios';
import { usePlannerScenarios } from './usePlannerScenarios';

const listScenarios = vi.fn();
const createScenario = vi.fn();
const updateScenario = vi.fn();
const deleteScenario = vi.fn();

vi.mock('@/lib/api/planner-scenarios', () => ({
  listScenarios: (...args: unknown[]) => listScenarios(...args),
  createScenario: (...args: unknown[]) => createScenario(...args),
  updateScenario: (...args: unknown[]) => updateScenario(...args),
  deleteScenario: (...args: unknown[]) => deleteScenario(...args),
}));

const baseScenario: PlannerScenarioDto = {
  id: 's1',
  ownerId: 'me',
  name: 'Plan A',
  description: null,
  state: { proposedAssignments: [], baselineSnapshotId: null },
  summary: { assignments: 0, hires: 0, releases: 0, extensions: 0, anomalies: 0 },
  archivedAt: null,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-02T00:00:00Z',
};

describe('usePlannerScenarios', () => {
  it('loads scenarios on mount and selects the first as active', async () => {
    const scenarios = [baseScenario, { ...baseScenario, id: 's2', name: 'Plan B' }];
    listScenarios.mockResolvedValue(scenarios);

    const { result } = renderHook(() => usePlannerScenarios());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listScenarios).toHaveBeenCalledWith({ ownedByMe: true });
    expect(result.current.scenarios).toEqual(scenarios);
    expect(result.current.activeId).toBe('s1');
    expect(result.current.active?.name).toBe('Plan A');
  });

  it('captures errors on load failure', async () => {
    listScenarios.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePlannerScenarios());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.scenarios).toBeNull();
  });

  it('skips auto-load when autoLoad=false', async () => {
    listScenarios.mockResolvedValue([baseScenario]);
    const { result } = renderHook(() => usePlannerScenarios({ autoLoad: false }));

    expect(result.current.loading).toBe(false);
    expect(listScenarios).not.toHaveBeenCalled();
    expect(result.current.scenarios).toBeNull();
  });

  it('save() POSTs a new scenario and refreshes the list', async () => {
    listScenarios.mockResolvedValueOnce([]);
    const created: PlannerScenarioDto = { ...baseScenario, id: 'new', name: 'Fresh' };
    createScenario.mockResolvedValue(created);
    listScenarios.mockResolvedValueOnce([created]);

    const { result } = renderHook(() => usePlannerScenarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ name: 'Fresh' });
    });

    expect(createScenario).toHaveBeenCalledWith({
      name: 'Fresh',
      state: { proposedAssignments: [] },
    });
    expect(result.current.activeId).toBe('new');
    expect(result.current.scenarios?.[0].id).toBe('new');
  });

  it('rename() PATCHes the scenario name', async () => {
    listScenarios.mockResolvedValueOnce([baseScenario]);
    const renamed: PlannerScenarioDto = { ...baseScenario, name: 'Renamed' };
    updateScenario.mockResolvedValue(renamed);
    listScenarios.mockResolvedValueOnce([renamed]);

    const { result } = renderHook(() => usePlannerScenarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.rename('s1', 'Renamed');
    });

    expect(updateScenario).toHaveBeenCalledWith('s1', { name: 'Renamed' });
    expect(result.current.scenarios?.[0].name).toBe('Renamed');
  });

  it('cancel() DELETEs and clears activeId when the active one is cancelled', async () => {
    listScenarios.mockResolvedValueOnce([baseScenario]);
    deleteScenario.mockResolvedValue(undefined);
    listScenarios.mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePlannerScenarios());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeId).toBe('s1');

    await act(async () => {
      await result.current.cancel('s1');
    });

    expect(deleteScenario).toHaveBeenCalledWith('s1');
    expect(result.current.activeId).toBeNull();
    expect(result.current.scenarios).toEqual([]);
  });

  it('keeps the existing activeId when reload returns it', async () => {
    const second: PlannerScenarioDto = { ...baseScenario, id: 's2', name: 'Plan B' };
    listScenarios.mockResolvedValueOnce([baseScenario, second]);

    const { result } = renderHook(() => usePlannerScenarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setActiveId('s2'));
    expect(result.current.activeId).toBe('s2');

    listScenarios.mockResolvedValueOnce([baseScenario, second]);
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.activeId).toBe('s2');
  });
});
