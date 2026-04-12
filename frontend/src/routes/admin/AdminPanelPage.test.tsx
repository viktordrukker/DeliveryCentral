import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchAdminConfig,
  fetchAdminIntegrations,
  fetchAdminNotifications,
  fetchAdminSettings,
} from '@/lib/api/admin';
import { ImpersonationProvider } from '@/app/impersonation-context';
import { AdminPanelPage } from './AdminPanelPage';

vi.mock('@/lib/api/admin', () => ({
  fetchAdminConfig: vi.fn(),
  fetchAdminIntegrations: vi.fn(),
  fetchAdminNotifications: vi.fn(),
  fetchAdminSettings: vi.fn(),
}));

const mockedFetchAdminConfig = vi.mocked(fetchAdminConfig);
const mockedFetchAdminSettings = vi.mocked(fetchAdminSettings);
const mockedFetchAdminIntegrations = vi.mocked(fetchAdminIntegrations);
const mockedFetchAdminNotifications = vi.mocked(fetchAdminNotifications);

describe('AdminPanelPage', () => {
  beforeEach(() => {
    mockedFetchAdminConfig.mockReset();
    mockedFetchAdminSettings.mockReset();
    mockedFetchAdminIntegrations.mockReset();
    mockedFetchAdminNotifications.mockReset();
  });

  it('renders the admin page with visible sections', async () => {
    mockAdminResponses();

    renderWithRouter();

    expect(await screen.findByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dictionaries/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /System Settings/i })).toBeInTheDocument();
    expect(screen.getByText('Create Local Account')).toBeInTheDocument();
  });

  it('maps section data dynamically when switching sections', async () => {
    mockAdminResponses();

    const user = userEvent.setup();
    renderWithRouter();

    await user.click(await screen.findByRole('button', { name: /Dictionaries/i }));
    expect(await screen.findByText('Project Types')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Notifications/i }));
    expect(await screen.findByText('Microsoft Teams Webhook')).toBeInTheDocument();
    expect(screen.getByText('Assignment Created')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /System Settings/i }));
    expect(await screen.findByText('Development Mode')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Integrations/i }));
    expect((await screen.findAllByText('JIRA')).length).toBeGreaterThan(0);
  });

  it('shows empty state when admin endpoints return no data', async () => {
    mockedFetchAdminConfig.mockResolvedValue({
      dictionaries: [],
      integrations: [],
      systemFlags: [],
    });
    mockedFetchAdminSettings.mockResolvedValue({
      systemFlags: [],
    });
    mockedFetchAdminIntegrations.mockResolvedValue({
      integrations: [],
    });
    mockedFetchAdminNotifications.mockResolvedValue({
      channels: [],
      templates: [],
    });

    renderWithRouter();

    expect(await screen.findByText('No admin configuration available')).toBeInTheDocument();
  });
});

function mockAdminResponses(): void {
  mockedFetchAdminConfig.mockResolvedValue({
    dictionaries: [
      {
        dictionaryKey: 'project-types',
        displayName: 'Project Types',
        enabledEntryCount: 2,
        entityType: 'Project',
        entryCount: 3,
        id: 'dict-1',
        isSystemManaged: false,
      },
    ],
    integrations: [
      {
        lastProjectSyncAt: '2026-03-30T10:00:00.000Z',
        lastProjectSyncOutcome: 'succeeded',
        lastProjectSyncSummary: 'Created 1, updated 2.',
        provider: 'jira',
        status: 'configured',
        supportsProjectSync: true,
        supportsWorkEvidence: false,
      },
    ],
    systemFlags: [
      {
        description: 'Development mode flag',
        enabled: true,
        key: 'development_mode',
        source: 'NODE_ENV',
      },
    ],
  });
  mockedFetchAdminSettings.mockResolvedValue({
    systemFlags: [
      {
        description: 'Development mode flag',
        enabled: true,
        key: 'development_mode',
        source: 'NODE_ENV',
      },
    ],
  });
  mockedFetchAdminIntegrations.mockResolvedValue({
    integrations: [
      {
        lastProjectSyncAt: '2026-03-30T10:00:00.000Z',
        lastProjectSyncOutcome: 'succeeded',
        lastProjectSyncSummary: 'Created 1, updated 2.',
        provider: 'jira',
        status: 'configured',
        supportsProjectSync: true,
        supportsWorkEvidence: false,
      },
    ],
  });
  mockedFetchAdminNotifications.mockResolvedValue({
    channels: [
      {
        channelKey: 'ms_teams_webhook',
        displayName: 'Microsoft Teams Webhook',
        isEnabled: true,
        kind: 'webhook',
      },
    ],
    templates: [
      {
        bodyTemplate: 'Assignment created for {{personName}}',
        channelKey: 'ms_teams_webhook',
        displayName: 'Assignment Created',
        eventName: 'assignment.created',
        subjectTemplate: 'Assignment Created',
        templateKey: 'assignment-created-teams',
      },
    ],
  });
}

function renderWithRouter(): void {
  render(
    <ImpersonationProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminPanelPage />} path="/admin" />
        </Routes>
      </MemoryRouter>
    </ImpersonationProvider>,
  );
}
