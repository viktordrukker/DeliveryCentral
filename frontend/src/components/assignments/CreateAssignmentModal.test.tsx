import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { ApiError } from '@/lib/api/http-client';

import { CreateAssignmentModal, type AssignmentModalPreFill } from './CreateAssignmentModal';

let mockRoles: string[] = ['project_manager'];

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'actor-pm-1', roles: mockRoles },
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

vi.mock('@/lib/api/project-positions', async (importOriginal) => ({
  // Real module (incl. isOverallocationError) with the two network calls stubbed.
  ...(await importOriginal<typeof import('@/lib/api/project-positions')>()),
  createAndBookPosition: (req: unknown) => mockCreateAndBookPosition(req),
  createProjectPosition: (req: unknown) => mockCreateProjectPosition(req),
}));

const OVERALLOC_409 = new ApiError(
  'Over-allocation: person person-1 already has 80% active allocation in the overlapping window; ' +
    'this 100% booking would take them to 180%. RM/DM/admin can retry with allowOverallocation to override.',
  409,
);

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
    mockRoles = ['project_manager'];
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

  it('Σ-allocation 409 offers RM "Override and book anyway" and retries with allowOverallocation (PR-14 Decision D)', async () => {
    mockRoles = ['resource_manager'];
    mockCreateAndBookPosition
      .mockRejectedValueOnce(OVERALLOC_409)
      .mockResolvedValueOnce({
        id: 'pos-3', projectId: 'proj-1', role: 'Engineer',
        requiredAllocationPercent: 100, fillStatus: 'BOOKED', version: 3,
      });
    const onSuccess = vi.fn();
    const { user } = renderRoute(
      <CreateAssignmentModal open preFill={buildPreFill()} onSuccess={onSuccess} onCancel={() => {}} />,
    );

    fillForm();
    await user.click(screen.getByRole('button', { name: 'Create & Book' }));

    await waitFor(() => expect(screen.getByText(OVERALLOC_409.message)).toBeInTheDocument());
    const override = screen.getByRole('checkbox', { name: /Override and book anyway/ });
    await user.click(override);
    await user.click(screen.getByRole('button', { name: 'Create & Book' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockCreateAndBookPosition).toHaveBeenCalledTimes(2);
    expect(mockCreateAndBookPosition.mock.calls[1][0]).toMatchObject({ allowOverallocation: true });
  }, 15000);

  it('Σ-allocation 409 shows the message but NO override checkbox for a project manager', async () => {
    mockCreateAndBookPosition.mockRejectedValue(OVERALLOC_409);
    const { user } = renderRoute(
      <CreateAssignmentModal open preFill={buildPreFill()} onSuccess={() => {}} onCancel={() => {}} />,
    );

    fillForm();
    await user.click(screen.getByRole('button', { name: 'Create & Book' }));

    await waitFor(() => expect(screen.getByText(OVERALLOC_409.message)).toBeInTheDocument());
    expect(screen.queryByRole('checkbox', { name: /Override and book anyway/ })).not.toBeInTheDocument();
  }, 15000);
});
