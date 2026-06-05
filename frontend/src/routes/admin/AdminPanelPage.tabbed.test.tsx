import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ImpersonationProvider } from '@/app/impersonation-context';
import { AdminPanelPage } from './AdminPanelPage';

// LEAN-P4d-1 — under dsRefresh the admin panel uses the 5-tab Phase 18
// Admin Control Surface grammar. Each tab inline-mounts a sub-page's
// AdminContent helper rather than deep-linking. We mock the sub-page
// content modules to keep this test focused on the tab shell + URL
// persistence contract; per-sub-page rendering is covered by the
// sub-pages' own tests.
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

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => id === 'dsRefresh',
  };
});

function renderTabbed(initialEntries: string[] = ['/admin']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <ImpersonationProvider>
        <AdminPanelPage />
      </ImpersonationProvider>
    </MemoryRouter>,
  );
}

describe('AdminPanelPage — LEAN-P4d-1 5-tab Admin Control Surface', () => {
  it('renders the tabbed shell instead of the sidebar when dsRefresh is ON', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    expect(screen.queryByText('Sections')).not.toBeInTheDocument();
  });

  it('exposes the 5 Phase 18 tabs in the PageHeader strip', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /General/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Governance/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /People Config/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Feature Flags/i })).toBeInTheDocument();
  });

  it('mounts SettingsAdminContent inline under the General tab (default)', async () => {
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tab-general')).toBeInTheDocument());
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

  it('switching to Governance mounts RolePermissions + BusinessAudit inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Governance/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-governance')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-role-permissions-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-business-audit-content')).toBeInTheDocument();
  });

  it('switching to People Config mounts Dictionaries + OrgConfig inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /People Config/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-people-config')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-dictionaries-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-org-config-content')).toBeInTheDocument();
  });

  it('switching to Feature Flags mounts FeatureFlagsAdminContent inline', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Feature Flags/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-feature-flags')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mock-feature-flags-content')).toBeInTheDocument();
  });

  it('respects ?tab=… in the URL on initial render', async () => {
    renderTabbed(['/admin?tab=feature-flags']);
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-feature-flags')).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { level: 2, name: /Feature Flags/i })).toBeInTheDocument();
  });
});
