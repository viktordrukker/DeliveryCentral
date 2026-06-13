import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportsPage } from './ReportsPage';

// W1-26 — ReportsPage filters tabs by role; tests expect all 6 tabs visible,
// so mock with an admin principal who has access to every report sub-page.
// SoT PR 17g — Builder tab removed per V2-done criterion #4 (synthetic preview,
// no real API integration; canvas does not bless it for v2).
vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'admin-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// W4-12 — Evidence tab wraps WorkEvidencePage in <FeatureGuard
// feature="evidenceManagement">, mirroring the standalone /work-evidence
// route. Tests for tab routing default the flag to ON; the disabled-state
// behaviour gets its own test below.
const evidenceManagementMock = { allowManualEntry: true, enabled: true, isLoading: false, showDiagnosticsInCoreDashboards: false };
vi.mock('@/app/platform-settings-context', () => ({
  useEvidenceManagement: () => evidenceManagementMock,
}));

// Stub the heavy embedded pages — we only test the shell composition, not
// the inner page rendering (which is covered by each page's own tests).
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

// CAPEX is gated behind the `reportsCapitalisation` flag (default OFF, pre-GA —
// data-starved, nothing populates TimesheetEntry.capex; see
// docs/qa/capex-gap-list.md). dsRefresh stays OFF here so the tab strip renders
// via the PageHeader TabBar path (its real default). Tests drive both via this mock.
const isFeatureEnabledMock = vi.fn((_flag: string) => false);
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabledMock(flag),
}));

function renderReports(initialEntries: string[] = ['/reports']): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe('ReportsPage — Phase E3 umbrella shell', () => {
  beforeEach(() => {
    isFeatureEnabledMock.mockReset();
    isFeatureEnabledMock.mockImplementation((_flag: string) => false);
  });

  it('renders 5 tabs by default — CAPEX is hidden behind the reportsCapitalisation flag (pre-GA)', async () => {
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Exceptions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Time' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Utilization' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeInTheDocument();
    // CAPEX is data-starved + pre-GA — gated OFF by default (docs/qa/capex-gap-list.md).
    expect(screen.queryByRole('tab', { name: 'CAPEX' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Builder' })).not.toBeInTheDocument();
  });

  it('shows the CAPEX tab when the reportsCapitalisation flag is enabled', async () => {
    const user = userEvent.setup();
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'reportsCapitalisation');
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'CAPEX' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'CAPEX' }));
    await waitFor(() => expect(screen.getByTestId('stub-capitalisation')).toBeInTheDocument());
  });

  it('defaults to the Exceptions tab', async () => {
    renderReports();
    await waitFor(() => expect(screen.getByTestId('stub-exceptions')).toBeInTheDocument());
    expect(screen.getByTestId('reports-tab-exceptions')).toBeInTheDocument();
  });

  it('respects ?section= on initial load — opens the Time tab', async () => {
    renderReports(['/reports?section=time']);
    await waitFor(() => expect(screen.getByTestId('stub-time')).toBeInTheDocument());
  });

  it('switching tabs swaps the embedded page', async () => {
    const user = userEvent.setup();
    renderReports();
    await waitFor(() => expect(screen.getByTestId('stub-exceptions')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: 'Export' }));
    await waitFor(() => expect(screen.getByTestId('stub-export')).toBeInTheDocument());
    expect(screen.queryByTestId('stub-exceptions')).not.toBeInTheDocument();
  });

  it('renders the Evidence page under the Evidence tab', async () => {
    evidenceManagementMock.enabled = true;
    renderReports(['/reports?section=evidence']);
    await waitFor(() => expect(screen.getByTestId('stub-evidence')).toBeInTheDocument());
  });

  it('W4-12 — Evidence tab gates on evidenceManagement.enabled (matches standalone /work-evidence guard)', async () => {
    evidenceManagementMock.enabled = false;
    renderReports(['/reports?section=evidence']);
    await waitFor(() => expect(screen.getByTestId('feature-guard-disabled')).toBeInTheDocument());
    expect(screen.queryByTestId('stub-evidence')).not.toBeInTheDocument();
    evidenceManagementMock.enabled = true;
  });

  it('falls back to Exceptions when the section param is unknown (builder no longer valid)', async () => {
    renderReports(['/reports?section=builder']);
    await waitFor(() => expect(screen.getByTestId('stub-exceptions')).toBeInTheDocument());
  });

  it('falls back to Exceptions when the section param is unknown', async () => {
    renderReports(['/reports?section=bogus']);
    await waitFor(() => expect(screen.getByTestId('stub-exceptions')).toBeInTheDocument());
  });

  it('renders the canonical "Reports" page title regardless of active tab', async () => {
    const user = userEvent.setup();
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: 'Utilization' }));
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });
});
