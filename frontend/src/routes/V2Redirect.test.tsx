import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { V2Redirect } from './V2Redirect';

let dsRefreshEnabled = false;

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => (id === 'dsRefresh' ? dsRefreshEnabled : false),
  };
});

function renderAt(path: string, element: JSX.Element): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="/me" element={<div data-testid="me-home">Me Home</div>} />
        <Route
          path="/dashboard/director"
          element={<div data-testid="director-home">Director Home</div>}
        />
        <Route path="/admin" element={<div data-testid="admin-home">Admin Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('V2Redirect — Phase E5', () => {
  it('renders legacy children when dsRefresh is OFF', () => {
    dsRefreshEnabled = false;
    renderAt(
      '/dashboard/manager',
      <V2Redirect to="/me">
        <div data-testid="legacy-manager">Legacy Manager Dashboard</div>
      </V2Redirect>,
    );
    expect(screen.getByTestId('legacy-manager')).toBeInTheDocument();
  });

  it('redirects to v2 target when dsRefresh is ON (dashboard/manager → /me)', () => {
    dsRefreshEnabled = true;
    renderAt(
      '/dashboard/manager',
      <V2Redirect to="/me">
        <div data-testid="legacy-manager">Legacy Manager Dashboard</div>
      </V2Redirect>,
    );
    expect(screen.getByTestId('me-home')).toBeInTheDocument();
  });

  it('redirects /dashboard/exec → /dashboard/director when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    renderAt(
      '/dashboard/exec',
      <V2Redirect to="/dashboard/director">
        <div data-testid="legacy-exec">Legacy Exec Dashboard</div>
      </V2Redirect>,
    );
    expect(screen.getByTestId('director-home')).toBeInTheDocument();
  });

  it('redirects /integrations → /admin?section=integrations when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    renderAt(
      '/integrations',
      <V2Redirect to="/admin?section=integrations">
        <div data-testid="legacy-integrations">Legacy Integrations</div>
      </V2Redirect>,
    );
    expect(screen.getByTestId('admin-home')).toBeInTheDocument();
  });
});
