import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPlatformSettings, updatePlatformSetting } from '@/lib/api/platform-settings';
import { SettingsPage } from './SettingsPage';

vi.mock('@/lib/api/platform-settings', () => ({
  fetchPlatformSettings: vi.fn(),
  updatePlatformSetting: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPlatformSettings);
const mockedUpdate = vi.mocked(updatePlatformSetting);

const MOCK_SETTINGS = {
  general: {
    platformName: 'DeliveryCentral',
    timezone: 'UTC',
    fiscalYearStart: 1,
    dateFormat: 'YYYY-MM-DD',
    currency: 'AUD',
  },
  timesheets: {
    enabled: true,
    standardHoursPerWeek: 40,
    maxHoursPerDay: 12,
    weekStartDay: 1,
    autoPopulate: false,
    approvalRequired: true,
    lockAfterDays: 14,
  },
  capitalisation: {
    enabled: true,
    defaultClassification: 'OPEX',
    reconciliationAlerts: true,
  },
  pulse: {
    enabled: true,
    frequency: 'weekly',
    anonymousMode: false,
    alertThreshold: 2,
  },
  notifications: {
    emailEnabled: true,
    inAppEnabled: true,
    digestFrequency: 'daily',
  },
  security: {
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    mfaEnabled: false,
  },
  sso: {
    enabled: false,
    providerName: '',
    issuerUrl: '',
    clientId: '',
    clientSecret: '',
    scopes: 'openid profile email',
    callbackUrl: '/auth/oidc/callback',
    autoProvisionUsers: false,
    defaultRole: 'employee',
  },
  onboarding: {
    tourEnabled: true,
    tooltipsEnabled: true,
    showOnFirstLogin: true,
    welcomeMessage: 'Welcome to DeliveryCentral!',
  },
  dashboard: {
    staffingGapDaysThreshold: 28,
    evidenceInactiveDaysThreshold: 14,
    nearingClosureDaysThreshold: 30,
  },
  evidenceManagement: {
    enabled: false,
    allowManualEntry: true,
    showDiagnosticsInCoreDashboards: false,
    allowedSources: ['JIRA_WORKLOG', 'MANUAL'],
    retentionDays: null,
  },
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedUpdate.mockReset();
  });

  it('renders the settings page title', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    renderPage();
    expect(await screen.findByText('Platform Settings')).toBeInTheDocument();
  });

  it('renders the key setting sections including evidence management', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    renderPage();

    await screen.findByText('Platform Settings');

    expect(screen.getByTestId('settings-section-general')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-timesheets')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-capitalisation')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-pulse')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-security')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-evidenceManagement')).toBeInTheDocument();
  });

  it('calls updatePlatformSetting when Save is clicked', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    mockedUpdate.mockResolvedValue({
      key: 'general.platformName',
      value: 'NewName',
      updatedAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('settings-section-general');

    const input = screen.getByTestId('setting-general-platformName') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'NewName');

    const saveBtn = screen.getByTestId('save-general-platformName');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('general.platformName', 'NewName');
    });
  });

  it('shows error state if load fails', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('renders boolean fields as checkboxes', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    renderPage();
    await screen.findByTestId('settings-section-timesheets');
    const checkbox = screen.getByTestId('setting-timesheets-enabled') as HTMLInputElement;
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(true);
  });

  it('renders select fields with options', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    renderPage();
    await screen.findByTestId('settings-section-pulse');
    const select = screen.getByTestId('setting-pulse-frequency') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
  });
});
