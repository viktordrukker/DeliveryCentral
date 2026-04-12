import { httpGet, httpPatch } from './http-client';

export interface GeneralSettings {
  platformName: string;
  timezone: string;
  fiscalYearStart: number;
  dateFormat: string;
  currency: string;
}

export interface TimesheetsSettings {
  enabled: boolean;
  standardHoursPerWeek: number;
  maxHoursPerDay: number;
  weekStartDay: number;
  autoPopulate: boolean;
  approvalRequired: boolean;
  lockAfterDays: number;
}

export interface CapitalisationSettings {
  enabled: boolean;
  defaultClassification: string;
  reconciliationAlerts: boolean;
}

export interface PulseSettings {
  enabled: boolean;
  frequency: string;
  anonymousMode: boolean;
  alertThreshold: number;
}

export interface NotificationsSettings {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  digestFrequency: string;
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  mfaEnabled: boolean;
}

export interface SsoOidcSettings {
  autoProvisionUsers: boolean;
  callbackUrl: string;
  clientId: string;
  clientSecret: string;
  defaultRole: string;
  enabled: boolean;
  issuerUrl: string;
  providerName: string;
  scopes: string;
}

export interface OnboardingSettings {
  showOnFirstLogin: boolean;
  tooltipsEnabled: boolean;
  tourEnabled: boolean;
  welcomeMessage: string;
}

export interface DashboardSettings {
  staffingGapDaysThreshold: number;
  evidenceInactiveDaysThreshold: number;
  nearingClosureDaysThreshold: number;
}

export interface PlatformSettingsResponse {
  capitalisation: CapitalisationSettings;
  dashboard: DashboardSettings;
  general: GeneralSettings;
  notifications: NotificationsSettings;
  onboarding: OnboardingSettings;
  pulse: PulseSettings;
  security: SecuritySettings;
  sso: SsoOidcSettings;
  timesheets: TimesheetsSettings;
}

export interface UpdateSettingResponse {
  key: string;
  value: unknown;
  updatedBy?: string | null;
  updatedAt: string;
}

export async function fetchPlatformSettings(): Promise<PlatformSettingsResponse> {
  return httpGet<PlatformSettingsResponse>('/admin/platform-settings');
}

export async function updatePlatformSetting(
  key: string,
  value: unknown,
): Promise<UpdateSettingResponse> {
  return httpPatch<UpdateSettingResponse, { value: unknown }>(
    `/admin/platform-settings/${encodeURIComponent(key)}`,
    { value },
  );
}
