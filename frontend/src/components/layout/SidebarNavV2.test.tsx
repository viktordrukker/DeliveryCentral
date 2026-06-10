import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { appRoutes, type AppRole } from '@/app/route-manifest';
import { SidebarNavV2 } from '@/components/layout/SidebarNavV2';
import { fetchSidebarCounts } from '@/lib/api/sidebar-counts';
import { renderRoute } from '@test/render-route';

let currentRoles: AppRole[] = ['admin'];
// V2 chrome context: SidebarNavV2 only ever renders when `dsRefresh` is on,
// and the canvas 10-item contract assumes `workspaceMe` is on too.
let enabledFlags: string[] = ['dsRefresh', 'workspaceMe'];

vi.mock('@/lib/api/sidebar-counts', () => ({ fetchSidebarCounts: vi.fn() }));
const mockedFetchCounts = vi.mocked(fetchSidebarCounts);

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => enabledFlags.includes(id),
  };
});

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
    enabledFlags = ['dsRefresh', 'workspaceMe'];
    mockedFetchCounts.mockResolvedValue({ projects: 24, approvals: 7, bench: 12, hrQueue: 3 });
  });

  it('renders exactly the 10 canvas items in 5/3/2 groups with titleV2 labels for admin', async () => {
    currentRoles = ['admin'];
    const { container, user } = renderRoute(
      <SidebarNavV2 activePath="/me" routes={appRoutes} />,
    );
    // /me keeps Workspace open; expand the other two sections so every
    // group's items are in the DOM.
    await user.click(screen.getByRole('button', { name: 'Workforce' }));
    await user.click(screen.getByRole('button', { name: 'Operations' }));

    const sections = container.querySelectorAll('.sidebar-section');
    expect(sections).toHaveLength(3);
    const labelsIn = (section: Element): string[] =>
      Array.from(section.querySelectorAll('.sidebar-nav__item-title')).map(
        (el) => el.textContent ?? '',
      );

    expect(labelsIn(sections[0]).sort()).toEqual(
      ['Approvals', 'Home', 'Projects', 'Reports', 'Staffing Desk'].sort(),
    );
    expect(labelsIn(sections[1]).sort()).toEqual(['Bench', 'HR Queue', 'People'].sort());
    expect(labelsIn(sections[2]).sort()).toEqual(['Admin', 'Settings'].sort());
    expect(screen.getAllByRole('link')).toHaveLength(10);

    // titleV2 overrides the legacy title — never both.
    expect(screen.queryByText('My Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Cases')).not.toBeInTheDocument();
    // obsoleteInV2 routes never render, even for admin.
    expect(screen.queryByText('Workload Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Platform Settings')).not.toBeInTheDocument();
  });

  it('hides flag-gated routes whose flag is off (workspaceMe OFF removes Home)', () => {
    currentRoles = ['admin'];
    enabledFlags = ['dsRefresh'];
    renderRoute(<SidebarNavV2 activePath="/projects" routes={appRoutes} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
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
