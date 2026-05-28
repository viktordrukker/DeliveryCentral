import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PlannerScenariosMenu } from './PlannerScenariosMenu';
import type { PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';

const listPlannerScenarios = vi.fn();
const createPlannerScenario = vi.fn();
const getPlannerScenario = vi.fn();
const archivePlannerScenario = vi.fn();

vi.mock('@/lib/api/staffing-desk', () => ({
  listPlannerScenarios: (...a: unknown[]) => listPlannerScenarios(...a),
  createPlannerScenario: (...a: unknown[]) => createPlannerScenario(...a),
  getPlannerScenario: (...a: unknown[]) => getPlannerScenario(...a),
  archivePlannerScenario: (...a: unknown[]) => archivePlannerScenario(...a),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({ principal: { personId: 'me', roles: ['resource_manager'] } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeSimulation(overrides: Partial<PlannerSimulation> = {}): PlannerSimulation {
  return {
    moves: [],
    suggestions: [],
    hireIntents: [],
    releases: [],
    extensions: [],
    hasChanges: true,
    serialize: () => ({ proposedAssignments: [] }) as never,
    getAnomalies: () => [],
    loadState: vi.fn(),
    ...overrides,
  } as unknown as PlannerSimulation;
}

describe('PlannerScenariosMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPlannerScenarios.mockResolvedValue([]);
  });

  it('"Save current" opens a DS modal (not window.prompt) and creates with the typed name', async () => {
    createPlannerScenario.mockResolvedValue({ id: 'new' });
    const promptSpy = vi.spyOn(window, 'prompt');
    const user = userEvent.setup();
    render(
      <PlannerScenariosMenu simulation={makeSimulation()} horizonFrom="2026-06-01" horizonWeeks={13} onLoaded={vi.fn()} />,
    );

    await user.click(screen.getByTestId('scenarios-menu-toggle'));
    await user.click(screen.getByRole('button', { name: /Save current/ }));

    const input = await screen.findByPlaceholderText('Scenario name');
    await user.type(input, 'Q4 plan');
    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() =>
      expect(createPlannerScenario).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'me', name: 'Q4 plan', horizonFrom: '2026-06-01', horizonWeeks: 13 }),
      ),
    );
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('"Fork" pre-fills "<name> (copy)" and forks the source scenario', async () => {
    listPlannerScenarios.mockResolvedValue([
      {
        id: 's1', name: 'Baseline', createdByName: 'RM', updatedAt: '2026-05-20T00:00:00Z',
        summaryAssignments: 3, summaryHires: 1, summaryReleases: 0, summaryExtensions: 2, summaryAnomalies: 0,
      },
    ]);
    getPlannerScenario.mockResolvedValue({
      id: 's1', state: { proposedAssignments: [] },
      summaryAssignments: 3, summaryHires: 1, summaryReleases: 0, summaryExtensions: 2, summaryAnomalies: 0,
      horizonFrom: '2026-06-01', horizonWeeks: 13,
    });
    createPlannerScenario.mockResolvedValue({ id: 'fork' });
    const user = userEvent.setup();
    render(
      <PlannerScenariosMenu simulation={makeSimulation()} horizonFrom="2026-06-01" horizonWeeks={13} onLoaded={vi.fn()} />,
    );

    await user.click(screen.getByTestId('scenarios-menu-toggle'));
    await user.click(await screen.findByRole('button', { name: /^Fork$/ }));

    // Pre-filled with the source name + "(copy)". Submit via Enter in the
    // input to avoid ambiguity with the row's own "Fork" button.
    const forkInput = await screen.findByDisplayValue('Baseline (copy)');
    await user.type(forkInput, '{Enter}');

    await waitFor(() =>
      expect(createPlannerScenario).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Baseline (copy)', description: 'Forked from Baseline' }),
      ),
    );
  });
});
