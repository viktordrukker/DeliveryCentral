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

  it('produces exactly 10 sidebar items after obsoleteInV2 filter', () => {
    // Canvas authoritative count: 4 Workspace + 4 Workforce + 2 Operations.
    // If this number drifts, the canvas-required labels assertion below tells
    // you which item was added/removed.
    const routes = v2NavRoutes();
    expect(routes.length).toBe(10);
  });

  it('uses canvas-canonical labels via titleV2 where renamed', () => {
    const me = routeManifest.find((r) => r.path === '/me');
    const cases = routeManifest.find((r) => r.path === '/cases');
    const settings = routeManifest.find((r) => r.path === '/admin/settings');
    const staffingDesk = routeManifest.find((r) => r.path === '/staffing-desk');
    expect(me?.titleV2).toBe('Home');
    expect(cases?.titleV2).toBe('HR Queue');
    expect(settings?.titleV2).toBe('Settings');
    expect(staffingDesk?.titleV2).toBe('Staffing Desk');
  });

  it('matches the canvas-exact 10-item label set (post-Phase-E reconciliation)', () => {
    // Source of truth: DS/chrome.jsx:32-66 + amendments.
    // Reconciliation 2026-05-24: `/teams` sunset (folds into People Directory filter);
    // `/staffing-desk` promoted as Workspace flagship per staffing-desk amendment.
    const labels = v2NavRoutes().map(v2Label).sort();
    expect(labels).toEqual(
      [
        'Admin',
        'Approvals',
        'Bench',
        'HR Queue',
        'Home',
        'People',
        'Projects',
        'Reports',
        'Settings',
        'Staffing Desk',
      ].sort(),
    );
  });

  it('distributes the 10 items across 3 canvas buckets as 5 / 3 / 2', () => {
    const buckets: Record<RouteGroupV2, number> = {
      workspace: 0,
      workforce: 0,
      operations: 0,
    };
    for (const route of v2NavRoutes()) {
      const v2 = route.groupV2 ?? groupV2For(route.group!);
      buckets[v2] += 1;
    }
    expect(buckets.workspace).toBe(5); // Home, Projects, Approvals, Reports, Staffing Desk
    expect(buckets.workforce).toBe(3); // People, Bench, HR Queue
    expect(buckets.operations).toBe(2); // Admin, Settings
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

  it('excludes already-consolidated surfaces (my-time / org / assignments / resource-pools / time-management / teams)', () => {
    // /staffing-desk was previously listed here but Phase-E reconciliation
    // (2026-05-24) promoted it back as a flagship Workspace surface per the
    // staffing-desk amendment. /teams was previously a sidebar item but
    // reconciliation sunsets it into the People Directory filter.
    const paths = v2NavRoutes().map((r) => r.path);
    expect(paths).not.toContain('/my-time');
    expect(paths).not.toContain('/org');
    expect(paths).not.toContain('/assignments');
    expect(paths).not.toContain('/assignments/queue');
    expect(paths).not.toContain('/resource-pools');
    expect(paths).not.toContain('/time-management');
    expect(paths).not.toContain('/teams');
    expect(paths).not.toContain('/help');
  });

  it('exposes a /people/bench entry so canvas "Bench" item resolves', () => {
    const bench = routeManifest.find((r) => r.path === '/people/bench');
    expect(bench).toBeDefined();
    expect(bench?.navVisible).toBe(true);
    expect(bench?.titleV2).toBe('Bench');
  });
});
