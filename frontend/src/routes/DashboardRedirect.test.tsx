import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { AppRole } from '@/app/route-manifest';
import { DashboardRedirect } from './DashboardRedirect';

let currentRoles: AppRole[] = [];

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

describe('DashboardRedirect — /dashboard per-role redirect', () => {
  it('redirects director to /dashboard/director', () => {
    currentRoles = ['director'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/director');
  });

  it('redirects admin to /dashboard/director', () => {
    currentRoles = ['admin'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/director');
  });

  it('redirects delivery_manager to /dashboard/delivery-manager', () => {
    currentRoles = ['delivery_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/delivery-manager');
  });

  it('redirects project_manager to /dashboard/project-manager', () => {
    currentRoles = ['project_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/project-manager');
  });

  it('redirects resource_manager to /dashboard/resource-manager', () => {
    currentRoles = ['resource_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/resource-manager');
  });

  it('redirects hr_manager to /dashboard/hr', () => {
    currentRoles = ['hr_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/hr');
  });

  it('redirects employee to /me?tab=overview', () => {
    currentRoles = ['employee'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/me?tab=overview');
  });

  it('redirects a principal with no recognized role to /me?tab=overview', () => {
    currentRoles = [];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/me?tab=overview');
  });

  it('prefers admin over other roles for dual-role accounts', () => {
    currentRoles = ['admin', 'hr_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/director');
  });

  it('prefers director over manager roles for dual-role accounts', () => {
    currentRoles = ['director', 'project_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/director');
  });

  it('prefers delivery_manager over project_manager for dual-role accounts', () => {
    currentRoles = ['delivery_manager', 'project_manager'];
    renderAt();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/delivery-manager');
  });
});
