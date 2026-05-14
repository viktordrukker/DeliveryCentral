import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchRolePresets,
  setRolePresetOverride,
  type RolePresetView,
} from '@/lib/api/role-presets';

import { RolePermissionAdminPage } from './RolePermissionAdminPage';

vi.mock('@/lib/api/role-presets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/role-presets')>();
  return {
    ...actual,
    fetchRolePresets: vi.fn(),
    setRolePresetOverride: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchRolePresets);
const mockedSet = vi.mocked(setRolePresetOverride);

const baselineRows: RolePresetView[] = [
  {
    preset: 'EXEC_ROLES',
    defaults: ['director', 'admin'],
    effective: ['director', 'admin'],
    overridden: false,
  },
  {
    preset: 'HR_GOVERNANCE_ROLES',
    defaults: ['hr_manager', 'director', 'admin'],
    effective: ['hr_manager', 'director', 'admin', 'delivery_manager'],
    overridden: true,
  },
];

function renderPage(): void {
  render(
    <MemoryRouter>
      <RolePermissionAdminPage />
    </MemoryRouter>,
  );
}

describe('RolePermissionAdminPage (F-5.4 / D-159)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(baselineRows);
  });

  it('renders one row per preset with default vs overridden badges', async () => {
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('EXEC_ROLES')).toBeInTheDocument();
    expect(screen.getByText('HR_GOVERNANCE_ROLES')).toBeInTheDocument();
    // EXEC_ROLES is default; HR is overridden
    expect(screen.getByTestId('preset-row-EXEC_ROLES')).toHaveTextContent(/default/i);
    expect(screen.getByTestId('preset-row-HR_GOVERNANCE_ROLES')).toHaveTextContent(/overridden/i);
  });

  it('opens the editor, persists an override, and refreshes the row', async () => {
    const user = userEvent.setup();
    mockedSet.mockResolvedValue({
      preset: 'EXEC_ROLES',
      defaults: ['director', 'admin'],
      effective: ['director', 'admin', 'delivery_manager'],
      overridden: true,
    });
    renderPage();

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const execRow = screen.getByTestId('preset-row-EXEC_ROLES');
    await user.click(within(execRow).getByRole('button', { name: /edit/i }));

    expect(await screen.findByTestId('role-preset-editor')).toBeInTheDocument();
    // Toggle on delivery_manager
    await user.click(screen.getByLabelText('delivery_manager'));
    await user.click(screen.getByRole('button', { name: /save override/i }));

    await waitFor(() =>
      expect(mockedSet).toHaveBeenCalledWith(
        'EXEC_ROLES',
        expect.arrayContaining(['director', 'admin', 'delivery_manager']),
      ),
    );
    // Row should now show overridden after save
    await waitFor(() => {
      expect(screen.getByTestId('preset-row-EXEC_ROLES')).toHaveTextContent(/overridden/i);
    });
  });

  it('admin checkbox is disabled (cannot be removed)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const execRow = screen.getByTestId('preset-row-EXEC_ROLES');
    await user.click(within(execRow).getByRole('button', { name: /edit/i }));
    const adminCheckbox = screen.getByLabelText('admin');
    expect(adminCheckbox).toBeDisabled();
  });

  it('reset-to-default flow calls API with roles=null', async () => {
    const user = userEvent.setup();
    mockedSet.mockResolvedValue({
      preset: 'HR_GOVERNANCE_ROLES',
      defaults: ['hr_manager', 'director', 'admin'],
      effective: ['hr_manager', 'director', 'admin'],
      overridden: false,
    });
    renderPage();

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const hrRow = screen.getByTestId('preset-row-HR_GOVERNANCE_ROLES');
    await user.click(within(hrRow).getByRole('button', { name: /reset to default/i }));
    // Confirm dialog
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() => expect(mockedSet).toHaveBeenCalledWith('HR_GOVERNANCE_ROLES', null));
  });
});

