/**
 * V2 Scope §4 item 14 — system flag inline toggle list.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchFlagsMock = vi.fn();
const updateFlagMock = vi.fn();

vi.mock('@/lib/api/feature-flags-admin', () => ({
  fetchFeatureFlags: (...args: unknown[]) => fetchFlagsMock(...args),
  updateFeatureFlag: (...args: unknown[]) => updateFlagMock(...args),
}));

import { SystemFlagsSettingsList } from './SystemFlagsSettingsList';

const baseFlag = {
  description: 'A test flag.',
  category: 'ui',
  maturityLevel: 'beta' as const,
  expectedGaSprint: undefined,
  owner: 'platform-team',
  dependsOn: undefined,
  default: false,
  currentValue: false,
};

describe('SystemFlagsSettingsList', () => {
  beforeEach(() => {
    fetchFlagsMock.mockReset();
    updateFlagMock.mockReset();
  });

  it('renders one toggle per flag with description + owner', async () => {
    fetchFlagsMock.mockResolvedValue([
      { ...baseFlag, id: 'f1', key: 'dsRefresh', currentValue: true },
      { ...baseFlag, id: 'f2', key: 'workspaceMe', currentValue: false },
    ]);
    render(<SystemFlagsSettingsList />);
    await waitFor(() => expect(screen.getByText('dsRefresh')).toBeInTheDocument());
    expect(screen.getByText('workspaceMe')).toBeInTheDocument();
    // First flag (currentValue=true) renders "Enabled" label; second renders "Disabled".
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    // Description + owner surface in supporting text.
    expect(screen.getAllByText(/A test flag/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/platform-team/)[0]).toBeInTheDocument();
  });

  it('optimistically toggles a flag and calls updateFeatureFlag', async () => {
    const user = userEvent.setup();
    fetchFlagsMock.mockResolvedValue([
      { ...baseFlag, id: 'f1', key: 'dsRefresh', currentValue: false },
    ]);
    updateFlagMock.mockResolvedValue({
      id: 'f1', key: 'dsRefresh', previousValue: false, currentValue: true,
    });
    render(<SystemFlagsSettingsList />);
    const checkbox = await waitFor(() => screen.getByRole('checkbox'));
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(updateFlagMock).toHaveBeenCalledWith('f1', true);
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('reverts the toggle and surfaces the error inline on PATCH failure', async () => {
    const user = userEvent.setup();
    fetchFlagsMock.mockResolvedValue([
      { ...baseFlag, id: 'f1', key: 'dsRefresh', currentValue: false },
    ]);
    updateFlagMock.mockRejectedValue(new Error('Backend rejected toggle.'));
    render(<SystemFlagsSettingsList />);
    const checkbox = await waitFor(() => screen.getByRole('checkbox'));
    await user.click(checkbox);
    // Error message renders.
    await waitFor(() =>
      expect(screen.getByText('Backend rejected toggle.')).toBeInTheDocument(),
    );
    // Checkbox reverts to unchecked.
    expect(checkbox).not.toBeChecked();
  });

  it('shows an inline error if the initial fetch fails', async () => {
    fetchFlagsMock.mockRejectedValue(new Error('Network down.'));
    render(<SystemFlagsSettingsList />);
    await waitFor(() =>
      expect(screen.getByText(/Network down/i)).toBeInTheDocument(),
    );
  });
});
