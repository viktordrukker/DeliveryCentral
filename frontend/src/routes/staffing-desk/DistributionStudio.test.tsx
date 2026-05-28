import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { DistributionStudio } from './DistributionStudio';
import type { PlannerScenarioDto } from '@/lib/api/planner-scenarios';

const listScenarios = vi.fn();
const createScenario = vi.fn();
const deleteScenario = vi.fn();
const runSolver = vi.fn();
const applyScenario = vi.fn();

vi.mock('@/lib/api/planner-scenarios', () => ({
  listScenarios: (...args: unknown[]) => listScenarios(...args),
  createScenario: (...args: unknown[]) => createScenario(...args),
  deleteScenario: (...args: unknown[]) => deleteScenario(...args),
  runSolver: (...args: unknown[]) => runSolver(...args),
  applyScenario: (...args: unknown[]) => applyScenario(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const sampleScenarios: PlannerScenarioDto[] = [
  {
    id: 's1',
    ownerId: 'me',
    name: 'Q3 ramp',
    description: 'Apollo + Atlas Q3',
    state: { proposedAssignments: [] },
    summary: { assignments: 4, hires: 2, releases: 1, extensions: 1, anomalies: 0 },
    archivedAt: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z',
  },
  {
    id: 's2',
    ownerId: 'me',
    name: 'Bench drain',
    description: null,
    state: { proposedAssignments: [] },
    summary: { assignments: 8, hires: 0, releases: 0, extensions: 8, anomalies: 3 },
    archivedAt: null,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-22T00:00:00Z',
  },
];

describe('DistributionStudio', () => {
  it('lists scenarios and selects the first as active', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByTestId('scenarios-list')).toBeInTheDocument());
    expect(screen.getByText('Q3 ramp')).toBeInTheDocument();
    expect(screen.getByText('Bench drain')).toBeInTheDocument();
  });

  it('shows "clean" badge when anomalies = 0, "N anomalies" otherwise', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByText('clean')).toBeInTheDocument());
    expect(screen.getByText('3 anomalies')).toBeInTheDocument();
  });

  it('renders all 5 solver strategy chips when a scenario is selected', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByTestId('scenarios-list')).toBeInTheDocument());
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Best fit')).toBeInTheDocument();
    expect(screen.getByText('Use bench')).toBeInTheDocument();
    expect(screen.getByText('Cheapest')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it('Run solver calls the API with the selected scenario + strategy', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    runSolver.mockResolvedValue({ proposedSegmentChanges: [], score: 0.82, explanation: 'OK' });
    const user = userEvent.setup();
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByTestId('scenarios-list')).toBeInTheDocument());
    await user.click(screen.getByText('Use bench'));
    await user.click(screen.getByRole('button', { name: /Run solver/ }));
    await waitFor(() =>
      expect(runSolver).toHaveBeenCalledWith({ scenarioId: 's1', strategy: 'UTILIZE_BENCH' }),
    );
  });

  it('shows solver score + explanation after a successful run', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    runSolver.mockResolvedValue({ proposedSegmentChanges: [], score: 0.91, explanation: 'Bench drained 80%' });
    const user = userEvent.setup();
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByTestId('scenarios-list')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Run solver/ }));
    await waitFor(() => expect(screen.getByTestId('solver-output')).toBeInTheDocument());
    expect(screen.getByText('0.91')).toBeInTheDocument();
    expect(screen.getByText('Bench drained 80%')).toBeInTheDocument();
  });

  it('shows empty-state when there are no scenarios', async () => {
    listScenarios.mockResolvedValue([]);
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByText('No scenarios yet')).toBeInTheDocument());
  });

  it('canEdit=true surfaces the Apply button', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    renderRoute(<DistributionStudio canEdit />);
    await waitFor(() => expect(screen.getByText('Q3 ramp')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Apply scenario to live/ })).toBeInTheDocument();
  });

  it('canEdit=false hides the Apply button', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByText('Q3 ramp')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Apply scenario to live/ })).not.toBeInTheDocument();
  });

  it('shows error state on list failure', async () => {
    listScenarios.mockRejectedValue(new Error('Boom'));
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });

  it('"+ New scenario" opens a DS modal (not window.prompt) and creates with the typed name', async () => {
    listScenarios.mockResolvedValue(sampleScenarios);
    createScenario.mockResolvedValue({ ...sampleScenarios[0], id: 's3', name: 'My plan' });
    const promptSpy = vi.spyOn(window, 'prompt');
    const user = userEvent.setup();
    renderRoute(<DistributionStudio />);
    await waitFor(() => expect(screen.getByTestId('scenarios-list')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /New scenario/ }));
    // Modal opens pre-filled with the next default name (2 existing → "Scenario 3").
    const input = await screen.findByDisplayValue('Scenario 3');
    await user.clear(input);
    await user.type(input, 'My plan');
    await user.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() =>
      expect(createScenario).toHaveBeenCalledWith({ name: 'My plan', state: { proposedAssignments: [] } }),
    );
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });
});
