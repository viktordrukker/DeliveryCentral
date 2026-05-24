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
