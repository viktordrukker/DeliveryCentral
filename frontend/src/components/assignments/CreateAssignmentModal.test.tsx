import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';

import { CreateAssignmentModal, type AssignmentModalPreFill } from './CreateAssignmentModal';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'actor-pm-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Heavy data children — not under test here.
vi.mock('@/components/staffing-desk/WorkloadTimeline', () => ({
  WorkloadTimeline: () => <div data-testid="workload-timeline" />,
}));
vi.mock('@/components/assignments/UtilisationPeek', () => ({
  UtilisationPeek: () => <div data-testid="utilisation-peek" />,
}));

const mockCreateAndBookPosition = vi.fn();
const mockCreateProjectPosition = vi.fn();

vi.mock('@/lib/api/project-positions', () => ({
  createAndBookPosition: (req: unknown) => mockCreateAndBookPosition(req),
  createProjectPosition: (req: unknown) => mockCreateProjectPosition(req),
}));

function buildPreFill(over: Partial<AssignmentModalPreFill> = {}): AssignmentModalPreFill {
  return {
    contextDate: null,
    contextHours: null,
    personId: 'person-1',
    personName: 'Olivia Chen',
    personStatus: 'ACTIVE',
    personTerminatedAt: null,
    projectId: 'proj-1',
    projectName: 'Apollo',
    ...over,
  };
}

function fillForm(): void {
  const roleSelect = document.querySelector('select') as HTMLSelectElement;
  fireEvent.change(roleSelect, { target: { value: '__custom__' } });
  fireEvent.change(screen.getByPlaceholderText('Enter custom role'), {
    target: { value: 'Engineer' },
  });
  const dateInputs = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });
  fireEvent.change(dateInputs[1], { target: { value: '2026-09-30' } });
}

describe('CreateAssignmentModal — atomic create-and-book', () => {
  beforeEach(() => {
    mockCreateAndBookPosition.mockReset();
    mockCreateProjectPosition.mockReset();
  });

  it('"Create & Book" sends one atomic createAndBookPosition request', async () => {
    mockCreateAndBookPosition.mockResolvedValue({
      id: 'pos-1', projectId: 'proj-1', role: 'Engineer',
      requiredAllocationPercent: 100, fillStatus: 'BOOKED', version: 3,
    });
    const onSuccess = vi.fn();
    const { user } = renderRoute(
      <CreateAssignmentModal open preFill={buildPreFill()} onSuccess={onSuccess} onCancel={() => {}} />,
    );

    fillForm();
    await user.click(screen.getByRole('button', { name: 'Create & Book' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockCreateAndBookPosition).toHaveBeenCalledTimes(1);
    expect(mockCreateAndBookPosition).toHaveBeenCalledWith({
      projectId: 'proj-1',
      personId: 'person-1',
      role: 'Engineer',
      allocationPercent: 100,
      startDate: '2026-07-01',
      endDate: '2026-09-30',
    });
    expect(mockCreateProjectPosition).not.toHaveBeenCalled();
    expect(onSuccess.mock.calls[0][0]).toMatchObject({ id: 'pos-1', fillStatus: 'BOOKED' });
  }, 15000);

  it('a failed booking surfaces the error and creates nothing on the draft path', async () => {
    mockCreateAndBookPosition.mockRejectedValue(new Error('Person does not exist.'));
    const onSuccess = vi.fn();
    const { user } = renderRoute(
      <CreateAssignmentModal open preFill={buildPreFill()} onSuccess={onSuccess} onCancel={() => {}} />,
    );

    fillForm();
    await user.click(screen.getByRole('button', { name: 'Create & Book' }));

    await waitFor(() => expect(screen.getByText('Person does not exist.')).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockCreateProjectPosition).not.toHaveBeenCalled();
  }, 15000);

  it('"Save Draft" keeps the plain create with openImmediately=false', async () => {
    mockCreateProjectPosition.mockResolvedValue({
      id: 'pos-2', projectId: 'proj-1', role: 'Engineer',
      requiredAllocationPercent: 100, fillStatus: 'DRAFT', version: 1,
    });
    const onSuccess = vi.fn();
    const { user } = renderRoute(
      <CreateAssignmentModal open preFill={buildPreFill()} onSuccess={onSuccess} onCancel={() => {}} />,
    );

    fillForm();
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockCreateProjectPosition).toHaveBeenCalledWith(
      expect.objectContaining({ openImmediately: false }),
    );
    expect(mockCreateAndBookPosition).not.toHaveBeenCalled();
  }, 15000);
});
