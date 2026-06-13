import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppRole } from '@/app/route-manifest';
import { DashboardRedirect } from './DashboardRedirect';

let currentRoles: AppRole[] = [];
// F-REDIRECT-DASH — per-role dashboards are feature-flag gated. The redirect
// must only target one when its flag is on, else fall back to the workspace
// home. Control the flags here (default: all off, matching the real defaults).
let enabledFlags = new Set<string>();

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => enabledFlags.has(id),
  };
});

vi.mock('@/app/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/auth-context')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      principal: { personId: 'p1', displayName: 'Test', roles: currentRoles },
    }),
  };
});

function LocationProbe(): JSX.Element {
  const loc = useLocation();
  return (
    <div data-testid="location">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function renderAt(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function locationText(): string | null {
  return screen.getByTestId('location').textContent;
}

describe('DashboardRedirect — /dashboard per-role redirect', () => {
  beforeEach(() => {
    enabledFlags = new Set<string>();
    currentRoles = [];
  });

  describe('routes to the per-role dashboard when its flag is enabled', () => {
    it('director → /dashboard/director (dashDirector ON)', () => {
      enabledFlags.add('dashDirector');
      currentRoles = ['director'];
      renderAt();
      expect(locationText()).toBe('/dashboard/director');
    });

    it('admin → /dashboard/director (dashDirector ON)', () => {
      enabledFlags.add('dashDirector');
      currentRoles = ['admin'];
      renderAt();
      expect(locationText()).toBe('/dashboard/director');
    });

    it('delivery_manager → /dashboard/delivery-manager (dashDeliveryManager ON)', () => {
      enabledFlags.add('dashDeliveryManager');
      currentRoles = ['delivery_manager'];
      renderAt();
      expect(locationText()).toBe('/dashboard/delivery-manager');
    });

    it('project_manager → /dashboard/project-manager (dashProjectManager ON)', () => {
      enabledFlags.add('dashProjectManager');
      currentRoles = ['project_manager'];
      renderAt();
      expect(locationText()).toBe('/dashboard/project-manager');
    });

    it('resource_manager → /dashboard/resource-manager (dashResourceManager ON)', () => {
      enabledFlags.add('dashResourceManager');
      currentRoles = ['resource_manager'];
      renderAt();
      expect(locationText()).toBe('/dashboard/resource-manager');
    });

    it('hr_manager → /dashboard/hr (dashHr ON)', () => {
      enabledFlags.add('dashHr');
      currentRoles = ['hr_manager'];
      renderAt();
      expect(locationText()).toBe('/dashboard/hr');
    });
  });

  describe('F-REDIRECT-DASH — falls back to /me when the dashboard flag is OFF (default / v2)', () => {
    it('director → /me?tab=overview when dashDirector is OFF', () => {
      currentRoles = ['director'];
      renderAt();
      expect(locationText()).toBe('/me?tab=overview');
    });

    it('admin → /me?tab=overview when dashDirector is OFF', () => {
      currentRoles = ['admin'];
      renderAt();
      expect(locationText()).toBe('/me?tab=overview');
    });

    it('hr_manager → /me?tab=overview when dashHr is OFF', () => {
      currentRoles = ['hr_manager'];
      renderAt();
      expect(locationText()).toBe('/me?tab=overview');
    });
  });

  it('redirects employee to /me?tab=overview', () => {
    currentRoles = ['employee'];
    renderAt();
    expect(locationText()).toBe('/me?tab=overview');
  });

  it('redirects a principal with no recognized role to /me?tab=overview', () => {
    currentRoles = [];
    renderAt();
    expect(locationText()).toBe('/me?tab=overview');
  });

  it('prefers admin (director dashboard) over other roles for dual-role accounts when enabled', () => {
    enabledFlags.add('dashDirector');
    currentRoles = ['admin', 'hr_manager'];
    renderAt();
    expect(locationText()).toBe('/dashboard/director');
  });

  it('prefers delivery_manager over project_manager for dual-role accounts when enabled', () => {
    enabledFlags.add('dashDeliveryManager');
    currentRoles = ['delivery_manager', 'project_manager'];
    renderAt();
    expect(locationText()).toBe('/dashboard/delivery-manager');
  });
});
