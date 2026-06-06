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
  retryAdminM365Sync,
  retryAdminRadiusSync,
  testAdminM365Connection,
  testAdminRadiusConnection,
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
  retryAdminM365Sync: vi.fn(),
  retryAdminRadiusSync: vi.fn(),
  testAdminM365Connection: vi.fn(),
  testAdminRadiusConnection: vi.fn(),
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
const mockedRetryAdminM365Sync = vi.mocked(retryAdminM365Sync);
const mockedRetryAdminRadiusSync = vi.mocked(retryAdminRadiusSync);
const mockedTestAdminM365Connection = vi.mocked(testAdminM365Connection);
const mockedTestAdminRadiusConnection = vi.mocked(testAdminRadiusConnection);

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

describe('IntegrationsAdminPage — W2-10 remediation parity (M365 + RADIUS)', () => {
  beforeEach(() => {
    mockedFetchAdminIntegrations.mockReset();
    mockedFetchAdminJiraStatus.mockReset();
    mockedFetchAdminM365Status.mockReset();
    mockedFetchAdminRadiusStatus.mockReset();
    mockedFetchAdminM365Reconciliation.mockReset();
    mockedFetchAdminRadiusReconciliation.mockReset();
    mockedFetchIntegrationSyncHistory.mockReset();
    mockedRetryAdminM365Sync.mockReset();
    mockedRetryAdminRadiusSync.mockReset();
    mockedTestAdminM365Connection.mockReset();
    mockedTestAdminRadiusConnection.mockReset();

    mockedFetchAdminIntegrations.mockResolvedValue({
      integrations: [
        {
          lastSyncAt: '2026-03-31T09:30:00.000Z',
          lastSyncOutcome: 'succeeded',
          lastSyncSummary: 'Linked 5 external identities.',
          linkedIdentityCount: 5,
          matchStrategy: 'email',
          provider: 'm365',
          status: 'configured',
          supportsDirectorySync: true,
          supportsManagerSync: true,
          supportsProjectSync: false,
          supportsWorkEvidence: false,
        },
        {
          lastSyncAt: '2026-03-31T09:00:00.000Z',
          lastSyncOutcome: 'failed',
          lastSyncSummary: 'Timeout while reaching provider.',
          linkedAccountCount: 7,
          matchStrategy: 'email',
          provider: 'radius',
          status: 'degraded',
          supportsAccountSync: true,
          supportsProjectSync: false,
          supportsWorkEvidence: false,
          unlinkedAccountCount: 2,
        },
      ],
    });
    mockedFetchAdminM365Status.mockResolvedValue({
      defaultOrgUnitId: 'org-default',
      lastDirectorySyncAt: '2026-03-31T09:30:00.000Z',
      lastDirectorySyncOutcome: 'succeeded',
      lastDirectorySyncSummary: 'Linked 5 external identities.',
      linkedIdentityCount: 5,
      matchStrategy: 'email',
      provider: 'm365',
      status: 'configured',
      supportsDirectorySync: true,
      supportsManagerSync: true,
    });
    mockedFetchAdminRadiusStatus.mockResolvedValue({
      lastAccountSyncAt: '2026-03-31T09:00:00.000Z',
      lastAccountSyncOutcome: 'failed',
      lastAccountSyncSummary: 'Timeout while reaching provider.',
      linkedAccountCount: 7,
      matchStrategy: 'email',
      provider: 'radius',
      status: 'degraded',
      supportsAccountSync: true,
      unlinkedAccountCount: 2,
    });
    mockedFetchAdminM365Reconciliation.mockResolvedValue({
      items: [],
      summary: { ambiguous: 0, matched: 0, staleConflict: 0, total: 0, unmatched: 0 },
    });
    mockedFetchAdminRadiusReconciliation.mockResolvedValue({
      items: [],
      summary: { ambiguous: 0, matched: 0, presenceDrift: 0, total: 0, unmatched: 0 },
    });
    mockedFetchIntegrationSyncHistory.mockResolvedValue([]);
  });

  it('renders Remediation Actions for M365 with Retry + Test buttons (no Reset)', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /M365/i }));

    expect(await screen.findByText('Remediation Actions')).toBeInTheDocument();
    expect(screen.getByTestId('m365-remediation-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry sync' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset sync state' })).not.toBeInTheDocument();
  });

  it('calls retryAdminM365Sync and surfaces the M365 success message', async () => {
    mockedRetryAdminM365Sync.mockResolvedValue({
      employeesCreated: 2,
      employeesLinked: 4,
      managerMappingsResolved: 1,
      syncedPersonIds: ['p-1', 'p-2'],
    });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /M365/i }));
    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Retry sync' }));

    await waitFor(() => {
      expect(mockedRetryAdminM365Sync).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText('M365 retry sync completed. Created 2, linked 4.'),
    ).toBeInTheDocument();
  });

  it('calls testAdminM365Connection and renders the M365 latency result', async () => {
    mockedTestAdminM365Connection.mockResolvedValue({ reachable: true, latencyMs: 17 });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /M365/i }));
    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    await waitFor(() => {
      expect(mockedTestAdminM365Connection).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByTestId('m365-test-connection-result')).toBeInTheDocument();
    expect(screen.getByText('17 ms')).toBeInTheDocument();
    expect(await screen.findByText('M365 reachable in 17 ms.')).toBeInTheDocument();
  });

  it('renders Remediation Actions for RADIUS with Retry + Test buttons (no Reset)', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /RADIUS/i }));

    expect(await screen.findByText('Remediation Actions')).toBeInTheDocument();
    expect(screen.getByTestId('radius-remediation-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry sync' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset sync state' })).not.toBeInTheDocument();
  });

  it('calls retryAdminRadiusSync and surfaces the RADIUS success message', async () => {
    mockedRetryAdminRadiusSync.mockResolvedValue({
      accountsImported: 3,
      accountsLinked: 2,
      syncedAccountIds: ['a-1'],
      unmatchedAccounts: 1,
    });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /RADIUS/i }));
    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Retry sync' }));

    await waitFor(() => {
      expect(mockedRetryAdminRadiusSync).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText('RADIUS retry sync completed. Imported 3, linked 2.'),
    ).toBeInTheDocument();
  });

  it('calls testAdminRadiusConnection and renders the RADIUS latency result', async () => {
    mockedTestAdminRadiusConnection.mockResolvedValue({ reachable: true, latencyMs: 22 });
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /RADIUS/i }));
    await screen.findByText('Remediation Actions');
    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    await waitFor(() => {
      expect(mockedTestAdminRadiusConnection).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByTestId('radius-test-connection-result')).toBeInTheDocument();
    expect(screen.getByText('22 ms')).toBeInTheDocument();
    expect(await screen.findByText('RADIUS reachable in 22 ms.')).toBeInTheDocument();
  });

  it('drops the dev-only TODO copy about M365 + RADIUS follow-up work', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(await screen.findByRole('button', { name: /M365/i }));
    await screen.findByText('Remediation Actions');
    expect(
      screen.queryByText(/M365 \+ RADIUS remediation is follow-up work/i),
    ).not.toBeInTheDocument();
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
