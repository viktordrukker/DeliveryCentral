import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { appRoutes, type AppRole } from '@/app/route-manifest';
import { SidebarNavV2 } from '@/components/layout/SidebarNavV2';
import { fetchSidebarCounts } from '@/lib/api/sidebar-counts';
import { renderRoute } from '@test/render-route';

let currentRoles: AppRole[] = ['admin'];

vi.mock('@/lib/api/sidebar-counts', () => ({ fetchSidebarCounts: vi.fn() }));
const mockedFetchCounts = vi.mocked(fetchSidebarCounts);

vi.mock('@/app/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/auth-context')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      principal: { personId: 'p1', displayName: 'Ada Lovelace', roles: currentRoles },
    }),
  };
});

describe('SidebarNavV2', () => {
  beforeEach(() => {
    mockedFetchCounts.mockResolvedValue({ projects: 24, approvals: 7, bench: 12, hrQueue: 3 });
  });

  it('renders the three V2 section labels for admin', () => {
    currentRoles = ['admin'];
    renderRoute(<SidebarNavV2 activePath="/" routes={appRoutes} />);
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Workforce')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('shows the DeliverIT brand title when expanded', () => {
    currentRoles = ['admin'];
    renderRoute(<SidebarNavV2 activePath="/" routes={appRoutes} />);
    expect(screen.getByText('DeliverIT')).toBeInTheDocument();
  });

  it('renders pending-count badges from sidebar-counts (DS/chrome nav counts)', async () => {
    currentRoles = ['admin'];
    // activePath in the Workspace group keeps it open so the Approvals item renders.
    renderRoute(<SidebarNavV2 activePath="/approvals" routes={appRoutes} />);
    // Approvals count = 7 (from the mocked fetchSidebarCounts).
    expect(await screen.findByLabelText('7 pending')).toBeInTheDocument();
  });

  it('does not surface admin-only routes for an employee', () => {
    currentRoles = ['employee'];
    renderRoute(<SidebarNavV2 activePath="/" routes={appRoutes} />);
    // Admin-only routes must not appear regardless of section state.
    expect(screen.queryByText('Platform Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Webhooks')).not.toBeInTheDocument();
  });

  it('shows the user card with display name + role chip when expanded', () => {
    currentRoles = ['director'];
    renderRoute(<SidebarNavV2 activePath="/" routes={appRoutes} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('director')).toBeInTheDocument();
  });

  it('omits section labels and user card when collapsed (rail mode)', () => {
    currentRoles = ['admin'];
    renderRoute(<SidebarNavV2 activePath="/" routes={appRoutes} collapsed />);
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('applies the active class to the active route', () => {
    currentRoles = ['admin'];
    renderRoute(<SidebarNavV2 activePath="/people" routes={appRoutes} />);
    const active = screen
      .getAllByRole('link')
      .find((l) => l.className.includes('sidebar-nav__item--active'));
    expect(active).toBeTruthy();
    expect(active?.getAttribute('href')).toBe('/people');
  });

  it('renders the collapse-toggle button when onToggleCollapse is supplied', () => {
    currentRoles = ['admin'];
    renderRoute(
      <SidebarNavV2 activePath="/" routes={appRoutes} onToggleCollapse={() => {}} />,
    );
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });
});
