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
  timeEntry: {
    benchEnabled: true,
    benchCategories: ['BENCH-EDU'],
    copyPreviousEnabled: true,
    autoFillFromAssignments: true,
    gapDetectionEnabled: true,
    standardHoursPerDay: 8,
    allowSubmitInAdvance: false,
    allowFutureDateEntry: false,
    maxHoursPerDay: 12,
    maxHoursPerWeek: 60,
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

  it('save button is disabled until a field becomes dirty', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('settings-section-general');

    const saveBtn = screen.getByTestId('save-section-general') as HTMLButtonElement;
    const resetBtn = screen.getByTestId('reset-section-general') as HTMLButtonElement;
    expect(saveBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    const input = screen.getByTestId('setting-general-platformName') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'NewName');

    expect(saveBtn).not.toBeDisabled();
    expect(resetBtn).not.toBeDisabled();
    expect(screen.getByTestId('dirty-indicator-general')).toBeInTheDocument();
    expect(screen.getByTestId('dirty-general-platformName')).toBeInTheDocument();
  });

  it('section save persists all dirty fields and clears dirty state', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    mockedUpdate.mockImplementation((key, value) =>
      Promise.resolve({ key, value, updatedAt: new Date().toISOString() }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('settings-section-general');

    const nameInput = screen.getByTestId('setting-general-platformName') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'NewName');

    const tzInput = screen.getByTestId('setting-general-timezone') as HTMLInputElement;
    await user.clear(tzInput);
    await user.type(tzInput, 'Europe/London');

    const saveBtn = screen.getByTestId('save-section-general');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('general.platformName', 'NewName');
    });
    expect(mockedUpdate).toHaveBeenCalledWith('general.timezone', 'Europe/London');

    await waitFor(() => {
      expect(screen.queryByTestId('dirty-indicator-general')).not.toBeInTheDocument();
    });
    expect((screen.getByTestId('save-section-general') as HTMLButtonElement)).toBeDisabled();
  });

  it('reset reverts dirty fields to original values', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('settings-section-general');

    const input = screen.getByTestId('setting-general-platformName') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Changed');
    expect(input.value).toBe('Changed');

    const resetBtn = screen.getByTestId('reset-section-general');
    await user.click(resetBtn);

    expect((screen.getByTestId('setting-general-platformName') as HTMLInputElement).value).toBe('DeliveryCentral');
    expect(screen.queryByTestId('dirty-indicator-general')).not.toBeInTheDocument();
  });

  it('renders the SSO client secret field as type=password', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    renderPage();
    await screen.findByTestId('settings-section-sso');
    const secret = screen.getByTestId('setting-sso-clientSecret') as HTMLInputElement;
    expect(secret.type).toBe('password');
  });

  it('enforces min/max validation on number fields and blocks save', async () => {
    mockedFetch.mockResolvedValue(MOCK_SETTINGS);
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('settings-section-security');

    const input = screen.getByTestId('setting-security-passwordMinLength') as HTMLInputElement;
    expect(input.min).toBe('6');
    expect(input.max).toBe('128');

    await user.clear(input);
    await user.type(input, '3');

    expect(screen.getByTestId('error-security-passwordMinLength')).toBeInTheDocument();
    expect((screen.getByTestId('save-section-security') as HTMLButtonElement)).toBeDisabled();

    await user.clear(input);
    await user.type(input, '12');

    expect(screen.queryByTestId('error-security-passwordMinLength')).not.toBeInTheDocument();
    expect((screen.getByTestId('save-section-security') as HTMLButtonElement)).not.toBeDisabled();
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
