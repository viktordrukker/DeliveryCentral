import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchJiraIntegrationStatus,
  triggerJiraProjectSync,
} from '@/lib/api/jira-integrations';
import { IntegrationsPage } from './IntegrationsPage';

vi.mock('@/lib/api/jira-integrations', () => ({
  fetchJiraIntegrationStatus: vi.fn(),
  triggerJiraProjectSync: vi.fn(),
}));

const mockedFetchJiraIntegrationStatus = vi.mocked(fetchJiraIntegrationStatus);
const mockedTriggerJiraProjectSync = vi.mocked(triggerJiraProjectSync);

describe('IntegrationsPage', () => {
  beforeEach(() => {
    mockedFetchJiraIntegrationStatus.mockReset();
    mockedTriggerJiraProjectSync.mockReset();
  });

  it('renders Jira status details', async () => {
    mockedFetchJiraIntegrationStatus.mockResolvedValue({
      lastProjectSyncAt: '2025-03-15T10:00:00.000Z',
      lastProjectSyncOutcome: 'succeeded',
      lastProjectSyncSummary: 'Created 1, updated 2.',
      provider: 'jira',
      status: 'configured',
      supportsProjectSync: true,
      supportsWorkEvidence: false,
    });

    renderWithRouter();

    expect(await screen.findByText('JIRA')).toBeInTheDocument();
    expect(screen.getByText('configured')).toBeInTheDocument();
    expect(screen.getByText('succeeded')).toBeInTheDocument();
    expect(screen.getByText('Created 1, updated 2.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trigger project sync' })).toBeEnabled();
  });

  it('triggers project sync and refreshes status', async () => {
    mockedFetchJiraIntegrationStatus
      .mockResolvedValueOnce({
        provider: 'jira',
        status: 'configured',
        supportsProjectSync: true,
        supportsWorkEvidence: false,
      })
      .mockResolvedValueOnce({
        lastProjectSyncAt: '2025-03-15T11:00:00.000Z',
        lastProjectSyncOutcome: 'succeeded',
        lastProjectSyncSummary: 'Created 1, updated 0.',
        provider: 'jira',
        status: 'configured',
        supportsProjectSync: true,
        supportsWorkEvidence: false,
      });
    mockedTriggerJiraProjectSync.mockResolvedValue({
      projectsCreated: 1,
      projectsUpdated: 0,
      syncedProjectIds: ['prj-1'],
    });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('JIRA');
    await user.click(screen.getByRole('button', { name: 'Trigger project sync' }));

    await waitFor(() => {
      expect(mockedTriggerJiraProjectSync).toHaveBeenCalled();
    });

    expect(await screen.findByText('Project sync completed. Created 1, updated 0.')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchJiraIntegrationStatus.mockRejectedValue(new Error('Integration status unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Integration status unavailable')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/integrations']}>
      <Routes>
        <Route element={<IntegrationsPage />} path="/integrations" />
      </Routes>
    </MemoryRouter>,
  );
}
