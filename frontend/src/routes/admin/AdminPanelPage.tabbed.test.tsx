import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  fetchAdminConfig,
  fetchAdminIntegrations,
  fetchAdminNotifications,
  fetchAdminSettings,
} from '@/lib/api/admin';
import { ImpersonationProvider } from '@/app/impersonation-context';
import { AdminPanelPage } from './AdminPanelPage';

vi.mock('@/lib/api/admin', () => ({
  fetchAdminConfig: vi.fn(),
  fetchAdminIntegrations: vi.fn(),
  fetchAdminNotifications: vi.fn(),
  fetchAdminSettings: vi.fn(),
  fetchAdminAccounts: vi.fn(async () => ({ items: [], total: 0 })),
}));

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => id === 'dsRefresh',
  };
});

const mockedFetchAdminConfig = vi.mocked(fetchAdminConfig);
const mockedFetchAdminSettings = vi.mocked(fetchAdminSettings);
const mockedFetchAdminIntegrations = vi.mocked(fetchAdminIntegrations);
const mockedFetchAdminNotifications = vi.mocked(fetchAdminNotifications);

function mockResponses(): void {
  mockedFetchAdminConfig.mockResolvedValue({
    dictionaries: [{ key: 'project-types', label: 'Project Types', items: [{ key: 'fp', label: 'Fixed Price' }] }],
    metadata: { generatedAt: '2026-05-24T00:00:00Z' },
  } as never);
  mockedFetchAdminIntegrations.mockResolvedValue({
    integrations: [{ key: 'slack', label: 'Slack', status: 'connected' }],
    metadata: { generatedAt: '2026-05-24T00:00:00Z' },
  } as never);
  mockedFetchAdminNotifications.mockResolvedValue({
    channels: [{ key: 'teams', label: 'Microsoft Teams Webhook', status: 'connected' }],
    templates: [{ key: 'assignment-created', label: 'Assignment Created' }],
    metadata: { generatedAt: '2026-05-24T00:00:00Z' },
  } as never);
  mockedFetchAdminSettings.mockResolvedValue({
    systemFlags: [{ key: 'flag1', label: 'Flag 1', enabled: true }],
    metadata: { generatedAt: '2026-05-24T00:00:00Z' },
  } as never);
}

function renderTabbed(initialEntries = ['/admin']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <ImpersonationProvider>
        <AdminPanelPage />
      </ImpersonationProvider>
    </MemoryRouter>,
  );
}

describe('AdminPanelPage — Phase B5 tabbed landing', () => {
  it('renders the tabbed shell instead of the sidebar when dsRefresh is ON', async () => {
    mockResponses();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    expect(screen.queryByText('Sections')).not.toBeInTheDocument();
  });

  it('exposes every section as a tab in the PageHeader strip', async () => {
    mockResponses();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /User Accounts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dictionaries/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /System Settings/i })).toBeInTheDocument();
  });

  it('switching tabs updates the active section header', async () => {
    mockResponses();
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    // accounts is the default; clicking System Settings should swap the heading.
    await user.click(screen.getByRole('tab', { name: /System Settings/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: /System Settings/i })).toBeInTheDocument(),
    );
  });

  it('respects ?section=… in the URL on initial render', async () => {
    mockResponses();
    renderTabbed(['/admin?section=settings']);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: /System Settings/i })).toBeInTheDocument(),
    );
  });
});
