import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchAdminIntegrations } from '@/lib/api/admin';
import {
  fetchAdminJiraStatus,
  fetchAdminM365Status,
  fetchAdminRadiusStatus,
  fetchAdminM365Reconciliation,
  fetchAdminRadiusReconciliation,
  fetchIntegrationSyncHistory,
  triggerAdminJiraSync,
  triggerAdminM365Sync,
  triggerAdminRadiusSync,
} from '@/lib/api/integrations-admin';
import {
  resetJiraSync,
  retryJiraSync,
  testJiraConnection,
} from '@/lib/api/jira-integrations';
import { IntegrationsAdminPage } from './IntegrationsAdminPage';

vi.mock('@/lib/api/admin', () => ({
  fetchAdminIntegrations: vi.fn(),
}));

vi.mock('@/lib/api/integrations-admin', () => ({
  fetchAdminJiraStatus: vi.fn(),
  fetchAdminM365Status: vi.fn(),
  fetchAdminRadiusStatus: vi.fn(),
  fetchAdminM365Reconciliation: vi.fn(),
  fetchAdminRadiusReconciliation: vi.fn(),
  fetchIntegrationSyncHistory: vi.fn(),
  triggerAdminJiraSync: vi.fn(),
  triggerAdminM365Sync: vi.fn(),
  triggerAdminRadiusSync: vi.fn(),
}));

vi.mock('@/lib/api/jira-integrations', () => ({
  resetJiraSync: vi.fn(),
  retryJiraSync: vi.fn(),
  testJiraConnection: vi.fn(),
  fetchJiraIntegrationStatus: vi.fn(),
  triggerJiraProjectSync: vi.fn(),
}));

vi.mock('@/lib/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: (id: string) => id === 'dsRefresh',
  };
});

const mockedFetchAdminIntegrations = vi.mocked(fetchAdminIntegrations);
const mockedFetchAdminJiraStatus = vi.mocked(fetchAdminJiraStatus);
const mockedFetchAdminM365Status = vi.mocked(fetchAdminM365Status);
const mockedFetchAdminRadiusStatus = vi.mocked(fetchAdminRadiusStatus);
const mockedFetchAdminM365Reconciliation = vi.mocked(fetchAdminM365Reconciliation);
const mockedFetchAdminRadiusReconciliation = vi.mocked(fetchAdminRadiusReconciliation);
const mockedFetchIntegrationSyncHistory = vi.mocked(fetchIntegrationSyncHistory);
const mockedRetryJiraSync = vi.mocked(retryJiraSync);
const mockedResetJiraSync = vi.mocked(resetJiraSync);
const mockedTestJiraConnection = vi.mocked(testJiraConnection);

describe('IntegrationsAdminPage — V2 §4 item 17 remediation actions (Jira)', () => {
  beforeEach(() => {
    mockedFetchAdminIntegrations.mockReset();
    mockedFetchAdminJiraStatus.mockReset();
    mockedFetchAdminM365Status.mockReset();
    mockedFetchAdminRadiusStatus.mockReset();
    mockedFetchAdminM365Reconciliation.mockReset();
    mockedFetchAdminRadiusReconciliation.mockReset();
    mockedFetchIntegrationSyncHistory.mockReset();
    mockedRetryJiraSync.mockReset();
    mockedResetJiraSync.mockReset();
    mockedTestJiraConnection.mockReset();

    mockedFetchAdminIntegrations.mockResolvedValue({
      integrations: [
        {
          lastProjectSyncAt: '2026-03-31T10:00:00.000Z',
          lastProjectSyncOutcome: 'succeeded',
          lastProjectSyncSummary: 'Created 1, updated 2.',
          lastSyncAt: '2026-03-31T10:00:00.000Z',
          lastSyncOutcome: 'succeeded',
          lastSyncSummary: 'Created 1, updated 2.',
          provider: 'jira',
          status: 'configured',
          supportsProjectSync: true,
          supportsWorkEvidence: false,
        },
      ],
    });
    mockedFetchAdminJiraStatus.mockResolvedValue({
      lastProjectSyncAt: '2026-03-31T10:00:00.000Z',
      lastProjectSyncOutcome: 'succeeded',
      lastProjectSyncSummary: 'Created 1, updated 2.',
      provider: 'jira',
      status: 'configured',
      supportsProjectSync: true,
      supportsWorkEvidence: false,
    });
    mockedFetchIntegrationSyncHistory.mockResolvedValue([]);
  });

  it('renders the Remediation Actions card with Retry / Reset / Test buttons when Jira is selected', async () => {
    renderWithRouter();

    await screen.findByText('Integrations');
    // JIRA is the only provider; useIntegrationAdmin picks it automatically.
    expect(await screen.findByText('Remediation Actions')).toBeInTheDocument();
    const actionsRow = screen.getByTestId('jira-remediation-actions');
    expect(actionsRow).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry sync' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset sync state' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Test connection' }),
    ).toBeInTheDocument();
  });

  it('calls retryJiraSync and surfaces the success message', async () => {
    mockedRetryJiraSync.mockResolvedValue({
      projectsCreated: 3,
      projectsUpdated: 1,
      syncedProjectIds: ['prj-1', 'prj-2', 'prj-3'],
    });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Retry sync' }));

    await waitFor(() => {
      expect(mockedRetryJiraSync).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText(
        'Jira retry sync completed. Created 3, updated 1.',
      ),
    ).toBeInTheDocument();
  });

  it('calls testJiraConnection and renders the latency result', async () => {
    mockedTestJiraConnection.mockResolvedValue({
      reachable: true,
      latencyMs: 42,
    });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    await waitFor(() => {
      expect(mockedTestJiraConnection).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByTestId('jira-test-connection-result')).toBeInTheDocument();
    expect(screen.getByText('42 ms')).toBeInTheDocument();
    expect(
      await screen.findByText('Jira reachable in 42 ms.'),
    ).toBeInTheDocument();
  });

  it('calls resetJiraSync and surfaces the success message', async () => {
    mockedResetJiraSync.mockResolvedValue({ reset: true });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Reset sync state' }));

    await waitFor(() => {
      expect(mockedResetJiraSync).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText('Jira sync state has been reset.'),
    ).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/admin/integrations']}>
      <Routes>
        <Route element={<IntegrationsAdminPage />} path="/admin/integrations" />
      </Routes>
    </MemoryRouter>,
  );
}
