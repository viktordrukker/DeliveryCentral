import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { AppRole } from '@/app/route-manifest';
import { HomeRedirect } from './HomeRedirect';

let dsRefreshEnabled = false;
let currentRoles: AppRole[] = ['employee'];

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => (id === 'dsRefresh' ? dsRefreshEnabled : false),
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

// DashboardPage transitively pulls heavy modules — stub it for these tests.
vi.mock('@/routes/dashboard/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="legacy-dashboard-page">Workload Overview</div>,
}));

function renderHome(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/me" element={<div data-testid="me">/me Home</div>} />
        <Route
          path="/dashboard/director"
          element={<div data-testid="director">Director Home</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomeRedirect — Phase E1', () => {
  it('renders the legacy DashboardPage when dsRefresh is OFF', async () => {
    dsRefreshEnabled = false;
    currentRoles = ['employee'];
    renderHome();
    // W4-03 — DashboardPage is now code-split via React.lazy + Suspense, so
    // the very first render shows the Suspense fallback ("Loading...") while
    // the chunk resolves. Awaiting findByTestId covers both the fallback and
    // the resolved lazy module.
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByTestId('legacy-dashboard-page')).toBeInTheDocument();
  });

  it('redirects employee to /me when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    currentRoles = ['employee'];
    renderHome();
    expect(screen.getByTestId('me')).toBeInTheDocument();
  });

  it('redirects director to /dashboard/director when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    currentRoles = ['director'];
    renderHome();
    expect(screen.getByTestId('director')).toBeInTheDocument();
  });

  it('redirects admin to /dashboard/director when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    currentRoles = ['admin'];
    renderHome();
    expect(screen.getByTestId('director')).toBeInTheDocument();
  });

  it('redirects PM (no director/admin role) to /me when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    currentRoles = ['project_manager'];
    renderHome();
    expect(screen.getByTestId('me')).toBeInTheDocument();
  });

  it('redirects HR manager to /me when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    currentRoles = ['hr_manager'];
    renderHome();
    expect(screen.getByTestId('me')).toBeInTheDocument();
  });

  it('redirects a dual-role admin+something to /dashboard/director', () => {
    dsRefreshEnabled = true;
    currentRoles = ['admin', 'hr_manager'];
    renderHome();
    expect(screen.getByTestId('director')).toBeInTheDocument();
  });
});
