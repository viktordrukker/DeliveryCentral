import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ImpersonationProvider } from '@/app/impersonation-context';
import { AdminPanelPage } from './AdminPanelPage';

// V2 SoT PR 12 — Admin Settings DS canvas conformance (page-admin-setup.jsx).
// 5 tabs (Platform / Roles & RBAC / Integrations / Dictionaries / Monitoring)
// over a 1fr/280px split with right rail.
vi.mock('./SettingsPage', () => ({
  SettingsAdminContent: () => <div data-testid="mock-settings-content">Settings</div>,
  SettingsPage: () => <div />,
}));
vi.mock('./IntegrationsAdminPage', () => ({
  IntegrationsAdminContent: () => <div data-testid="mock-integrations-content">Integrations</div>,
  IntegrationsAdminPage: () => <div />,
}));
vi.mock('./FeatureFlagsAdminPage', () => ({
  FeatureFlagsAdminContent: () => <div data-testid="mock-feature-flags-content">Feature Flags</div>,
  FeatureFlagsAdminPage: () => <div />,
}));
vi.mock('./RolePermissionAdminPage', () => ({
  RolePermissionAdminContent: () => <div data-testid="mock-role-permissions-content">Roles</div>,
  RolePermissionAdminPage: () => <div />,
}));
vi.mock('./BusinessAuditPage', () => ({
  BusinessAuditAdminContent: () => <div data-testid="mock-business-audit-content">Audit</div>,
  BusinessAuditPage: () => <div />,
}));
vi.mock('./OrganizationConfigPage', () => ({
  OrganizationConfigAdminContent: () => <div data-testid="mock-org-config-content">Org</div>,
  OrganizationConfigPage: () => <div />,
}));
vi.mock('./DictionariesPage', () => ({
  DictionariesAdminContent: () => <div data-testid="mock-dictionaries-content">Dictionaries</div>,
  DictionariesPage: () => <div />,
}));
vi.mock('./AdminRightRail', () => ({
  AdminRightRail: () => <div data-testid="mock-right-rail">Right rail</div>,
}));

vi.mock('@/lib/api/admin', () => ({
  fetchAdminConfig: vi.fn(async () => ({
    dictionaries: [], integrations: [], systemFlags: [],
  })),
  fetchAdminIntegrations: vi.fn(async () => ({ integrations: [] })),
  fetchAdminNotifications: vi.fn(async () => ({ channels: [], templates: [] })),
  fetchAdminSettings: vi.fn(async () => ({ systemFlags: [] })),
  fetchAdminAccounts: vi.fn(async () => ({ items: [], total: 0 })),
  createLocalAccount: vi.fn(),
  deleteAdminAccount: vi.fn(),
  updateAdminAccount: vi.fn(),
}));

function renderTabbed(initialEntries: string[] = ['/admin']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <ImpersonationProvider>
        <AdminPanelPage />
      </ImpersonationProvider>
    </MemoryRouter>,
  );
}

describe('AdminPanelPage — V2 SoT PR 12 (DS canvas 5-tab Admin Control Surface)', () => {
  it('renders the DS tab shell', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    expect(screen.queryByText('Sections')).not.toBeInTheDocument();
  });

  it('renders the right rail on every tab', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('mock-right-rail')).toBeInTheDocument());
  });

  it('exposes the 5 DS canvas tabs in the PageHeader strip', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /Platform/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Roles & RBAC/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dictionaries/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Monitoring/i })).toBeInTheDocument();
  });

  it('mounts SettingsAdminContent inline under the Platform tab (default)', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tab-platform')).toBeInTheDocument());
    expect(screen.getByTestId('mock-settings-content')).toBeInTheDocument();
  });

  it('switching to Integrations mounts IntegrationsAdminContent inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Integrations/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-integrations')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-integrations-content')).toBeInTheDocument();
  });

  it('switching to Roles & RBAC mounts RolePermissions + BusinessAudit inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Roles & RBAC/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-roles')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-role-permissions-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-business-audit-content')).toBeInTheDocument();
  });

  it('switching to Dictionaries mounts Dictionaries + OrgConfig inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Dictionaries/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-dicts')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-dictionaries-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-org-config-content')).toBeInTheDocument();
  });

  it('switching to Monitoring mounts FeatureFlagsAdminContent inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Monitoring/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-monitor')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-feature-flags-content')).toBeInTheDocument();
  });

  it('respects ?tab=… in the URL on initial render', async () => {
    renderTabbed(['/admin?tab=monitor']);
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-monitor')).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { level: 2, name: /Monitoring/i })).toBeInTheDocument();
  });
});
