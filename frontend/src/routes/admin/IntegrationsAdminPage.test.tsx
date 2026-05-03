import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchAdminIntegrations } from '@/lib/api/admin';
import {
  fetchIntegrationSyncHistory,
  fetchAdminM365Reconciliation,
  fetchAdminJiraStatus,
  fetchAdminM365Status,
  fetchAdminRadiusReconciliation,
  fetchAdminRadiusStatus,
  triggerAdminJiraSync,
} from '@/lib/api/integrations-admin';
import { IntegrationsAdminPage } from './IntegrationsAdminPage';

vi.mock('@/lib/api/admin', () => ({
  fetchAdminIntegrations: vi.fn(),
}));

vi.mock('@/lib/api/integrations-admin', () => ({
  fetchAdminJiraStatus: vi.fn(),
  fetchIntegrationSyncHistory: vi.fn(),
  fetchAdminM365Reconciliation: vi.fn(),
  fetchAdminM365Status: vi.fn(),
  fetchAdminRadiusReconciliation: vi.fn(),
  fetchAdminRadiusStatus: vi.fn(),
  triggerAdminJiraSync: vi.fn(),
  triggerAdminM365Sync: vi.fn(),
  triggerAdminRadiusSync: vi.fn(),
}));

const mockedFetchAdminIntegrations = vi.mocked(fetchAdminIntegrations);
const mockedFetchAdminJiraStatus = vi.mocked(fetchAdminJiraStatus);
const mockedFetchIntegrationSyncHistory = vi.mocked(fetchIntegrationSyncHistory);
const mockedFetchAdminM365Reconciliation = vi.mocked(fetchAdminM365Reconciliation);
const mockedFetchAdminM365Status = vi.mocked(fetchAdminM365Status);
const mockedFetchAdminRadiusReconciliation = vi.mocked(fetchAdminRadiusReconciliation);
const mockedFetchAdminRadiusStatus = vi.mocked(fetchAdminRadiusStatus);
const mockedTriggerAdminJiraSync = vi.mocked(triggerAdminJiraSync);

describe('IntegrationsAdminPage', () => {
  beforeEach(() => {
    mockedFetchAdminIntegrations.mockReset();
    mockedFetchAdminJiraStatus.mockReset();
    mockedFetchIntegrationSyncHistory.mockReset();
    mockedFetchAdminM365Reconciliation.mockReset();
    mockedFetchAdminM365Status.mockReset();
    mockedFetchAdminRadiusReconciliation.mockReset();
    mockedFetchAdminRadiusStatus.mockReset();
    mockedTriggerAdminJiraSync.mockReset();
  });

  it('renders integration statuses', async () => {
    mockIntegrationLoad();

    renderWithRouter();

    expect(await screen.findByText('Integrations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /JIRA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /M365/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RADIUS/i })).toBeInTheDocument();
    expect(screen.getAllByText(/[Cc]onfigured/).length).toBeGreaterThan(0);
    expect(screen.getByText('succeeded')).toBeInTheDocument();
    expect(screen.getAllByText('Created 1, updated 2.').length).toBeGreaterThan(0);
    expect(screen.getByText('Recent Sync Runs')).toBeInTheDocument();
    expect(await screen.findByText('Jira project sync completed successfully.')).toBeInTheDocument();
  });

  it('triggers sync for the selected integration', async () => {
    mockIntegrationLoad();
    mockedTriggerAdminJiraSync.mockResolvedValue({
      projectsCreated: 1,
      projectsUpdated: 0,
      syncedProjectIds: ['prj-1'],
    });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    // useIntegrationAdmin starts with selectedProvider=null; the Trigger
    // sync action only renders once a provider is picked. Pick JIRA first.
    // Use findByRole (async) since integration buttons render after the
    // fetchAdminIntegrations promise resolves — the page heading shows up
    // first, but the JIRA button arrives a tick later.
    await user.click(await screen.findByRole('button', { name: /JIRA/i }));
    await user.click(await screen.findByRole('button', { name: 'Trigger sync' }));

    await waitFor(() => {
      expect(mockedTriggerAdminJiraSync).toHaveBeenCalled();
    });

    expect(await screen.findByText('Jira sync completed. Created 1, updated 0.')).toBeInTheDocument();
  });

  it('renders M365 reconciliation review for operator investigation', async () => {
    mockIntegrationLoad();

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(screen.getByRole('button', { name: /M365/i }));

    expect(await screen.findByText('M365 Reconciliation Review')).toBeInTheDocument();
    expect(await screen.findByText('External identity matched an existing internal person.')).toBeInTheDocument();
    expect(screen.getByText('MATCHED')).toBeInTheDocument();
    expect(screen.getByText('UNMATCHED')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All categories')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search by external user, principal, person, or summary'),
    ).toBeInTheDocument();
  });

  it('renders RADIUS reconciliation review for account-presence investigation', async () => {
    mockIntegrationLoad();

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Integrations');
    await user.click(screen.getByRole('button', { name: /RADIUS/i }));

    expect(await screen.findByText('RADIUS Reconciliation Review')).toBeInTheDocument();
    expect(
      await screen.findByText('RADIUS account presence linked safely to an internal person.'),
    ).toBeInTheDocument();
    expect(screen.getByText('PRESENCE_DRIFT')).toBeInTheDocument();
    expect(screen.getByText('UNMATCHED')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search by account id, username, email, person, or summary'),
    ).toBeInTheDocument();
    expect(await screen.findByText('RADIUS account sync failed.')).toBeInTheDocument();
    expect(screen.getAllByText('Timeout while reaching provider.').length).toBeGreaterThan(0);
  });
});

function mockIntegrationLoad(): void {
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

  mockedFetchAdminJiraStatus.mockResolvedValue({
    lastProjectSyncAt: '2026-03-31T10:00:00.000Z',
    lastProjectSyncOutcome: 'succeeded',
    lastProjectSyncSummary: 'Created 1, updated 2.',
    provider: 'jira',
    status: 'configured',
    supportsProjectSync: true,
    supportsWorkEvidence: false,
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

  mockedFetchAdminM365Reconciliation.mockResolvedValue({
    items: [
      {
        candidatePersonIds: [],
        category: 'MATCHED',
        externalDisplayName: 'Ethan Brooks',
        externalEmail: 'ethan.brooks@example.com',
        externalPrincipalName: 'ethan.brooks@example.com',
        externalUserId: 'aad-user-ethan',
        lastEvaluatedAt: '2026-03-31T09:30:00.000Z',
        matchedByStrategy: 'email',
        personId: '11111111-1111-1111-1111-111111111008',
        summary: 'External identity matched an existing internal person.',
      },
      {
        candidatePersonIds: [],
        category: 'UNMATCHED',
        externalDisplayName: 'Unknown External',
        externalUserId: 'aad-unmatched-001',
        lastEvaluatedAt: '2026-03-31T09:31:00.000Z',
        summary: 'External identity could not be safely reconciled because no usable principal or email was provided.',
      },
    ],
    lastSyncAt: '2026-03-31T09:30:00.000Z',
    lastSyncOutcome: 'succeeded',
    summary: {
      ambiguous: 0,
      matched: 1,
      staleConflict: 0,
      total: 2,
      unmatched: 1,
    },
  });

  mockedFetchIntegrationSyncHistory.mockImplementation(async (params) => {
    switch (params?.provider) {
      case 'm365':
        return [
          {
            finishedAt: '2026-03-31T09:30:00.000Z',
            integrationType: 'm365',
            itemsProcessedSummary: 'Created 1, linked 5, resolved 2 managers.',
            resourceType: 'directory',
            startedAt: '2026-03-31T09:29:00.000Z',
            status: 'SUCCEEDED',
            summary: 'M365 directory sync completed.',
          },
        ];
      case 'radius':
        return [
          {
            failureSummary: 'Timeout while reaching provider.',
            finishedAt: '2026-03-31T09:00:00.000Z',
            integrationType: 'radius',
            resourceType: 'accounts',
            startedAt: '2026-03-31T08:59:00.000Z',
            status: 'FAILED',
            summary: 'RADIUS account sync failed.',
          },
        ];
      case 'jira':
      default:
        return [
          {
            finishedAt: '2026-03-31T10:00:00.000Z',
            integrationType: 'jira',
            itemsProcessedSummary: 'Created 1, updated 2.',
            resourceType: 'projects',
            startedAt: '2026-03-31T09:58:00.000Z',
            status: 'SUCCEEDED',
            summary: 'Jira project sync completed successfully.',
          },
        ];
    }
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

  mockedFetchAdminRadiusReconciliation.mockResolvedValue({
    items: [
      {
        accountPresenceState: 'present',
        candidatePersonIds: [],
        category: 'MATCHED',
        externalAccountId: 'radius-ethan',
        externalDisplayName: 'Ethan Brooks',
        externalEmail: 'ethan.brooks@example.com',
        externalUsername: 'ethan.brooks',
        lastEvaluatedAt: '2026-03-31T09:00:00.000Z',
        matchedByStrategy: 'email',
        personId: '11111111-1111-1111-1111-111111111008',
        sourceType: 'vpn',
        summary: 'RADIUS account presence linked safely to an internal person.',
      },
      {
        accountPresenceState: 'missing',
        candidatePersonIds: [],
        category: 'PRESENCE_DRIFT',
        externalAccountId: 'radius-stale-001',
        externalUsername: 'stale.user',
        lastEvaluatedAt: '2026-03-31T09:05:00.000Z',
        sourceType: 'vpn',
        summary:
          'Previously linked RADIUS account was not observed in the latest account-presence sync.',
      },
      {
        accountPresenceState: 'disabled',
        candidatePersonIds: [],
        category: 'UNMATCHED',
        externalAccountId: 'radius-unmatched-001',
        externalUsername: 'unknown.user',
        lastEvaluatedAt: '2026-03-31T09:07:00.000Z',
        sourceType: 'vpn',
        summary: 'RADIUS account presence remains unmatched and requires review.',
      },
    ],
    lastSyncAt: '2026-03-31T09:00:00.000Z',
    lastSyncOutcome: 'succeeded',
    summary: {
      ambiguous: 0,
      matched: 1,
      presenceDrift: 1,
      total: 3,
      unmatched: 1,
    },
  });
}

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/admin/integrations']}>
      <Routes>
        <Route element={<IntegrationsAdminPage />} path="/admin/integrations" />
      </Routes>
    </MemoryRouter>,
  );
}
