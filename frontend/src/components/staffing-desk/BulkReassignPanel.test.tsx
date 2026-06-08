import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { BulkReassignPanel } from './BulkReassignPanel';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';

const bulkReassignPositions = vi.fn();
const fetchPersonDirectory = vi.fn();
const fetchProjectDirectory = vi.fn();

vi.mock('@/lib/api/project-positions', () => ({
  bulkReassignPositions: (...a: unknown[]) => bulkReassignPositions(...a),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: (...a: unknown[]) => fetchPersonDirectory(...a),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: (...a: unknown[]) => fetchProjectDirectory(...a),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeRow(overrides: Partial<StaffingDeskRow> = {}): StaffingDeskRow {
  return {
    id: 'pos-1',
    positionPublicId: null,
    kind: 'assignment',
    projectId: 'proj-1',
    projectName: 'Project Alpha',
    role: 'Engineer',
    allocationPercent: 100,
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    status: 'BOOKED',
    statusGroup: 'active',
    createdAt: '2026-05-01T00:00:00Z',
    personId: 'p-1',
    personName: 'Alice',
    assignmentCode: null,
    personAssignments: [],
    personGrade: null,
    personRole: null,
    personEmail: null,
    personOrgUnit: null,
    personManager: null,
    personPool: null,
    personSkills: [],
    personEmploymentStatus: null,
    priority: null,
    skills: [],
    headcountRequired: null,
    headcountFulfilled: null,
    requestedByName: null,
    summary: null,
    ...overrides,
  };
}

describe('BulkReassignPanel (LEAN-P4-missing-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPersonDirectory.mockResolvedValue({
      items: [
        { id: 'p-2', displayName: 'Bob', role: 'Senior Engineer' },
        { id: 'p-3', displayName: 'Carol', role: 'PM' },
      ],
      page: 1,
      pageSize: 500,
      total: 2,
    });
    fetchProjectDirectory.mockResolvedValue({
      items: [
        { id: 'proj-2', projectCode: 'PRJ-002', name: 'Project Beta', status: 'ACTIVE' },
      ],
      page: 1,
      pageSize: 200,
      total: 1,
    });
    bulkReassignPositions.mockResolvedValue({
      reassigned: 1,
      positionIds: ['pos-1'],
      errors: [],
    });
  });

  it('renders nothing when no eligible rows', () => {
    const { container } = render(
      <BulkReassignPanel items={[makeRow({ status: 'RELEASED' })]} onApplied={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders eligible assignment rows with checkboxes', () => {
    render(
      <BulkReassignPanel
        items={[makeRow({ id: 'pos-1' }), makeRow({ id: 'pos-2', personName: 'Bob' })]}
        onApplied={vi.fn()}
      />,
    );
    expect(screen.getByTestId('bulk-reassign-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-reassign-row-1')).toBeInTheDocument();
  });

  it('does not leak raw position UUIDs in data-testid attributes', () => {
    const { container } = render(
      <BulkReassignPanel
        items={[
          makeRow({ id: '550e8400-e29b-41d4-a716-446655440000' }),
          makeRow({ id: '550e8400-e29b-41d4-a716-446655440001' }),
        ]}
        onApplied={vi.fn()}
      />,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/550e8400-e29b-41d4-a716/);
    expect(screen.getByTestId('bulk-reassign-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-reassign-row-1')).toBeInTheDocument();
  });

  it('Reassign button stays disabled until at least one row is checked', async () => {
    const user = userEvent.setup();
    render(
      <BulkReassignPanel items={[makeRow({ id: 'pos-1' })]} onApplied={vi.fn()} />,
    );
    expect(screen.getByTestId('bulk-reassign-open')).toBeDisabled();
    await user.click(screen.getByTestId('bulk-reassign-row-0'));
    expect(screen.getByTestId('bulk-reassign-open')).not.toBeDisabled();
  });

  it('toggle-all checkbox selects every eligible row', async () => {
    const user = userEvent.setup();
    render(
      <BulkReassignPanel
        items={[makeRow({ id: 'pos-1' }), makeRow({ id: 'pos-2' })]}
        onApplied={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId('bulk-reassign-select-all'));
    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
  });

  it('selecting rows + picking a person submits the bulk request', async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    render(
      <BulkReassignPanel
        items={[makeRow({ id: 'pos-1' }), makeRow({ id: 'pos-2' })]}
        onApplied={onApplied}
      />,
    );

    await user.click(screen.getByTestId('bulk-reassign-row-0'));
    await user.click(screen.getByTestId('bulk-reassign-row-1'));
    await user.click(screen.getByTestId('bulk-reassign-open'));

    // Wait for the directories to load inside the modal.
    await waitFor(() =>
      expect(screen.getByTestId('bulk-reassign-person-select')).toBeInTheDocument(),
    );
    await user.selectOptions(screen.getByTestId('bulk-reassign-person-select'), 'p-2');
    await user.type(screen.getByTestId('bulk-reassign-reason'), 'team reshuffle');
    await user.click(screen.getByRole('button', { name: /^Apply$/ }));

    await waitFor(() =>
      expect(bulkReassignPositions).toHaveBeenCalledWith({
        positionIds: ['pos-1', 'pos-2'],
        toPersonId: 'p-2',
        reason: 'team reshuffle',
      }),
    );
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
  });

  it('blocks submission when neither person nor project is picked', async () => {
    const user = userEvent.setup();
    render(
      <BulkReassignPanel items={[makeRow({ id: 'pos-1' })]} onApplied={vi.fn()} />,
    );
    await user.click(screen.getByTestId('bulk-reassign-row-0'));
    await user.click(screen.getByTestId('bulk-reassign-open'));
    await waitFor(() =>
      expect(screen.getByTestId('bulk-reassign-person-select')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /^Apply$/ }));
    expect(
      await screen.findByText(/Pick a new person, a new project, or both/),
    ).toBeInTheDocument();
    expect(bulkReassignPositions).not.toHaveBeenCalled();
  });

  it('moves to a different project when a project is selected', async () => {
    const user = userEvent.setup();
    render(
      <BulkReassignPanel items={[makeRow({ id: 'pos-1' })]} onApplied={vi.fn()} />,
    );
    await user.click(screen.getByTestId('bulk-reassign-row-0'));
    await user.click(screen.getByTestId('bulk-reassign-open'));
    await waitFor(() =>
      expect(screen.getByTestId('bulk-reassign-project-select')).toBeInTheDocument(),
    );
    await user.selectOptions(screen.getByTestId('bulk-reassign-project-select'), 'proj-2');
    await user.click(screen.getByRole('button', { name: /^Apply$/ }));

    await waitFor(() =>
      expect(bulkReassignPositions).toHaveBeenCalledWith({
        positionIds: ['pos-1'],
        toProjectId: 'proj-2',
      }),
    );
  });

  it('unassign option submits toPersonId: null', async () => {
    const user = userEvent.setup();
    render(
      <BulkReassignPanel items={[makeRow({ id: 'pos-1' })]} onApplied={vi.fn()} />,
    );
    await user.click(screen.getByTestId('bulk-reassign-row-0'));
    await user.click(screen.getByTestId('bulk-reassign-open'));
    await waitFor(() =>
      expect(screen.getByTestId('bulk-reassign-person-select')).toBeInTheDocument(),
    );
    await user.selectOptions(
      screen.getByTestId('bulk-reassign-person-select'),
      '__unassign__',
    );
    await user.click(screen.getByRole('button', { name: /^Apply$/ }));
    await waitFor(() =>
      expect(bulkReassignPositions).toHaveBeenCalledWith({
        positionIds: ['pos-1'],
        toPersonId: null,
      }),
    );
  });
});
