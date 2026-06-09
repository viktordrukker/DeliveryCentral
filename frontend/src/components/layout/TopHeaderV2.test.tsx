import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TopHeaderV2 } from './TopHeaderV2';
import { renderRoute } from '@test/render-route';
import type { AppRole } from '@/app/route-manifest';

let currentRoles: AppRole[] = ['employee'];

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

vi.mock('@/lib/api/admin', () => ({
  fetchAdminAccounts: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock('@/lib/api/inbox', () => ({
  fetchInbox: vi.fn(async () => []),
  markAllRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock('@/components/layout/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/common/CommandPalette', () => ({
  CommandPalette: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="palette" onClick={onClose}>
        palette
      </div>
    ) : null,
}));

describe('TopHeaderV2', () => {
  it('renders search trigger with ⌘K legend', () => {
    currentRoles = ['employee'];
    renderRoute(<TopHeaderV2 />);
    expect(screen.getByText('Search…')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('clicking the search trigger opens the command palette', async () => {
    currentRoles = ['employee'];
    renderRoute(<TopHeaderV2 />);
    await userEvent.click(screen.getByRole('button', { name: 'Open command palette' }));
    expect(screen.getByTestId('palette')).toBeInTheDocument();
  });

  it('+ New button surfaces the quick-create menu', async () => {
    currentRoles = ['employee'];
    renderRoute(<TopHeaderV2 />);
    await userEvent.click(screen.getByRole('button', { name: '+ New' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'New project' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'New position' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'New leave request' })).toBeInTheDocument();
  });

  it('renders the help button', () => {
    currentRoles = ['employee'];
    renderRoute(<TopHeaderV2 />);
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('renders the user display name and role', () => {
    currentRoles = ['director'];
    renderRoute(<TopHeaderV2 />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  it('omits the hamburger button when onToggleSidebar is not supplied', () => {
    currentRoles = ['employee'];
    renderRoute(<TopHeaderV2 />);
    expect(screen.queryByRole('button', { name: 'Toggle sidebar' })).not.toBeInTheDocument();
  });

  it('renders the hamburger button when onToggleSidebar is supplied', () => {
    currentRoles = ['employee'];
    renderRoute(<TopHeaderV2 onToggleSidebar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument();
  });
});
