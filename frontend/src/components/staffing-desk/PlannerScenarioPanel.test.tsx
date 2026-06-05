import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { PlannerScenarioDto } from '@/lib/api/planner-scenarios';
import { renderRoute } from '@test/render-route';
import { PlannerScenarioPanel } from './PlannerScenarioPanel';

const listScenarios = vi.fn();
const createScenario = vi.fn();
const updateScenario = vi.fn();
const deleteScenario = vi.fn();
const getScenario = vi.fn();

vi.mock('@/lib/api/planner-scenarios', () => ({
  listScenarios: (...args: unknown[]) => listScenarios(...args),
  createScenario: (...args: unknown[]) => createScenario(...args),
  updateScenario: (...args: unknown[]) => updateScenario(...args),
  deleteScenario: (...args: unknown[]) => deleteScenario(...args),
  getScenario: (...args: unknown[]) => getScenario(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const scenarios: PlannerScenarioDto[] = [
  {
    id: 's1',
    ownerId: 'me',
    name: 'Plan A',
    description: 'First',
    state: { proposedAssignments: [], baselineSnapshotId: null },
    summary: { assignments: 4, hires: 2, releases: 1, extensions: 1, anomalies: 0 },
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
  },
  {
    id: 's2',
    ownerId: 'me',
    name: 'Plan B',
    description: null,
    state: { proposedAssignments: [], baselineSnapshotId: null },
    summary: { assignments: 6, hires: 1, releases: 0, extensions: 5, anomalies: 2 },
    archivedAt: null,
    createdAt: '2026-06-03T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  },
];

describe('PlannerScenarioPanel', () => {
  it('renders the saved scenarios list with summary chips', async () => {
    listScenarios.mockResolvedValue(scenarios);
    renderRoute(<PlannerScenarioPanel />);

    await waitFor(() => expect(screen.getByTestId('planner-scenario-list')).toBeInTheDocument());
    expect(screen.getByText('Plan A')).toBeInTheDocument();
    expect(screen.getByText('Plan B')).toBeInTheDocument();
    expect(screen.getByText('clean')).toBeInTheDocument();
    expect(screen.getByText('2 anomalies')).toBeInTheDocument();
  });

  it('shows the empty state with a save action when there are no scenarios', async () => {
    listScenarios.mockResolvedValue([]);
    renderRoute(<PlannerScenarioPanel />);

    await waitFor(() => expect(screen.getByText('No scenarios saved yet')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /Save current/ }).length).toBeGreaterThan(0);
  });

  it('Save current opens a modal and POSTs the typed name + current state', async () => {
    listScenarios.mockResolvedValueOnce([]);
    const created: PlannerScenarioDto = { ...scenarios[0], id: 'new', name: 'My plan' };
    createScenario.mockResolvedValue(created);
    listScenarios.mockResolvedValueOnce([created]);

    const user = userEvent.setup();
    const current = {
      proposedAssignments: [
        { positionId: 'p1', personId: 'u1', startDate: '2026-06-01', endDate: '2026-06-30', allocationPercent: 50 },
      ],
    };
    renderRoute(<PlannerScenarioPanel currentState={current} />);

    await waitFor(() => expect(screen.getByText('No scenarios saved yet')).toBeInTheDocument());

    await user.click(screen.getByTestId('scenario-save'));
    const input = await screen.findByDisplayValue('Scenario 1');
    await user.clear(input);
    await user.type(input, 'My plan');
    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() =>
      expect(createScenario).toHaveBeenCalledWith({
        name: 'My plan',
        state: current,
      }),
    );
  });

  it('Load fetches the scenario detail and calls onLoad', async () => {
    listScenarios.mockResolvedValue(scenarios);
    const detail: PlannerScenarioDto = {
      ...scenarios[0],
      state: {
        proposedAssignments: [
          { positionId: 'p1', personId: 'u1', startDate: '2026-06-01', endDate: '2026-06-30', allocationPercent: 75 },
        ],
        baselineSnapshotId: null,
      },
    };
    getScenario.mockResolvedValue(detail);
    const onLoad = vi.fn();

    const user = userEvent.setup();
    renderRoute(<PlannerScenarioPanel onLoad={onLoad} />);

    await waitFor(() => expect(screen.getByTestId('planner-scenario-list')).toBeInTheDocument());
    await user.click(screen.getByTestId('scenario-load-s1'));

    await waitFor(() => expect(getScenario).toHaveBeenCalledWith('s1'));
    expect(onLoad).toHaveBeenCalledWith(detail);
  });

  it('Cancel opens the confirm dialog and DELETEs on confirm', async () => {
    listScenarios.mockResolvedValueOnce(scenarios);
    deleteScenario.mockResolvedValue(undefined);
    listScenarios.mockResolvedValueOnce([scenarios[1]]);

    const user = userEvent.setup();
    renderRoute(<PlannerScenarioPanel />);

    await waitFor(() => expect(screen.getByTestId('planner-scenario-list')).toBeInTheDocument());
    await user.click(screen.getByTestId('scenario-cancel-s1'));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Cancel scenario/ }));

    await waitFor(() => expect(deleteScenario).toHaveBeenCalledWith('s1'));
  });

  it('Rename PATCHes the new name', async () => {
    listScenarios.mockResolvedValueOnce(scenarios);
    const updated: PlannerScenarioDto = { ...scenarios[0], name: 'Plan A v2' };
    updateScenario.mockResolvedValue(updated);
    listScenarios.mockResolvedValueOnce([updated, scenarios[1]]);

    const user = userEvent.setup();
    renderRoute(<PlannerScenarioPanel />);

    await waitFor(() => expect(screen.getByTestId('planner-scenario-list')).toBeInTheDocument());
    await user.click(screen.getByTestId('scenario-rename-s1'));

    const input = await screen.findByDisplayValue('Plan A');
    await user.clear(input);
    await user.type(input, 'Plan A v2');
    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => expect(updateScenario).toHaveBeenCalledWith('s1', { name: 'Plan A v2' }));
  });

  it('shows error state when list fails', async () => {
    listScenarios.mockRejectedValue(new Error('list-failed'));
    renderRoute(<PlannerScenarioPanel />);

    await waitFor(() => expect(screen.getByText(/list-failed/)).toBeInTheDocument());
  });
});
