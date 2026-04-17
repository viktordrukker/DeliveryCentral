import { ReactElement } from 'react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { appRouter } from '@/app/router';
import {
  ALL_ROLES,
  appRoutes,
  canAccessRoute,
  EMPLOYEE_DASHBOARD_ROLES,
  getAllowedRoles,
  getVisibleNavigationRoutes,
  hasAnyRole,
  routeManifest,
  type AppRole,
} from '@/app/route-manifest';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { RoleGuard } from '@/routes/RoleGuard';
import { renderRoute } from '@test/render-route';

let currentRoles: AppRole[] = ['admin'];

vi.mock('@/app/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/auth-context')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      principal: { personId: 'test-user', roles: currentRoles },
    }),
  };
});

vi.mock('@/lib/api/inbox', () => ({
  fetchInbox: vi.fn().mockResolvedValue([]),
  markAllRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

function flattenLeafRoutes(
  routes: Array<{ children?: unknown[]; element?: ReactElement; path?: string }>,
  parentPath = '',
): Array<{ allowedRoles?: AppRole[]; path: string }> {
  return routes.flatMap((route) => {
    const routePath = route.path ?? '';
    const absolutePath = routePath === '/'
      ? '/'
      : routePath.startsWith('/')
        ? routePath
        : parentPath === '/' || parentPath === ''
          ? `/${routePath}`
          : `${parentPath}/${routePath}`;

    if (Array.isArray(route.children) && route.children.length > 0) {
      const nextParent = route.path === '/' ? '/' : absolutePath;
      return flattenLeafRoutes(route.children as Array<{ children?: unknown[]; element?: ReactElement; path?: string }>, nextParent);
    }

    if (!route.path || route.path === '*') {
      return [];
    }

    const allowedRoles = route.element?.type === RoleGuard
      ? (route.element.props.allowedRoles as AppRole[])
      : undefined;

    return [{ allowedRoles, path: absolutePath }];
  });
}

describe('route manifest', () => {
  beforeEach(() => {
    currentRoles = ['admin'];
  });

  it('keeps router permissions aligned with the shared manifest', () => {
    const routerLeafRoutes = new Map(
      flattenLeafRoutes(appRouter.routes as Array<{ children?: unknown[]; element?: ReactElement; path?: string }>)
        .map((route) => [route.path, route.allowedRoles]),
    );

    for (const route of routeManifest) {
      if (route.path.startsWith('/auth/') || route.path === '/login' || route.path === '/forgot-password' || route.path === '/reset-password') {
        continue;
      }

      expect(routerLeafRoutes.has(route.path), `missing router route for ${route.path}`).toBe(true);
      expect(routerLeafRoutes.get(route.path) ?? ALL_ROLES).toEqual(route.allowedRoles);
    }
  });

  it('keeps visible navigation routes aligned with manifest entries', () => {
    const manifestNavigationPaths = routeManifest.filter((route) => route.navVisible).map((route) => route.path);
    expect(appRoutes.map((route) => route.path)).toEqual(manifestNavigationPaths);
  });

  it('allows employees to see and access their dashboard route', () => {
    expect(EMPLOYEE_DASHBOARD_ROLES).toContain('employee');
    expect(canAccessRoute('/dashboard/employee', ['employee'])).toBe(true);
    expect(
      getVisibleNavigationRoutes(['employee']).some((route) => route.path === '/dashboard/employee'),
    ).toBe(true);
  });

  it('maps critical persona paths consistently', () => {
    const expectations: Array<{ hidden?: string[]; role: AppRole; visible: string[] }> = [
      { role: 'employee', visible: ['/dashboard/employee', '/people', '/projects', '/assignments', '/settings/account'], hidden: ['/admin', '/staffing-board'] },
      { role: 'project_manager', visible: ['/dashboard/project-manager', '/staffing-requests', '/reports/time'], hidden: ['/admin', '/workload'] },
      { role: 'resource_manager', visible: ['/dashboard/resource-manager', '/workload', '/resource-pools', '/staffing-board'], hidden: ['/admin'] },
      { role: 'hr_manager', visible: ['/dashboard/hr', '/admin/dictionaries', '/admin/audit', '/leave'], hidden: ['/admin/settings'] },
      { role: 'director', visible: ['/dashboard/director', '/integrations', '/admin/notifications', '/staffing-board'], hidden: ['/admin/settings'] },
      { role: 'admin', visible: ['/admin', '/admin/settings', '/admin/access-policies', '/dashboard/employee'], hidden: [] },
    ];

    expectations.forEach(({ hidden = [], role, visible }) => {
      visible.forEach((path) => expect(canAccessRoute(path, [role]), `${role} should access ${path}`).toBe(true));
      hidden.forEach((path) => expect(canAccessRoute(path, [role]), `${role} should not access ${path}`).toBe(false));
    });
  });
});

describe('visible-but-forbidden and forbidden-but-visible mismatch detection', () => {
  const routerLeafRoutes = new Map(
    flattenLeafRoutes(appRouter.routes as Array<{ children?: unknown[]; element?: ReactElement; path?: string }>)
      .map((route) => [route.path, route.allowedRoles]),
  );

  it('has no routes visible in nav but missing from router', () => {
    const missingFromRouter = appRoutes.filter(
      (navRoute) => !routerLeafRoutes.has(navRoute.path),
    );
    expect(missingFromRouter.map((r) => r.path)).toEqual([]);
  });

  it('has no nav-visible routes with stricter manifest permissions than router', () => {
    const mismatches: string[] = [];

    for (const navRoute of appRoutes) {
      const manifestRoles = getAllowedRoles(navRoute.path);
      const routerRoles = routerLeafRoutes.get(navRoute.path);

      if (!manifestRoles || !routerRoles) continue;

      const manifestSet = new Set(manifestRoles);
      const routerSet = new Set(routerRoles);

      for (const role of manifestSet) {
        if (!routerSet.has(role)) {
          mismatches.push(`${navRoute.path}: manifest allows ${role} but router does not`);
        }
      }
      for (const role of routerSet) {
        if (!manifestSet.has(role)) {
          mismatches.push(`${navRoute.path}: router allows ${role} but manifest does not`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('every role sees at least one dashboard and one nav route', () => {
    for (const role of ALL_ROLES) {
      const visible = getVisibleNavigationRoutes([role]);
      expect(visible.length, `${role} should see at least one nav route`).toBeGreaterThan(0);

      const dashboards = visible.filter((r) => r.group === 'dashboard');
      expect(dashboards.length, `${role} should see at least one dashboard`).toBeGreaterThan(0);
    }
  });

  it('no route is visible in sidebar but forbidden by canAccessRoute for the same role', () => {
    const failures: string[] = [];

    for (const role of ALL_ROLES) {
      const visiblePaths = getVisibleNavigationRoutes([role]).map((r) => r.path);
      for (const path of visiblePaths) {
        if (!canAccessRoute(path, [role])) {
          failures.push(`${role}: ${path} is visible in nav but canAccessRoute returns false`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('no route allowed by canAccessRoute is hidden from nav when navVisible is true in manifest', () => {
    const failures: string[] = [];
    const navVisiblePaths = new Set(routeManifest.filter((r) => r.navVisible).map((r) => r.path));

    for (const role of ALL_ROLES) {
      for (const entry of routeManifest) {
        if (!entry.navVisible) continue;
        const allowed = canAccessRoute(entry.path, [role]);
        const visible = getVisibleNavigationRoutes([role]).some((r) => r.path === entry.path);
        if (allowed && !visible && navVisiblePaths.has(entry.path)) {
          failures.push(`${role}: ${entry.path} is accessible but hidden from nav`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

describe('hasAnyRole helper', () => {
  it('returns true when user has a matching role', () => {
    expect(hasAnyRole(['admin', 'employee'], ['admin'])).toBe(true);
  });

  it('returns false when no roles match', () => {
    expect(hasAnyRole(['employee'], ['admin', 'director'])).toBe(false);
  });

  it('returns false for undefined roles', () => {
    expect(hasAnyRole(undefined, ['admin'])).toBe(false);
  });

  it('returns false for empty user roles', () => {
    expect(hasAnyRole([], ['admin'])).toBe(false);
  });
});

describe('persona smoke: full navigation coverage per role', () => {
  const roleExpectations: Record<AppRole, { minNav: number; mustSee: string[]; mustNotSee: string[] }> = {
    employee: {
      minNav: 8,
      mustSee: ['Workload Overview', 'Employee Dashboard', 'People', 'Projects', 'Assignments', 'My Time', 'Cases', 'Staffing Requests'],
      mustNotSee: ['Admin', 'Platform Settings', 'Staffing Board', 'Workload Matrix', 'Workload Planning', 'Resource Pools'],
    },
    project_manager: {
      minNav: 15,
      mustSee: ['PM Dashboard', 'Projects', 'Assignments', 'Time Management', 'Time Analytics', 'Staffing Requests', 'Exceptions', 'Report Builder'],
      mustNotSee: ['Admin', 'Platform Settings', 'Workload Matrix', 'Resource Pools'],
    },
    resource_manager: {
      minNav: 15,
      mustSee: ['RM Dashboard', 'Resource Pools', 'Workload Matrix', 'Workload Planning', 'Staffing Board', 'Assignments', 'Exceptions'],
      mustNotSee: ['Admin', 'Platform Settings'],
    },
    hr_manager: {
      minNav: 15,
      mustSee: ['Employee Dashboard', 'HR Dashboard', 'People', 'Admin Dictionaries', 'Business Audit', 'Bulk Import', 'Time Analytics', 'Exceptions'],
      mustNotSee: ['Platform Settings', 'Webhooks', 'HRIS Integration', 'Access Policies'],
    },
    delivery_manager: {
      minNav: 15,
      mustSee: ['Delivery Dashboard', 'Planned vs Actual Time', 'Staffing Board', 'Export Centre', 'Capitalisation', 'Assignments', 'Exceptions'],
      mustNotSee: ['Admin', 'Platform Settings', 'Workload Matrix'],
    },
    director: {
      minNav: 20,
      mustSee: ['Employee Dashboard', 'HR Dashboard', 'PM Dashboard', 'RM Dashboard', 'Delivery Dashboard', 'Workload Matrix', 'Staffing Board', 'Admin Notifications', 'Admin Integrations', 'Admin Monitoring', 'Integrations'],
      mustNotSee: ['Platform Settings', 'Webhooks', 'HRIS Integration', 'Access Policies'],
    },
    admin: {
      minNav: 25,
      mustSee: ['Employee Dashboard', 'Admin', 'Platform Settings', 'Webhooks', 'HRIS Integration', 'Access Policies', 'Metadata / Admin'],
      mustNotSee: [],
    },
  };

  for (const [role, { minNav, mustSee, mustNotSee }] of Object.entries(roleExpectations) as Array<[AppRole, typeof roleExpectations[AppRole]]>) {
    describe(`${role} persona`, () => {
      it(`sees at least ${minNav} navigation items`, () => {
        const visible = getVisibleNavigationRoutes([role]);
        expect(visible.length).toBeGreaterThanOrEqual(minNav);
      });

      it('sees expected routes by title', () => {
        const visibleTitles = new Set(getVisibleNavigationRoutes([role]).map((r) => r.title));
        for (const title of mustSee) {
          expect(visibleTitles.has(title), `${role} should see "${title}"`).toBe(true);
        }
      });

      it('does not see forbidden routes by title', () => {
        const visibleTitles = new Set(getVisibleNavigationRoutes([role]).map((r) => r.title));
        for (const title of mustNotSee) {
          expect(visibleTitles.has(title), `${role} should not see "${title}"`).toBe(false);
        }
      });
    });
  }
});

describe('sidebar navigation parity', () => {
  it('does not show forbidden routes and keeps critical routes visible for employees', () => {
    currentRoles = ['employee'];

    renderRoute(<SidebarNav activePath="/dashboard/employee" routes={appRoutes} />);

    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('exposes admin-only controls to admins', () => {
    currentRoles = ['admin'];

    renderRoute(<SidebarNav activePath="/admin" routes={appRoutes} />);

    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('Platform Settings')).toBeInTheDocument();
    expect(getAllowedRoles('/admin/settings')).toEqual(['admin']);
  });

  it('shows resource manager specific routes in collapsed rail', () => {
    currentRoles = ['resource_manager'];

    renderRoute(<SidebarNav activePath="/workload" collapsed routes={appRoutes} />);

    const links = screen.getAllByRole('link');
    const titles = links.map((l) => l.getAttribute('title'));
    expect(titles).toContain('Workload Matrix');
    expect(titles).toContain('Resource Pools');
    expect(titles).toContain('Staffing Board');
    expect(titles).not.toContain('Platform Settings');
  });

  it('shows HR-specific admin routes in collapsed rail for hr_manager', () => {
    currentRoles = ['hr_manager'];

    renderRoute(<SidebarNav activePath="/admin/dictionaries" collapsed routes={appRoutes} />);

    const links = screen.getAllByRole('link');
    const titles = links.map((l) => l.getAttribute('title'));
    expect(titles).toContain('Admin Dictionaries');
    expect(titles).toContain('Business Audit');
    expect(titles).not.toContain('Platform Settings');
  });

  it('shows director-level routes in collapsed rail for director', () => {
    currentRoles = ['director'];

    renderRoute(<SidebarNav activePath="/admin/notifications" collapsed routes={appRoutes} />);

    const links = screen.getAllByRole('link');
    const titles = links.map((l) => l.getAttribute('title'));
    expect(titles).toContain('Admin Notifications');
    expect(titles).toContain('Admin Integrations');
    expect(titles).not.toContain('Platform Settings');
    expect(titles).not.toContain('Webhooks');
  });
});
