import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AdminTabbedShell } from './AdminTabbedShell';

function LocationProbe(): JSX.Element {
  const loc = useLocation();
  return <div data-testid="probe-path">{loc.pathname}</div>;
}

function renderShell(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/admin/settings"
          element={
            <AdminTabbedShell title="Platform Settings" subtitle="settings copy" testId="settings-page">
              <div data-testid="page-body">settings body</div>
            </AdminTabbedShell>
          }
        />
        <Route
          path="/admin/organization-config"
          element={
            <AdminTabbedShell title="Organization configuration" subtitle="org copy" testId="organization-config-page">
              <div data-testid="page-body">org body</div>
            </AdminTabbedShell>
          }
        />
        <Route
          path="/admin/hris"
          element={
            <AdminTabbedShell title="HRIS Integration" subtitle="hris copy" testId="hris-config-page">
              <div data-testid="page-body">hris body</div>
            </AdminTabbedShell>
          }
        />
        <Route
          path="/admin/webhooks"
          element={
            <AdminTabbedShell title="Webhook Subscriptions" subtitle="webhooks copy" testId="webhooks-admin-page">
              <div data-testid="page-body">webhooks body</div>
            </AdminTabbedShell>
          }
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('AdminTabbedShell — W3-01', () => {
  it('renders the PageContainer + PageHeader + four-tab strip', () => {
    renderShell('/admin/settings');
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Platform Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('tab-settings')).toBeInTheDocument();
    expect(screen.getByTestId('tab-organization-config')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hris')).toBeInTheDocument();
    expect(screen.getByTestId('tab-webhooks')).toBeInTheDocument();
  });

  it('marks the settings tab as active when on /admin/settings', () => {
    renderShell('/admin/settings');
    expect(screen.getByTestId('tab-settings')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-hris')).toHaveAttribute('aria-selected', 'false');
  });

  it('marks the hris tab as active when on /admin/hris', () => {
    renderShell('/admin/hris');
    expect(screen.getByTestId('tab-hris')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-settings')).toHaveAttribute('aria-selected', 'false');
  });

  it('navigates to the target admin route when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderShell('/admin/settings');
    expect(screen.getByTestId('probe-path').textContent).toBe('/admin/settings');

    await user.click(screen.getByTestId('tab-webhooks'));
    expect(screen.getByTestId('probe-path').textContent).toBe('/admin/webhooks');
    expect(screen.getByRole('heading', { name: 'Webhook Subscriptions' })).toBeInTheDocument();
  });

  it('renders children below the tab strip', () => {
    renderShell('/admin/organization-config');
    expect(screen.getByTestId('page-body')).toHaveTextContent('org body');
  });
});
