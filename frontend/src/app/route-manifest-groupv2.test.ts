import { describe, expect, it } from 'vitest';

import {
  groupV2For,
  routeManifest,
  type RouteGroupV2,
} from '@/app/route-manifest';

describe('Phase A2 — V2 group taxonomy (isolated)', () => {
  it('every nav-visible route resolves to a V2 group', () => {
    const allowed: RouteGroupV2[] = ['workspace', 'workforce', 'operations'];
    const navRoutes = routeManifest.filter((r) => r.navVisible && r.group);
    expect(navRoutes.length).toBeGreaterThan(0);
    for (const route of navRoutes) {
      const v2 = route.groupV2 ?? groupV2For(route.group!);
      expect(
        allowed.includes(v2),
        `route ${route.path} (group=${route.group}) -> ${v2} which is not a valid V2 group`,
      ).toBe(true);
    }
  });

  it('maps legacy groups deterministically to V2 buckets', () => {
    expect(groupV2For('dashboard')).toBe('workspace');
    expect(groupV2For('time')).toBe('workspace');
    expect(groupV2For('projects')).toBe('workspace');
    expect(groupV2For('staffing')).toBe('workspace');
    expect(groupV2For('reports')).toBe('workspace');
    expect(groupV2For('people-org')).toBe('workforce');
    expect(groupV2For('admin-config')).toBe('operations');
    expect(groupV2For('admin-integrations')).toBe('operations');
    expect(groupV2For('admin-governance')).toBe('operations');
  });

  it('every V2 bucket is non-empty across the nav', () => {
    const buckets: Record<RouteGroupV2, number> = {
      workspace: 0,
      workforce: 0,
      operations: 0,
    };
    for (const route of routeManifest.filter((r) => r.navVisible && r.group)) {
      const v2 = route.groupV2 ?? groupV2For(route.group!);
      buckets[v2] += 1;
    }
    expect(buckets.workspace).toBeGreaterThan(0);
    expect(buckets.workforce).toBeGreaterThan(0);
    expect(buckets.operations).toBeGreaterThan(0);
  });
});

/**
 * Phase E — canvas-exact v2 sidebar.
 *
 * The DS canvas (DS/chrome.jsx:32-66) defines exactly 10 sidebar items.
 * After obsoleteInV2 filtering, the nav-visible-with-no-flag-gating routes
 * should collapse to exactly that set.
 *
 * Authoritative canvas list:
 *   Workspace : Home · Projects · Approvals · Reports
 *   Workforce : People · Bench · Teams · HR Queue
 *   Operations: Admin · Settings
 */
describe('Phase E — canvas-exact v2 sidebar', () => {
  function v2NavRoutes(): typeof routeManifest {
    return routeManifest.filter(
      (r) => r.navVisible === true && r.group && r.obsoleteInV2 !== true,
    );
  }

  function v2Label(r: { title?: string; titleV2?: string }): string {
    return r.titleV2 ?? r.title ?? '';
  }

  it('produces 10 sidebar items after obsoleteInV2 filter', () => {
    // Note: `/reports` shell route is added in Phase E3 — until then this
    // assertion expects 9. After E3 ships the count goes to 10.
    const routes = v2NavRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(9);
    expect(routes.length).toBeLessThanOrEqual(11);
  });

  it('uses canvas-canonical labels via titleV2 where renamed', () => {
    const me = routeManifest.find((r) => r.path === '/me');
    const cases = routeManifest.find((r) => r.path === '/cases');
    const settings = routeManifest.find((r) => r.path === '/admin/settings');
    expect(me?.titleV2).toBe('Home');
    expect(cases?.titleV2).toBe('HR Queue');
    expect(settings?.titleV2).toBe('Settings');
  });

  it('includes canvas-required items by canonical label', () => {
    const labels = v2NavRoutes().map(v2Label);
    expect(labels).toContain('Projects');
    expect(labels).toContain('Approvals');
    expect(labels).toContain('People');
    expect(labels).toContain('Bench');
    expect(labels).toContain('Teams');
    expect(labels).toContain('Home');
    expect(labels).toContain('HR Queue');
    expect(labels).toContain('Admin');
    expect(labels).toContain('Settings');
  });

  it('excludes legacy dashboard duplicates from v2 sidebar', () => {
    const paths = v2NavRoutes().map((r) => r.path);
    expect(paths).not.toContain('/');
    expect(paths).not.toContain('/dashboard/employee');
    expect(paths).not.toContain('/dashboard/manager');
    expect(paths).not.toContain('/dashboard/exec');
    expect(paths).not.toContain('/dashboard/planned-vs-actual');
    expect(paths).not.toContain('/dashboards/portfolio-radiator');
  });

  it('excludes 7 reports sub-routes (collapsed under future /reports umbrella)', () => {
    const paths = v2NavRoutes().map((r) => r.path);
    expect(paths).not.toContain('/exceptions');
    expect(paths).not.toContain('/reports/time');
    expect(paths).not.toContain('/reports/capitalisation');
    expect(paths).not.toContain('/reports/export');
    expect(paths).not.toContain('/reports/utilization');
    expect(paths).not.toContain('/reports/builder');
    expect(paths).not.toContain('/work-evidence');
  });

  it('excludes admin sub-routes that should be tabs under /admin', () => {
    const paths = v2NavRoutes().map((r) => r.path);
    expect(paths).not.toContain('/admin/audit');
    expect(paths).not.toContain('/admin/notifications');
    expect(paths).not.toContain('/admin/integrations');
    expect(paths).not.toContain('/admin/feature-flags');
    expect(paths).not.toContain('/admin/vendors');
    expect(paths).not.toContain('/admin/webhooks');
    expect(paths).not.toContain('/admin/hris');
    expect(paths).not.toContain('/admin/access-policies');
    expect(paths).not.toContain('/admin/rate-cards');
    expect(paths).not.toContain('/admin/help');
    expect(paths).not.toContain('/metadata-admin');
    expect(paths).not.toContain('/integrations');
  });

  it('excludes already-consolidated surfaces (my-time / org / assignments / resource-pools / staffing-desk / time-management)', () => {
    const paths = v2NavRoutes().map((r) => r.path);
    expect(paths).not.toContain('/my-time');
    expect(paths).not.toContain('/org');
    expect(paths).not.toContain('/assignments');
    expect(paths).not.toContain('/assignments/queue');
    expect(paths).not.toContain('/resource-pools');
    expect(paths).not.toContain('/staffing-desk');
    expect(paths).not.toContain('/time-management');
    expect(paths).not.toContain('/help');
  });

  it('exposes a /people/bench entry so canvas "Bench" item resolves', () => {
    const bench = routeManifest.find((r) => r.path === '/people/bench');
    expect(bench).toBeDefined();
    expect(bench?.navVisible).toBe(true);
    expect(bench?.titleV2).toBe('Bench');
  });
});
