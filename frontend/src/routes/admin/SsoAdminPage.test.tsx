/**
 * NEW-LGL-2 — SsoAdminPage coverage.
 *
 * Verifies form rendering, save flow (with + without secret), test-connection
 * happy + error path, auto-provision toggle, and error-state on load failure.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchSsoConfig,
  testSsoConnection,
  updateSsoConfig,
  type SsoConfig,
  type SsoTestResult,
} from '@/lib/api/sso-admin';

import { SsoAdminPage } from './SsoAdminPage';

vi.mock('@/lib/api/sso-admin', () => ({
  fetchSsoConfig: vi.fn(),
  updateSsoConfig: vi.fn(),
  testSsoConnection: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchSsoConfig);
const mockedUpdate = vi.mocked(updateSsoConfig);
const mockedTest = vi.mocked(testSsoConnection);

const baseConfig: SsoConfig = {
  provider: 'oidc',
  clientId: 'existing-client-id',
  discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
  clientSecretSet: true,
  autoProvisionUsers: false,
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <SsoAdminPage />
    </MemoryRouter>,
  );
}

describe('SsoAdminPage (NEW-LGL-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current SSO config and seeds the form', async () => {
    mockedFetch.mockResolvedValue(baseConfig);
    renderPage();

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('sso-status-row')).toHaveTextContent(/Configured/);
    expect(screen.getByTestId('sso-client-id-input')).toHaveValue('existing-client-id');
    expect(screen.getByTestId('sso-discovery-url-input')).toHaveValue(baseConfig.discoveryUrl);
    expect(screen.getByTestId('sso-client-secret-input')).toHaveAttribute('placeholder', '••••••••');
  });

  it('shows "Not configured" status when no clientId or discoveryUrl is set', async () => {
    mockedFetch.mockResolvedValue({
      ...baseConfig,
      clientId: '',
      discoveryUrl: '',
      clientSecretSet: false,
    });
    renderPage();
    expect(await screen.findByTestId('sso-status-row')).toHaveTextContent(/Not configured/);
  });

  it('saves without sending clientSecret when the input is left blank', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue(baseConfig);
    mockedUpdate.mockResolvedValue(baseConfig);
    renderPage();
    await screen.findByTestId('sso-save-button');

    await user.click(screen.getByTestId('sso-save-button'));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    const body = mockedUpdate.mock.calls[0][0];
    expect('clientSecret' in body).toBe(false);
    expect(body.clientId).toBe('existing-client-id');
    expect(body.discoveryUrl).toBe(baseConfig.discoveryUrl);

    const { toast } = await import('sonner');
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it('saves with clientSecret when the user types one in', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue({ ...baseConfig, clientSecretSet: false });
    mockedUpdate.mockResolvedValue({ ...baseConfig, clientSecretSet: true });
    renderPage();
    await screen.findByTestId('sso-save-button');

    await user.type(screen.getByTestId('sso-client-secret-input'), 'fresh-secret');
    await user.click(screen.getByTestId('sso-save-button'));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate.mock.calls[0][0].clientSecret).toBe('fresh-secret');
  });

  it('toggles auto-provision and includes it in the save payload', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue(baseConfig);
    mockedUpdate.mockResolvedValue({ ...baseConfig, autoProvisionUsers: true });
    renderPage();
    await screen.findByTestId('sso-save-button');

    await user.click(screen.getByTestId('sso-auto-provision-toggle'));
    await user.click(screen.getByTestId('sso-save-button'));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate.mock.calls[0][0].autoProvisionUsers).toBe(true);
  });

  it('runs test connection and shows the parsed endpoints on success', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue(baseConfig);
    const testOk: SsoTestResult = {
      ok: true,
      issuer: 'https://idp.example.com',
      authorizationEndpoint: 'https://idp.example.com/authorize',
      tokenEndpoint: 'https://idp.example.com/token',
    };
    mockedTest.mockResolvedValue(testOk);
    renderPage();
    await screen.findByTestId('sso-test-button');

    await user.click(screen.getByTestId('sso-test-button'));

    await waitFor(() => expect(mockedTest).toHaveBeenCalledTimes(1));
    const result = await screen.findByTestId('sso-test-result');
    expect(result).toHaveTextContent('Discovery OK.');
    expect(result).toHaveTextContent('https://idp.example.com/authorize');

    const { toast } = await import('sonner');
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it('shows the backend error message when test connection fails', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue(baseConfig);
    mockedTest.mockResolvedValue({ ok: false, error: 'Discovery endpoint returned HTTP 404.' });
    renderPage();
    await screen.findByTestId('sso-test-button');

    await user.click(screen.getByTestId('sso-test-button'));

    const result = await screen.findByTestId('sso-test-result');
    expect(result).toHaveTextContent('Test failed.');
    expect(result).toHaveTextContent('HTTP 404');

    const { toast } = await import('sonner');
    expect(vi.mocked(toast.error)).toHaveBeenCalled();
  });

  it('renders the load error state when fetchSsoConfig rejects', async () => {
    mockedFetch.mockRejectedValue(new Error('500 Internal Server Error'));
    renderPage();
    expect(await screen.findByText(/500 Internal Server Error/i)).toBeInTheDocument();
  });

  it('disables Test connection when no discoveryUrl is persisted', async () => {
    mockedFetch.mockResolvedValue({ ...baseConfig, discoveryUrl: '' });
    renderPage();
    expect(await screen.findByTestId('sso-test-button')).toBeDisabled();
  });
});
