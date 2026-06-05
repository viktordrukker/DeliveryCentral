/**
 * LEAN-P4d-2 — feature flag inline toggle coverage on
 * /admin/feature-flags (and /admin?tab=feature-flags).
 *
 * Verifies: ConfirmDialog gating, optimistic update + rollback, toast
 * lifecycle, and the rollout-locked rows for dsRefresh / workspaceMe.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchFeatureFlags,
  toggleFeatureFlag,
  type FeatureFlagAdminEntry,
} from '@/lib/api/feature-flags-admin';

import { FeatureFlagsAdminPage } from './FeatureFlagsAdminPage';

vi.mock('@/lib/api/feature-flags-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/feature-flags-admin')>();
  return {
    ...actual,
    fetchFeatureFlags: vi.fn(),
    toggleFeatureFlag: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchFeatureFlags);
const mockedToggle = vi.mocked(toggleFeatureFlag);

const baseFlag: Omit<FeatureFlagAdminEntry, 'id' | 'key' | 'currentValue'> = {
  description: 'Test flag description.',
  category: 'ui',
  maturityLevel: 'beta',
  expectedGaSprint: undefined,
  owner: 'platform-team',
  dependsOn: undefined,
  default: false,
};

function makeFlag(
  id: string,
  key: string,
  currentValue: boolean,
): FeatureFlagAdminEntry {
  return { ...baseFlag, id, key, currentValue };
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <FeatureFlagsAdminPage />
    </MemoryRouter>,
  );
}

describe('FeatureFlagsAdminPage (LEAN-P4d-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a toggle button for each editable flag', async () => {
    mockedFetch.mockResolvedValue([
      makeFlag('alpha', 'flag.alpha.enabled', false),
      makeFlag('beta', 'flag.beta.enabled', true),
    ]);
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('toggle-alpha')).toHaveTextContent(/enable/i);
    expect(screen.getByTestId('toggle-beta')).toHaveTextContent(/disable/i);
  });

  it('renders Rollout-locked instead of a toggle for dsRefresh and workspaceMe', async () => {
    mockedFetch.mockResolvedValue([
      makeFlag('dsRefresh', 'flag.dsRefresh.enabled', false),
      makeFlag('workspaceMe', 'flag.workspaceMe.enabled', false),
      makeFlag('alpha', 'flag.alpha.enabled', false),
    ]);
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('toggle-dsRefresh')).not.toBeInTheDocument();
    expect(screen.queryByTestId('toggle-workspaceMe')).not.toBeInTheDocument();
    expect(screen.getByTestId('toggle-alpha')).toBeInTheDocument();
    expect(screen.getAllByText(/rollout-locked/i)).toHaveLength(2);
  });

  it('opens the ConfirmDialog before flipping a flag', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue([makeFlag('alpha', 'flag.alpha.enabled', false)]);
    renderPage();
    await user.click(await screen.findByTestId('toggle-alpha'));
    expect(await screen.findByText(/confirm flag toggle/i)).toBeInTheDocument();
    expect(screen.getByText(/enable feature flag/i)).toBeInTheDocument();
    // PATCH must not have fired yet — dialog is gating it.
    expect(mockedToggle).not.toHaveBeenCalled();
  });

  it('confirms, optimistically updates, fires toggleFeatureFlag, and shows a success toast', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue([makeFlag('alpha', 'flag.alpha.enabled', false)]);
    mockedToggle.mockResolvedValue({
      id: 'alpha',
      key: 'flag.alpha.enabled',
      previousValue: false,
      currentValue: true,
    });
    renderPage();
    await user.click(await screen.findByTestId('toggle-alpha'));
    await user.click(await screen.findByRole('button', { name: /enable flag/i }));
    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith('alpha', true));
    // Action button label flips to Disable after success.
    await waitFor(() => expect(screen.getByTestId('toggle-alpha')).toHaveTextContent(/disable/i));

    const { toast } = await import('sonner');
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it('reverts on PATCH failure and fires an error toast', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue([makeFlag('alpha', 'flag.alpha.enabled', false)]);
    mockedToggle.mockRejectedValue(new Error('Backend rejected toggle.'));
    renderPage();
    await user.click(await screen.findByTestId('toggle-alpha'));
    await user.click(await screen.findByRole('button', { name: /enable flag/i }));
    await waitFor(() => expect(mockedToggle).toHaveBeenCalled());
    // Optimistic flip → revert → still "Enable".
    await waitFor(() => expect(screen.getByTestId('toggle-alpha')).toHaveTextContent(/enable/i));

    const { toast } = await import('sonner');
    expect(vi.mocked(toast.error)).toHaveBeenCalled();
  });

  it('cancels the toggle when ConfirmDialog is dismissed', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue([makeFlag('alpha', 'flag.alpha.enabled', false)]);
    renderPage();
    await user.click(await screen.findByTestId('toggle-alpha'));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));
    expect(mockedToggle).not.toHaveBeenCalled();
    expect(screen.getByTestId('toggle-alpha')).toHaveTextContent(/enable/i);
  });
});
