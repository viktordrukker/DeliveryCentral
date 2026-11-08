import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ImpersonationProvider } from '@/app/impersonation-context';
import { AdminPanelPage } from './AdminPanelPage';

// V2 SoT PR 12 — /admin DS canvas conformance carries the deep-link cards
// forward from W2-03. Each tab exposes anchors to its sub-page routes so
// users land at /admin and reach every admin surface without leaving the
// consolidated control surface.

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

function expectDeepLink(href: string): HTMLAnchorElement {
  const anchor = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
  expect(anchor).not.toBeNull();
  return anchor as HTMLAnchorElement;
}

describe('AdminPanelPage — V2 SoT PR 12 deep-link cards', () => {
  it('Platform tab exposes deep-links to period-locks, rate-cards, setup, help', async () => {
    renderTabbed();
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-platform')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('admin-deep-links')).toBeInTheDocument();
    expectDeepLink('/admin/period-locks');
    expectDeepLink('/admin/rate-cards');
    expectDeepLink('/admin/setup');
    expectDeepLink('/admin/help');
  });

  it('Integrations tab exposes deep-links to registry, SSO, webhooks, HRIS, monitoring', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Integrations/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-integrations')).toBeInTheDocument(),
    );
    expectDeepLink('/admin/integrations/registry');
    expectDeepLink('/admin/integrations/sso');
    expectDeepLink('/admin/webhooks');
    expectDeepLink('/admin/hris');
    expectDeepLink('/admin/monitoring');
  });

  it('Roles & RBAC tab exposes deep-links to access-policies, responsibility-matrix, custom roles, V2 soak, notifications', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Roles & RBAC/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-roles')).toBeInTheDocument(),
    );
    expectDeepLink('/admin/access-policies');
    expectDeepLink('/admin/responsibility-matrix');
    expectDeepLink('/admin/governance/roles');
    expectDeepLink('/admin/v2-soak-checklist');
    expectDeepLink('/admin/notifications');
  });

  it('Dictionaries tab exposes deep-links to leave-policies, bulk import, vendors, radiator thresholds', async () => {
    const user = userEvent.setup();
    renderTabbed();
    await waitFor(() => expect(screen.getByTestId('admin-tabbed')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Dictionaries/i }));
    await waitFor(() =>
      expect(screen.getByTestId('admin-tab-dicts')).toBeInTheDocument(),
    );
    expectDeepLink('/admin/leave-policies');
    expectDeepLink('/admin/people/import');
    expectDeepLink('/admin/vendors');
    expectDeepLink('/admin/radiator-thresholds');
  });
});
