import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';

import { BatchAssignmentConfirmModal, type BatchPositionCreationResponse } from './BatchAssignmentConfirmModal';
import type { AssignmentModalPreFill } from './CreateAssignmentModal';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'actor-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockCreateAndBookPosition = vi.fn();

vi.mock('@/lib/api/project-positions', () => ({
  createAndBookPosition: (req: unknown) => mockCreateAndBookPosition(req),
}));

function buildItem(over: Partial<AssignmentModalPreFill> = {}): AssignmentModalPreFill {
  return {
    contextDate: null,
    contextHours: null,
    personId: 'person-1',
    personName: 'Olivia Chen',
    projectId: 'proj-1',
    projectName: 'Apollo',
    ...over,
  };
}

async function fillAndSubmit(user: ReturnType<typeof renderRoute>['user']): Promise<void> {
  const roleSelect = document.querySelector('select') as HTMLSelectElement;
  fireEvent.change(roleSelect, { target: { value: '__custom__' } });
  const customRole = await screen.findByPlaceholderText('Enter custom role');
  fireEvent.change(customRole, { target: { value: 'Engineer' } });
  const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: '2026-07-01' } });
  const submit = await screen.findByRole('button', { name: /Create \d+ Position/ });
  await waitFor(() => expect(submit).not.toBeDisabled());
  await user.click(submit);
}

describe('BatchAssignmentConfirmModal — atomic create-and-book fan-out', () => {
  beforeEach(() => {
    mockCreateAndBookPosition.mockReset();
  });

  it('calls createAndBookPosition once per row with the shared role/allocation/date', async () => {
    mockCreateAndBookPosition.mockResolvedValue({
      id: 'pos-1', projectId: 'proj-1', role: 'Engineer',
      requiredAllocationPercent: 100, fillStatus: 'BOOKED', version: 3,
    });
    const onSuccess = vi.fn();
    const items = [
      buildItem({ personId: 'person-1' }),
      buildItem({ personId: 'person-2', personName: 'Mia Patel' }),
    ];

    const { user } = renderRoute(
      <BatchAssignmentConfirmModal open items={items} onCancel={() => {}} onSuccess={onSuccess} />,
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockCreateAndBookPosition).toHaveBeenCalledTimes(2);
    expect(mockCreateAndBookPosition).toHaveBeenCalledWith({
      projectId: 'proj-1',
      personId: 'person-1',
      role: 'Engineer',
      allocationPercent: 100,
      startDate: '2026-07-01',
      endDate: '2026-07-01',
    });
    const response = onSuccess.mock.calls[0][0] as BatchPositionCreationResponse;
    expect(response.createdCount).toBe(2);
    expect(response.failedCount).toBe(0);
  }, 15000);

  it('reports a failed row truthfully — position NOT created — and keeps the successes', async () => {
    mockCreateAndBookPosition
      .mockResolvedValueOnce({
        id: 'pos-1', projectId: 'proj-1', role: 'Engineer',
        requiredAllocationPercent: 100, fillStatus: 'BOOKED', version: 3,
      })
      .mockRejectedValueOnce(new Error('Person does not exist.'));
    const onSuccess = vi.fn();
    const items = [
      buildItem({ personId: 'person-1' }),
      buildItem({ personId: 'person-404', personName: 'Ghost Person' }),
    ];

    const { user } = renderRoute(
      <BatchAssignmentConfirmModal open items={items} onCancel={() => {}} onSuccess={onSuccess} />,
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const response = onSuccess.mock.calls[0][0] as BatchPositionCreationResponse;
    expect(response.createdCount).toBe(1);
    expect(response.failedCount).toBe(1);
    expect(response.failedItems[0].personId).toBe('person-404');
    expect(response.failedItems[0].message).toContain('Position not created');
  }, 15000);
});
