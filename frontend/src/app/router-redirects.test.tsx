/**
 * Wave 1 / W1-21 + W1-22 — V2 redirect coverage.
 *
 * Asserts the router-level redirects added for the V2 last-stand:
 *
 *   W1-21: /assignments/new       → /staffing-requests/new (preserves projectId)
 *   W1-22: /time-management       → /approvals (when dsRefresh is ON only)
 *
 * Both surfaces are reachable in v2-staging where dsRefresh + workspaceMe are
 * forced ON; the legacy interim-assignment + manager-timesheet pages are being
 * retired into the lean ProjectPosition + unified /approvals queue.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { isFeatureEnabled } from '@/lib/feature-flags';
import { V2Redirect } from '@/routes/V2Redirect';

let dsRefreshEnabled = false;

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => (id === 'dsRefresh' ? dsRefreshEnabled : false),
  };
});

// Inline copy of the redirect helper from `router.tsx`. The helper is a
// private function inside the router module — re-declaring it here keeps the
// test independent of the giant `createBrowserRouter` graph (which pulls in
// the full app shell).
function AssignmentsNewRedirect(): JSX.Element {
  const [params] = useSearchParams();
  const projectId = params.get('projectId');
  const target = projectId
    ? `/staffing-requests/new?projectId=${encodeURIComponent(projectId)}`
    : '/staffing-requests/new';
  return <Navigate to={target} replace />;
}

function LocationProbe(): JSX.Element {
  const loc = useLocation();
  return (
    <div data-testid="location">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function renderAt(initial: string, path: string, element: JSX.Element): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('W1-21 — /assignments/new → /staffing-requests/new', () => {
  it('redirects bare /assignments/new to /staffing-requests/new', () => {
    renderAt('/assignments/new', '/assignments/new', <AssignmentsNewRedirect />);
    expect(screen.getByTestId('location').textContent).toBe('/staffing-requests/new');
  });

  it('preserves the projectId query param', () => {
    renderAt(
      '/assignments/new?projectId=prj-123',
      '/assignments/new',
      <AssignmentsNewRedirect />,
    );
    expect(screen.getByTestId('location').textContent).toBe(
      '/staffing-requests/new?projectId=prj-123',
    );
  });

  it('URL-encodes a projectId containing reserved characters', () => {
    renderAt(
      '/assignments/new?projectId=prj+with%2Fslash',
      '/assignments/new',
      <AssignmentsNewRedirect />,
    );
    // useSearchParams already decodes, so projectId here is the literal
    // "prj with/slash"; encodeURIComponent re-encodes ` ` → %20, `/` → %2F.
    expect(screen.getByTestId('location').textContent).toBe(
      '/staffing-requests/new?projectId=prj%20with%2Fslash',
    );
  });

  it('drops other query params (only projectId is carried)', () => {
    renderAt(
      '/assignments/new?projectId=prj-1&foo=bar',
      '/assignments/new',
      <AssignmentsNewRedirect />,
    );
    expect(screen.getByTestId('location').textContent).toBe(
      '/staffing-requests/new?projectId=prj-1',
    );
  });
});

describe('W3-12 — /timesheets retargets under dsRefresh', () => {
  it('falls through to legacy /my-time redirect when dsRefresh is OFF', () => {
    dsRefreshEnabled = false;
    renderAt(
      '/timesheets',
      '/timesheets',
      <V2Redirect to="/me?tab=time">
        <Navigate to="/my-time" replace />
      </V2Redirect>,
    );
    expect(screen.getByTestId('location').textContent).toBe('/my-time');
  });

  it('redirects to /me?tab=time when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    renderAt(
      '/timesheets',
      '/timesheets',
      <V2Redirect to="/me?tab=time">
        <Navigate to="/my-time" replace />
      </V2Redirect>,
    );
    expect(screen.getByTestId('location').textContent).toBe('/me?tab=time');
  });
});

describe('W1-22 — /time-management redirect under dsRefresh', () => {
  it('renders the legacy TimeManagementPage placeholder when dsRefresh is OFF', () => {
    dsRefreshEnabled = false;
    renderAt(
      '/time-management',
      '/time-management',
      <V2Redirect to="/approvals">
        <div data-testid="legacy-time-management">Legacy Time Management</div>
      </V2Redirect>,
    );
    expect(screen.getByTestId('legacy-time-management')).toBeInTheDocument();
    expect(isFeatureEnabled('dsRefresh')).toBe(false);
  });

  it('redirects to /approvals when dsRefresh is ON', () => {
    dsRefreshEnabled = true;
    renderAt(
      '/time-management',
      '/time-management',
      <V2Redirect to="/approvals">
        <div data-testid="legacy-time-management">Legacy Time Management</div>
      </V2Redirect>,
    );
    expect(screen.getByTestId('location').textContent).toBe('/approvals');
    expect(screen.queryByTestId('legacy-time-management')).not.toBeInTheDocument();
  });
});
