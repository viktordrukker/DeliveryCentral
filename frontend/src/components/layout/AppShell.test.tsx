import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { appRoutes, type AppRole } from '@/app/route-manifest';
import { AppShell } from './AppShell';
import { renderRoute } from '@test/render-route';

let currentRoles: AppRole[] = ['admin'];
let dsRefreshEnabled = false;

vi.mock('@/app/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/auth-context')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      principal: { personId: 'p1', displayName: 'Ada Lovelace', roles: currentRoles },
      logout: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

vi.mock('@/app/impersonation-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/impersonation-context')>();
  return {
    ...actual,
    useImpersonation: () => ({
      impersonation: null,
      startImpersonation: vi.fn(),
      exitImpersonation: vi.fn(),
    }),
  };
});

vi.mock('@/app/platform-settings-context', () => ({
  useEvidenceManagement: () => ({ enabled: false }),
}));

vi.mock('@/lib/api/admin', () => ({
  fetchAdminAccounts: async () => ({ items: [], total: 0 }),
}));

vi.mock('@/lib/api/inbox', () => ({
  fetchInbox: vi.fn(async () => []),
  markAllRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock('@/components/system/PendingMigrationsBanner', () => ({
  PendingMigrationsBanner: () => null,
}));

vi.mock('@/components/layout/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/layout/ImpersonationBanner', () => ({
  ImpersonationBanner: () => null,
}));

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => (id === 'dsRefresh' ? dsRefreshEnabled : false),
  };
});

describe('AppShell — Phase A2.4 frame swap', () => {
  it('renders the legacy SidebarNav + TopHeader when dsRefresh is OFF', () => {
    currentRoles = ['admin'];
    dsRefreshEnabled = false;
    renderRoute(<AppShell routes={appRoutes} />);
    // Legacy sidebar brand
    expect(screen.getByText('Workload Tracking')).toBeInTheDocument();
    // Legacy top header has environment label
    expect(screen.getByText('Environment')).toBeInTheDocument();
    // V2 components must not appear
    expect(screen.queryByText('DeliverIT')).not.toBeInTheDocument();
  });

  it('renders SidebarNavV2 + TopHeaderV2 when dsRefresh is ON', () => {
    currentRoles = ['admin'];
    dsRefreshEnabled = true;
    renderRoute(<AppShell routes={appRoutes} />);
    // V2 sidebar brand
    expect(screen.getByText('DeliverIT')).toBeInTheDocument();
    // V2 top header has ⌘K legend
    expect(screen.getByText('⌘K')).toBeInTheDocument();
    // Legacy sidebar brand must not appear
    expect(screen.queryByText('Workload Tracking')).not.toBeInTheDocument();
  });
});
