import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  createCustomRole,
  deactivateCustomRole,
  listBuiltInRoles,
  listCustomRoles,
  reactivateCustomRole,
  updateCustomRole,
  type BuiltInRoleDescriptor,
  type CustomRole,
} from '@/lib/api/custom-role';
import { CustomRoleAdminPage } from './CustomRoleAdminPage';

vi.mock('@/lib/api/custom-role', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/custom-role')>();
  return {
    ...actual,
    listCustomRoles: vi.fn(),
    listBuiltInRoles: vi.fn(),
    listAvailablePermissions: vi.fn(),
    fetchCustomRole: vi.fn(),
    createCustomRole: vi.fn(),
    updateCustomRole: vi.fn(),
    deactivateCustomRole: vi.fn(),
    reactivateCustomRole: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedList = vi.mocked(listCustomRoles);
const mockedBuiltIn = vi.mocked(listBuiltInRoles);
const mockedCreate = vi.mocked(createCustomRole);
const mockedUpdate = vi.mocked(updateCustomRole);
const mockedDeactivate = vi.mocked(deactivateCustomRole);
const mockedReactivate = vi.mocked(reactivateCustomRole);

const sampleCustomRole: CustomRole = {
  id: '11111111-1111-1111-1111-111111111111',
  publicId: 'cr_abc123',
  roleKey: 'squad_lead',
  displayName: 'Squad Lead',
  description: 'Owns a squad of 5-7 engineers.',
  inheritedRoles: ['project_manager'],
  isBuiltIn: false,
  active: true,
  deactivatedAt: null,
  createdAt: '2026-06-06T10:00:00.000Z',
  updatedAt: '2026-06-06T10:00:00.000Z',
  createdByPersonId: 'aaaa0000-0000-0000-0000-000000000001',
  updatedByPersonId: 'aaaa0000-0000-0000-0000-000000000001',
};

const sampleBuiltInRoles: BuiltInRoleDescriptor[] = [
  {
    roleKey: 'admin',
    displayName: 'Administrator',
    description: 'Full platform access.',
    isBuiltIn: true,
    active: true,
  },
  {
    roleKey: 'employee',
    displayName: 'Employee',
    description: 'Authenticated baseline access.',
    isBuiltIn: true,
    active: true,
  },
];

function renderPage(): void {
  render(
    <MemoryRouter>
      <CustomRoleAdminPage />
    </MemoryRouter>,
  );
}

describe('CustomRoleAdminPage (NEW-LGL-3)', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedBuiltIn.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDeactivate.mockReset();
    mockedReactivate.mockReset();
    mockedBuiltIn.mockResolvedValue(sampleBuiltInRoles);
  });

  it('lists custom roles and the locked built-in roles', async () => {
    mockedList.mockResolvedValue([sampleCustomRole]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Squad Lead')).toBeInTheDocument();
    });
    expect(screen.getByText('squad_lead')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
    // Built-in lock badge
    expect(screen.getAllByText('Built-in').length).toBeGreaterThan(0);
  });

  it('renders an EmptyState with a Create button when no custom roles exist', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/No custom roles/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole('button', { name: /Create role/i }).length).toBeGreaterThan(0);
  });

  it('opens the create form and submits to createCustomRole', async () => {
    mockedList.mockResolvedValueOnce([]).mockResolvedValueOnce([sampleCustomRole]);
    mockedCreate.mockResolvedValue(sampleCustomRole);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/No custom roles/).length).toBeGreaterThan(0);
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /\+ New custom role/i }));

    await waitFor(() => {
      expect(screen.getByText('New custom role')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const textInputs = within(dialog).getAllByRole('textbox') as HTMLInputElement[];
    // First input is roleKey, second is displayName, third description.
    await user.clear(textInputs[0]);
    await user.type(textInputs[0], 'squad_lead');
    await user.clear(textInputs[1]);
    await user.type(textInputs[1], 'Squad Lead');

    await user.click(within(dialog).getByRole('button', { name: /^Create$/i }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledTimes(1);
    });
    const payload = mockedCreate.mock.calls[0][0];
    expect(payload.roleKey).toBe('squad_lead');
    expect(payload.displayName).toBe('Squad Lead');
    expect(payload.inheritedRoles).toEqual(['employee']);
  });

  it('opens the edit form prefilled with roleKey disabled', async () => {
    mockedList.mockResolvedValueOnce([sampleCustomRole]).mockResolvedValueOnce([
      { ...sampleCustomRole, displayName: 'Squad Lead (renamed)' },
    ]);
    mockedUpdate.mockResolvedValue({ ...sampleCustomRole, displayName: 'Squad Lead (renamed)' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Squad Lead')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Edit/i }));

    await waitFor(() => {
      expect(screen.getByText('Edit custom role')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const textInputs = within(dialog).getAllByRole('textbox') as HTMLInputElement[];
    expect(textInputs[0]).toBeDisabled();
    expect(textInputs[0]).toHaveValue('squad_lead');

    await user.clear(textInputs[1]);
    await user.type(textInputs[1], 'Squad Lead (renamed)');

    await user.click(within(dialog).getByRole('button', { name: /Save changes/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledTimes(1);
    });
    const [id, payload] = mockedUpdate.mock.calls[0];
    expect(id).toBe('11111111-1111-1111-1111-111111111111');
    expect(payload.displayName).toBe('Squad Lead (renamed)');
  });

  it('confirms then calls deactivateCustomRole', async () => {
    mockedList
      .mockResolvedValueOnce([sampleCustomRole])
      .mockResolvedValueOnce([
        { ...sampleCustomRole, active: false, deactivatedAt: '2026-06-06T10:05:00.000Z' },
      ]);
    mockedDeactivate.mockResolvedValue({
      ...sampleCustomRole,
      active: false,
      deactivatedAt: '2026-06-06T10:05:00.000Z',
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Squad Lead')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Deactivate$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Deactivate custom role/i)).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Deactivate$/i }));

    await waitFor(() => {
      expect(mockedDeactivate).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        0,
      );
    });
  });

  it('shows a Reactivate button for inactive rows and calls reactivateCustomRole', async () => {
    const inactive: CustomRole = {
      ...sampleCustomRole,
      active: false,
      deactivatedAt: '2026-06-06T10:05:00.000Z',
    };
    mockedList.mockResolvedValueOnce([inactive]).mockResolvedValueOnce([sampleCustomRole]);
    mockedReactivate.mockResolvedValue(sampleCustomRole);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Squad Lead')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Reactivate/i }));

    await waitFor(() => {
      expect(mockedReactivate).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    });
  });
});
