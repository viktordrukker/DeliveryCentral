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
      const actualRoles = routerLeafRoutes.get(route.path) ?? ALL_ROLES;
      expect(
        actualRoles,
        `router allowedRoles for ${route.path} diverge from manifest`,
      ).toEqual(route.allowedRoles);
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
      // LEAN-P2 exit-gate: /staffing-board and /assignments are now redirect-
      // only paths with allowedRoles: ALL_ROLES in the manifest (RBAC is
      // enforced at the canonical /staffing-desk destination). They remain
      // navVisible: false so the sidebar still hides them for employees.
      { role: 'employee', visible: ['/dashboard/employee', '/people', '/projects', '/settings/account'], hidden: ['/admin'] },
      { role: 'project_manager', visible: ['/dashboard/project-manager', '/staffing-requests', '/reports/time'], hidden: ['/admin', '/workload'] },
      { role: 'resource_manager', visible: ['/dashboard/resource-manager', '/workload', '/resource-pools', '/staffing-board'], hidden: ['/admin'] },
      // F-12.4 / D-101 — /admin/dictionaries consolidated into /metadata-admin (now HR-visible via widened RBAC).
      { role: 'hr_manager', visible: ['/dashboard/hr', '/metadata-admin', '/admin/audit', '/leave'], hidden: ['/admin/settings'] },
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

describe('W1 routing bundle — short-form aliases', () => {
  const aliasPairs: Array<{ alias: string; canonical: string }> = [
    // W1-01 — short-form dashboard aliases.
    { alias: '/dashboard/dm', canonical: '/dashboard/delivery-manager' },
    { alias: '/dashboard/pm', canonical: '/dashboard/project-manager' },
    { alias: '/dashboard/rm', canonical: '/dashboard/resource-manager' },
    // W1-02 — /me/:tab nested routes resolve into the workspace shell.
    { alias: '/me/overview', canonical: '/me?tab=overview' },
    { alias: '/me/time', canonical: '/me?tab=time' },
    { alias: '/me/leave', canonical: '/me?tab=leave' },
    { alias: '/me/projects', canonical: '/me?tab=projects' },
    { alias: '/me/skills', canonical: '/me?tab=skills' },
    { alias: '/me/inbox', canonical: '/me?tab=inbox' },
    { alias: '/me/profile', canonical: '/me?tab=settings' },
    { alias: '/me/settings', canonical: '/me?tab=settings' },
    { alias: '/me/cases', canonical: '/cases' },
    // W1-04 — /approvals/queue redirect.
    { alias: '/approvals/queue', canonical: '/approvals' },
  ];

  it('registers every alias in the manifest', () => {
    const manifestPaths = new Set(routeManifest.map((r) => r.path));
    for (const { alias } of aliasPairs) {
      expect(manifestPaths.has(alias), `manifest missing alias ${alias}`).toBe(true);
    }
  });

  it('aliases are reachable by every role', () => {
    for (const { alias } of aliasPairs) {
      for (const role of ALL_ROLES) {
        expect(canAccessRoute(alias, [role]), `${role} should access ${alias}`).toBe(true);
      }
    }
  });

  it('keeps aliases hidden from the sidebar', () => {
    const navPaths = new Set(appRoutes.map((r) => r.path));
    for (const { alias } of aliasPairs) {
      expect(navPaths.has(alias), `${alias} should not be in the sidebar`).toBe(false);
    }
  });
});

describe('FE↔BE RBAC contract — position create/transition gates', () => {
  // Mirror of backend `STAFFING_ROLES` (src/shared/auth/role-presets.ts),
  // the gate on `POST /project-positions`. Kept in sync with the backend
  // contract spec `test/unit/project-positions/project-positions.controller.rbac.spec.ts`.
  const backendStaffingRoles = [
    'project_manager',
    'resource_manager',
    'delivery_manager',
    'director',
    'admin',
  ].sort();

  it('every position-create surface offers exactly the roles the BE create gate accepts', () => {
    for (const path of ['/staffing-desk/positions/new', '/staffing-requests/new', '/staffing-requests/bulk']) {
      const allowed = getAllowedRoles(path);
      expect(allowed, `manifest missing ${path}`).toBeDefined();
      expect([...allowed!].sort(), `roles mismatch on ${path}`).toEqual(backendStaffingRoles);
      expect(allowed).toContain('resource_manager');
    }
  });

  it('hr_manager can reach the position detail surface that hosts the ON_HOLD transition', () => {
    // BE `POST /project-positions/:id/transition` admits STAFFING_ROLES ∪
    // HR_GOVERNANCE_ROLES; the entity matrix limits HR to the ON_HOLD edges.
    expect(canAccessRoute('/assignments/:id', ['hr_manager'])).toBe(true);
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
    // NOTE: mustSee / mustNotSee assert what renders in the sidebar (navVisible: true).
    // Routes like 'Staffing Requests', 'Workload Matrix', 'Workload Planning',
    // 'Staffing Board' are accessible by URL but deliberately hidden from the sidebar
    // (navVisible: false in route-manifest.ts) to keep the sidebar compact — so they
    // are NOT expected in the persona "mustSee" lists.
    employee: {
      minNav: 8,
      // /assignments narrowed to STAFFING_DESK_ROLES (customer-walk fix #11) — no longer in employee nav.
      mustSee: ['Workload Overview', 'Employee Dashboard', 'People', 'Projects', 'My Time', 'Cases'],
      mustNotSee: ['Admin', 'Platform Settings', 'Staffing Board', 'Workload Matrix', 'Workload Planning', 'Resource Pools', 'Assignments'],
    },
    // Per Decision-11, per-role dashboards are navVisible: false in favour of the
    // merged Manager Dashboard / Exec Dashboard. The per-role pages remain routable.
    project_manager: {
      minNav: 15,
      // LEAN-P2 exit-gate: /assignments is now navVisible: false (legacy page
      // deleted; route redirects to /staffing-desk). 'Assignments' no longer
      // surfaces in the sidebar for any role.
      mustSee: ['Manager Dashboard', 'Projects', 'Time Management', 'Time Analytics', 'Exceptions', 'Report Builder'],
      mustNotSee: ['Admin', 'Platform Settings', 'Workload Matrix', 'Resource Pools'],
    },
    resource_manager: {
      minNav: 15,
      mustSee: ['Manager Dashboard', 'Resource Pools', 'Exceptions'],
      mustNotSee: ['Admin', 'Platform Settings'],
    },
    hr_manager: {
      minNav: 15,
      // F-12.4 / D-101 — 'Admin Dictionaries' folded into 'Metadata / Admin'.
      mustSee: ['Employee Dashboard', 'Exec Dashboard', 'People', 'Metadata / Admin', 'Business Audit', 'Bulk Import', 'Time Analytics', 'Exceptions'],
      mustNotSee: ['Platform Settings', 'Webhooks', 'HRIS Integration', 'Access Policies'],
    },
    delivery_manager: {
      minNav: 15,
      mustSee: ['Manager Dashboard', 'Planned vs Actual Time', 'Export Centre', 'Capitalisation', 'Exceptions'],
      mustNotSee: ['Admin', 'Platform Settings', 'Workload Matrix'],
    },
    // /admin/integrations narrowed to ADMIN_ONLY_ROLES (customer-walk fix #9).
    // /admin/monitoring widened to MONITORING_ROLES (W1-26): director sees read-only platform health.
    director: {
      minNav: 20,
      mustSee: ['Employee Dashboard', 'Exec Dashboard', 'Manager Dashboard', 'Admin Notifications', 'Integrations', 'Admin Monitoring'],
      mustNotSee: ['Platform Settings', 'Webhooks', 'HRIS Integration', 'Access Policies', 'Admin Integrations'],
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
    // 'Workload Matrix' and 'Staffing Board' are navVisible: false — reachable
    // by URL but intentionally not in the sidebar. Resource Pools is the
    // sidebar-visible resource-manager hub.
    expect(titles).toContain('Resource Pools');
    expect(titles).not.toContain('Platform Settings');
  });

  it('shows HR-specific admin routes in collapsed rail for hr_manager', () => {
    currentRoles = ['hr_manager'];

    // F-12.4 / D-101 — activePath now /metadata-admin (consolidated from /admin/dictionaries).
    renderRoute(<SidebarNav activePath="/metadata-admin" collapsed routes={appRoutes} />);

    const links = screen.getAllByRole('link');
    const titles = links.map((l) => l.getAttribute('title'));
    expect(titles).toContain('Metadata / Admin');
    expect(titles).toContain('Business Audit');
    expect(titles).not.toContain('Platform Settings');
  });

  it('shows director-level routes in collapsed rail for director', () => {
    currentRoles = ['director'];

    renderRoute(<SidebarNav activePath="/admin/notifications" collapsed routes={appRoutes} />);

    const links = screen.getAllByRole('link');
    const titles = links.map((l) => l.getAttribute('title'));
    expect(titles).toContain('Admin Notifications');
    // Admin Integrations + Admin Monitoring narrowed to ADMIN_ONLY_ROLES (customer-walk fix #9).
    expect(titles).not.toContain('Admin Integrations');
    expect(titles).not.toContain('Platform Settings');
    expect(titles).not.toContain('Webhooks');
  });
});
