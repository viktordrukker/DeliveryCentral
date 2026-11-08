/**
 * W1-23..W1-27 — RBAC regression coverage for the surfaces tightened in the
 * Wave-1 batch. Each test pins the FE allowlist to the corresponding BE
 * `@RequireRoles(...)` allowlist so future drift is caught at build time.
 *
 * BE references:
 *   - `/api/staffing-requests/:id`           → `STAFFING_ROLES` (PM/RM/DM/director/admin)
 *   - `/api/people/bench`                     → `STAFFING_ROLES`
 *   - `/api/staffing/positions/:id/auto-match` → `STAFFING_ROLES` (DistributionStudio canEdit)
 *   - `/api/org/managers/:id/scope`           → `ALL_MANAGER_ROLES` + AllowSelfScope
 *   - `/api/admin/monitoring` (read-only)     → director + admin (FE only — BE is admin)
 *   - `/api/admin/notifications` (write)      → admin (FE) — director is read-only
 *   - `/api/admin/audit`                      → cookie-based session (no token field)
 */
import { describe, expect, it } from 'vitest';

import {
  ALL_ROLES,
  BENCH_PAGE_ROLES,
  canAccessRoute,
  DIRECTOR_ADMIN_ROLES,
  MONITORING_ROLES,
  STAFFING_REQUEST_DETAIL_ROLES,
} from '@/app/route-manifest';

describe('W1-23 — /staffing-requests/:id', () => {
  it('matches BE STAFFING_ROLES exactly (PM+RM+DM+director+admin)', () => {
    expect(STAFFING_REQUEST_DETAIL_ROLES.slice().sort()).toEqual(
      ['admin', 'delivery_manager', 'director', 'project_manager', 'resource_manager'].sort(),
    );
  });

  it('blocks employees and HR managers from the manifest', () => {
    expect(STAFFING_REQUEST_DETAIL_ROLES).not.toContain('employee');
    expect(STAFFING_REQUEST_DETAIL_ROLES).not.toContain('hr_manager');
  });
});

describe('W1-24 — /dashboard/hr + /dashboard/pm personId overlay gate', () => {
  // The personId-overlay gate lives inside the page component; this test
  // codifies the rule: only director/admin can overlay other people's
  // dashboards. Other roles fall through to their own personId.
  it('director and admin can overlay other peoples dashboards', () => {
    expect(DIRECTOR_ADMIN_ROLES).toContain('director');
    expect(DIRECTOR_ADMIN_ROLES).toContain('admin');
  });

  it('PM / RM / HR / DM / employee cannot overlay others', () => {
    expect(DIRECTOR_ADMIN_ROLES).not.toContain('project_manager');
    expect(DIRECTOR_ADMIN_ROLES).not.toContain('resource_manager');
    expect(DIRECTOR_ADMIN_ROLES).not.toContain('hr_manager');
    expect(DIRECTOR_ADMIN_ROLES).not.toContain('delivery_manager');
    expect(DIRECTOR_ADMIN_ROLES).not.toContain('employee');
  });
});

describe('W1-25 — /people/bench role allowlist', () => {
  it('matches BE STAFFING_ROLES (PM+RM+DM+director+admin)', () => {
    expect(BENCH_PAGE_ROLES.slice().sort()).toEqual(
      ['admin', 'delivery_manager', 'director', 'project_manager', 'resource_manager'].sort(),
    );
  });

  it('grants /people/bench access to PM (previously blocked under RESOURCE_POOL_ROLES)', () => {
    expect(canAccessRoute('/people/bench', ['project_manager'])).toBe(true);
  });

  it('grants /people/bench access to DM (previously blocked under RESOURCE_POOL_ROLES)', () => {
    expect(canAccessRoute('/people/bench', ['delivery_manager'])).toBe(true);
  });

  it('keeps RM/director/admin access', () => {
    expect(canAccessRoute('/people/bench', ['resource_manager'])).toBe(true);
    expect(canAccessRoute('/people/bench', ['director'])).toBe(true);
    expect(canAccessRoute('/people/bench', ['admin'])).toBe(true);
  });

  it('still blocks employees and HR managers', () => {
    expect(canAccessRoute('/people/bench', ['employee'])).toBe(false);
    expect(canAccessRoute('/people/bench', ['hr_manager'])).toBe(false);
  });
});

describe('W1-26 — /admin/monitoring widening + /admin/notifications gating', () => {
  it('/admin/monitoring grants director access (read-only)', () => {
    expect(MONITORING_ROLES).toEqual(['director', 'admin']);
    expect(canAccessRoute('/admin/monitoring', ['director'])).toBe(true);
    expect(canAccessRoute('/admin/monitoring', ['admin'])).toBe(true);
  });

  it('/admin/monitoring still blocks non-exec/non-admin roles', () => {
    expect(canAccessRoute('/admin/monitoring', ['employee'])).toBe(false);
    expect(canAccessRoute('/admin/monitoring', ['hr_manager'])).toBe(false);
    expect(canAccessRoute('/admin/monitoring', ['project_manager'])).toBe(false);
    expect(canAccessRoute('/admin/monitoring', ['resource_manager'])).toBe(false);
    expect(canAccessRoute('/admin/monitoring', ['delivery_manager'])).toBe(false);
  });

  it('/admin/notifications stays director+admin in the manifest', () => {
    expect(canAccessRoute('/admin/notifications', ['director'])).toBe(true);
    expect(canAccessRoute('/admin/notifications', ['admin'])).toBe(true);
    expect(canAccessRoute('/admin/notifications', ['employee'])).toBe(false);
  });
});

describe('W1-27 — /org/managers/:id/scope still allows all roles via FE manifest', () => {
  // BE controller uses ALL_MANAGER_ROLES + @AllowSelfScope({ param: 'id' }),
  // so employees can hit their own scope. FE keeps ALL_ROLES + RoleGuard
  // wrapper; BE owns the self-scope authorization decision.
  it('manifest allows every role at the FE entry point', () => {
    for (const role of ALL_ROLES) {
      expect(canAccessRoute('/org/managers/:id/scope', [role])).toBe(true);
    }
  });
});
