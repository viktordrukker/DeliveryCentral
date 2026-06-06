import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  createLeavePolicy,
  deactivateLeavePolicy,
  listLeavePolicies,
  updateLeavePolicy,
  type LeavePolicy,
} from '@/lib/api/leave-policy';
import { LeavePolicyAdminPage } from './LeavePolicyAdminPage';

vi.mock('@/lib/api/leave-policy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/leave-policy')>();
  return {
    ...actual,
    listLeavePolicies: vi.fn(),
    fetchLeavePolicy: vi.fn(),
    createLeavePolicy: vi.fn(),
    updateLeavePolicy: vi.fn(),
    deactivateLeavePolicy: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedList = vi.mocked(listLeavePolicies);
const mockedCreate = vi.mocked(createLeavePolicy);
const mockedUpdate = vi.mocked(updateLeavePolicy);
const mockedDeactivate = vi.mocked(deactivateLeavePolicy);

const samplePolicy: LeavePolicy = {
  id: 'lvp-1',
  publicId: 'lvp_abc123',
  name: 'Standard Annual',
  leaveType: 'ANNUAL',
  accrualPerYear: 20,
  maxCarryOver: 5,
  approvalChain: ['hr_manager', 'director'],
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  createdByPersonId: 'aaaa0000-0000-0000-0000-000000000001',
  updatedByPersonId: 'aaaa0000-0000-0000-0000-000000000001',
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <LeavePolicyAdminPage />
    </MemoryRouter>,
  );
}

describe('LeavePolicyAdminPage (LEAN-P4-missing-13)', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDeactivate.mockReset();
  });

  it('lists policies returned by the API', async () => {
    mockedList.mockResolvedValue([samplePolicy]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Standard Annual')).toBeInTheDocument();
    });
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('hr_manager → director')).toBeInTheDocument();
    // Row status renders via StatusBadge as a chip; the KPI strip label also
    // says "Active", so assert at least one element matches.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('renders an EmptyState with a Create button when no policies exist', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No policies/)).toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: /Create policy/i }).length).toBeGreaterThan(0);
  });

  it('opens the create form and submits to createLeavePolicy', async () => {
    mockedList.mockResolvedValueOnce([]).mockResolvedValueOnce([samplePolicy]);
    mockedCreate.mockResolvedValue(samplePolicy);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No policies/)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /\+ New leave policy/i }));

    await waitFor(() => {
      expect(screen.getByText('New leave policy')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const textInputs = within(dialog).getAllByRole('textbox') as HTMLInputElement[];
    const nameInput = textInputs[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'Standard Annual');

    await user.click(within(dialog).getByRole('button', { name: /^Create$/i }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledTimes(1);
    });
    const payload = mockedCreate.mock.calls[0][0];
    expect(payload.name).toBe('Standard Annual');
    expect(payload.leaveType).toBe('ANNUAL');
    expect(payload.accrualPerYear).toBe(20);
    expect(payload.maxCarryOver).toBe(5);
    expect(payload.approvalChain).toEqual(['hr_manager']);
  });

  it('opens the edit form prefilled and patches via updateLeavePolicy', async () => {
    mockedList.mockResolvedValueOnce([samplePolicy]).mockResolvedValueOnce([
      { ...samplePolicy, accrualPerYear: 25 },
    ]);
    mockedUpdate.mockResolvedValue({ ...samplePolicy, accrualPerYear: 25 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Standard Annual')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Edit/i }));

    await waitFor(() => {
      expect(screen.getByText('Edit leave policy')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const numberInputs = within(dialog).getAllByRole('spinbutton') as HTMLInputElement[];
    const accrualInput = numberInputs[0];
    await user.clear(accrualInput);
    await user.type(accrualInput, '25');

    await user.click(within(dialog).getByRole('button', { name: /Save changes/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledTimes(1);
    });
    const [id, payload] = mockedUpdate.mock.calls[0];
    expect(id).toBe('lvp-1');
    expect(payload.accrualPerYear).toBe(25);
  });

  it('confirms then calls deactivateLeavePolicy', async () => {
    mockedList
      .mockResolvedValueOnce([samplePolicy])
      .mockResolvedValueOnce([{ ...samplePolicy, active: false }]);
    mockedDeactivate.mockResolvedValue({ ...samplePolicy, active: false });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Standard Annual')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Deactivate/i }));

    // ConfirmDialog appears.
    await waitFor(() => {
      expect(screen.getByText(/Deactivate leave policy/i)).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Deactivate$/i }));

    await waitFor(() => {
      expect(mockedDeactivate).toHaveBeenCalledWith('lvp-1');
    });
  });

  it('hides the Deactivate button when a policy is already inactive', async () => {
    mockedList.mockResolvedValue([{ ...samplePolicy, active: false }]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Standard Annual')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Deactivate/i })).toBeNull();
  });
});
