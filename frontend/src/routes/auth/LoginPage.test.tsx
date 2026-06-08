import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { LoginPage } from './LoginPage';

const httpGetMock = vi.fn();
const loginMock = vi.fn();

vi.mock('@/lib/api/http-client', () => ({
  httpGet: (...args: unknown[]) => httpGetMock(...args),
}));

vi.mock('@/app/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/auth-context')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: false,
      isLoading: false,
      principal: null,
      login: loginMock,
      completeTwoFactor: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

function renderLogin(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage — W2-17 SSO/LDAP buttons', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
    loginMock.mockReset();
  });

  it('renders only the email/password form when only local is enabled', async () => {
    httpGetMock.mockResolvedValueOnce({ local: true, ldap: false, azureAd: false });
    renderLogin();
    await waitFor(() => expect(httpGetMock).toHaveBeenCalledWith('/auth/providers'));

    expect(screen.queryByTestId('sso-azuread-button')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('renders the Microsoft SSO button when providers.azureAd is true', async () => {
    httpGetMock.mockResolvedValueOnce({ local: true, ldap: false, azureAd: true });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByTestId('sso-azuread-button')).toBeInTheDocument();
    });

    const ssoButton = screen.getByTestId('sso-azuread-button');
    expect(ssoButton).toHaveAttribute('href', expect.stringContaining('/auth/oidc/login'));
    expect(screen.getByText(/^or$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders LDAP credential form with Username label and hides Forgot password when only LDAP is enabled', async () => {
    httpGetMock.mockResolvedValueOnce({ local: false, ldap: true, azureAd: false });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument();
    expect(screen.getByText(/corporate directory credentials/i)).toBeInTheDocument();
  });

  it('renders SSO + LDAP form when azureAd and ldap are both enabled (no local)', async () => {
    httpGetMock.mockResolvedValueOnce({ local: false, ldap: true, azureAd: true });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByTestId('sso-azuread-button')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument();
  });

  it('falls back to local-only when /auth/providers errors', async () => {
    httpGetMock.mockRejectedValueOnce(new Error('boom'));
    renderLogin();
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('sso-azuread-button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
  });
});

describe('LoginPage — W5-05 error alert a11y', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
    loginMock.mockReset();
  });

  it('announces the login error via role="alert" for screen readers', async () => {
    httpGetMock.mockResolvedValueOnce({ local: true, ldap: false, azureAd: false });
    loginMock.mockResolvedValueOnce({ status: 'error', message: 'Invalid credentials' });

    renderLogin();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/email/i), 'foo@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid credentials/i);
  });
});
