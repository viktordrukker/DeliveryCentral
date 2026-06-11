import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { ApiError } from '@/lib/api/http-client';
import type { PlannerBenchPerson } from '@/lib/api/staffing-desk';

import { PlannerDraftAssignmentModal } from './PlannerDraftAssignmentModal';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'actor-rm-1', roles: ['resource_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const mockCreateAndBookPosition = vi.fn();
const mockCreateProjectPosition = vi.fn();

vi.mock('@/lib/api/project-positions', async (importOriginal) => ({
  // Real module (incl. isOverallocationError) with the two network calls stubbed.
  ...(await importOriginal<typeof import('@/lib/api/project-positions')>()),
  createAndBookPosition: (req: unknown) => mockCreateAndBookPosition(req),
  createProjectPosition: (req: unknown) => mockCreateProjectPosition(req),
}));

const BENCH: PlannerBenchPerson[] = [
  {
    personId: 'person-1',
    displayName: 'Olivia Chen',
    grade: 'Senior',
    availablePercent: 100,
    daysOnBench: 12,
    skills: ['React'],
  } as PlannerBenchPerson,
];

function renderModal() {
  return renderRoute(
    <PlannerDraftAssignmentModal
      projectId="proj-1"
      projectName="Apollo"
      startDate="2026-07-06"
      benchPeople={BENCH}
      onClose={() => {}}
      onCreated={() => {}}
    />,
  );
}

function fillForm(): void {
  const personSelect = screen.getByTestId('draft-person-select');
  fireEvent.change(personSelect, { target: { value: 'person-1' } });
  const selects = Array.from(document.querySelectorAll('select'));
  const roleSelect = selects.find((s) => s !== personSelect) as HTMLSelectElement;
  fireEvent.change(roleSelect, { target: { value: '__custom__' } });
  const customRole = document.querySelectorAll('input[type="text"], input:not([type])');
  fireEvent.change(customRole[customRole.length - 1], { target: { value: 'Engineer' } });
}

describe('PlannerDraftAssignmentModal — atomic create-and-book', () => {
  beforeEach(() => {
    mockCreateAndBookPosition.mockReset();
    mockCreateProjectPosition.mockReset();
  });

  it('"Create & book" calls createAndBookPosition once — no separate transition call', async () => {
    mockCreateAndBookPosition.mockResolvedValue({
      id: 'pos-1', projectId: 'proj-1', role: 'Engineer',
      requiredAllocationPercent: 100, fillStatus: 'BOOKED', version: 3,
    });
    const { user } = renderModal();

    fillForm();
    await user.click(screen.getByTestId('draft-request'));

    await waitFor(() => expect(mockCreateAndBookPosition).toHaveBeenCalledTimes(1));
    expect(mockCreateAndBookPosition).toHaveBeenCalledWith({
      projectId: 'proj-1',
      personId: 'person-1',
      role: 'Engineer',
      allocationPercent: 100,
      startDate: '2026-07-06',
      endDate: '2026-07-06',
    });
    expect(mockCreateProjectPosition).not.toHaveBeenCalled();
  }, 15000);

  it('"Save draft" keeps the plain create with openImmediately=false', async () => {
    mockCreateProjectPosition.mockResolvedValue({
      id: 'pos-2', projectId: 'proj-1', role: 'Engineer',
      requiredAllocationPercent: 100, fillStatus: 'DRAFT', version: 1,
    });
    const { user } = renderModal();

    fillForm();
    await user.click(screen.getByTestId('draft-save'));

    await waitFor(() => expect(mockCreateProjectPosition).toHaveBeenCalledTimes(1));
    expect(mockCreateProjectPosition).toHaveBeenCalledWith(
      expect.objectContaining({ openImmediately: false }),
    );
    expect(mockCreateAndBookPosition).not.toHaveBeenCalled();
  }, 15000);

  it('Σ-allocation 409 offers RM "Override and book anyway" and retries with allowOverallocation (PR-14 Decision D)', async () => {
    const overalloc409 = new ApiError(
      'Over-allocation: person person-1 already has 80% active allocation in the overlapping window; ' +
        'this 100% booking would take them to 180%. RM/DM/admin can retry with allowOverallocation to override.',
      409,
    );
    mockCreateAndBookPosition
      .mockRejectedValueOnce(overalloc409)
      .mockResolvedValueOnce({
        id: 'pos-3', projectId: 'proj-1', role: 'Engineer',
        requiredAllocationPercent: 100, fillStatus: 'BOOKED', version: 3,
      });
    const { user } = renderModal();

    fillForm();
    await user.click(screen.getByTestId('draft-request'));

    await waitFor(() => expect(screen.getByText(overalloc409.message)).toBeInTheDocument());
    await user.click(screen.getByRole('checkbox', { name: /Override and book anyway/ }));
    await user.click(screen.getByTestId('draft-request'));

    await waitFor(() => expect(mockCreateAndBookPosition).toHaveBeenCalledTimes(2));
    expect(mockCreateAndBookPosition.mock.calls[1][0]).toMatchObject({ allowOverallocation: true });
  }, 15000);
});
