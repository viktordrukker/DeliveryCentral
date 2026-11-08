/**
 * W4-12 — /reports manifest flag alignment with FeatureGuard.
 *
 * The standalone `/work-evidence` route is wrapped in a
 * `<FeatureGuard feature="evidenceManagement">` in `router.tsx`. The
 * umbrella shell at `/reports?section=evidence` previously rendered the
 * same `WorkEvidencePage` *without* the same gate — meaning a tenant with
 * the `evidenceManagement` platform feature turned OFF could still see
 * the Evidence tab and its content via the umbrella, but would see the
 * "Module disabled" screen when navigating to `/work-evidence` directly.
 *
 * This test pair asserts the alignment fix:
 *   1. When `evidenceManagement.enabled === true`, the Evidence tab is
 *      present in the tab strip and the embedded `WorkEvidencePage`
 *      renders under `?section=evidence`.
 *   2. When `evidenceManagement.enabled === false`, the Evidence tab is
 *      hidden from the strip, and a deep-link to `?section=evidence`
 *      falls back to the first visible tab (Exceptions) because the
 *      section is no longer valid for this tenant.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'admin-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const evidenceMock = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/app/platform-settings-context', () => ({
  useEvidenceManagement: () => ({
    allowManualEntry: true,
    enabled: evidenceMock.enabled,
    isLoading: false,
    showDiagnosticsInCoreDashboards: false,
  }),
  usePlatformSettings: () => ({
    isLoading: false,
    settings: { evidenceManagement: { enabled: evidenceMock.enabled } },
  }),
}));

vi.mock('@/routes/exceptions/ExceptionsPage', () => ({
  ExceptionsPage: () => <div data-testid="stub-exceptions">Exceptions content</div>,
}));
vi.mock('@/routes/work-evidence/WorkEvidencePage', () => ({
  WorkEvidencePage: () => <div data-testid="stub-evidence">Evidence content</div>,
}));
vi.mock('@/routes/reports/TimeReportPage', () => ({
  TimeReportPage: () => <div data-testid="stub-time">Time content</div>,
}));
vi.mock('@/routes/reports/CapitalisationPage', () => ({
  CapitalisationPage: () => <div data-testid="stub-capitalisation">CAPEX content</div>,
}));
vi.mock('@/routes/reports/ExportCentrePage', () => ({
  ExportCentrePage: () => <div data-testid="stub-export">Export content</div>,
}));
vi.mock('@/routes/reports/UtilizationPage', () => ({
  UtilizationPage: () => <div data-testid="stub-utilization">Utilization content</div>,
}));
vi.mock('@/routes/reports/ReportBuilderPage', () => ({
  ReportBuilderPage: () => <div data-testid="stub-builder">Builder content</div>,
}));

import { ReportsPage } from './ReportsPage';

function renderReports(initialEntries: string[] = ['/reports']): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe('W4-12 — /reports Evidence tab respects the evidenceManagement FeatureGuard', () => {
  it('shows the Evidence tab when the feature is enabled', async () => {
    evidenceMock.enabled = true;
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeInTheDocument();
  });

  it('renders the embedded WorkEvidencePage when ?section=evidence and feature is enabled', async () => {
    evidenceMock.enabled = true;
    renderReports(['/reports?section=evidence']);
    await waitFor(() => expect(screen.getByTestId('stub-evidence')).toBeInTheDocument());
  });

  it('hides the Evidence tab when the feature is disabled', async () => {
    evidenceMock.enabled = false;
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    expect(screen.queryByRole('tab', { name: 'Evidence' })).not.toBeInTheDocument();
  });

  it('falls back to Exceptions when ?section=evidence is deep-linked but feature is disabled', async () => {
    evidenceMock.enabled = false;
    renderReports(['/reports?section=evidence']);
    // Section is no longer valid for this tenant → falls back to the
    // first visible tab (Exceptions). The WorkEvidencePage stub must
    // not render.
    await waitFor(() => expect(screen.getByTestId('stub-exceptions')).toBeInTheDocument());
    expect(screen.queryByTestId('stub-evidence')).not.toBeInTheDocument();
  });
});
