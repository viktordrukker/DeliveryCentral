import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

export interface AdminDictionarySummary {
  id: string;
  dictionaryKey: string;
  displayName: string;
  entityType: string;
  entryCount: number;
  enabledEntryCount: number;
  isSystemManaged: boolean;
}

export interface AdminIntegrationSummary {
  defaultOrgUnitId?: string;
  lastSyncAt?: string;
  lastSyncOutcome?: string;
  lastSyncSummary?: string;
  linkedAccountCount?: number;
  linkedIdentityCount?: number;
  matchStrategy?: string;
  provider: string;
  supportsAccountSync?: boolean;
  supportsDirectorySync?: boolean;
  supportsManagerSync?: boolean;
  status: string;
  supportsProjectSync: boolean;
  supportsWorkEvidence: boolean;
  unlinkedAccountCount?: number;
  lastProjectSyncAt?: string;
  lastProjectSyncOutcome?: string;
  lastProjectSyncSummary?: string;
}

export interface AdminSystemFlag {
  key: string;
  enabled: boolean;
  source: string;
  description: string;
}

export interface AdminNotificationChannel {
  channelKey: string;
  displayName: string;
  kind: string;
  isEnabled: boolean;
}

export interface AdminNotificationTemplate {
  templateKey: string;
  eventName: string;
  displayName: string;
  channelKey: string;
  subjectTemplate?: string;
  bodyTemplate: string;
}

export interface AdminConfigResponse {
  dictionaries: AdminDictionarySummary[];
  integrations: AdminIntegrationSummary[];
  systemFlags: AdminSystemFlag[];
}

export interface AdminSettingsResponse {
  systemFlags: AdminSystemFlag[];
}

export interface AdminIntegrationsResponse {
  integrations: AdminIntegrationSummary[];
}

export interface AdminNotificationsResponse {
  channels: AdminNotificationChannel[];
  templates: AdminNotificationTemplate[];
}

export async function fetchAdminConfig(): Promise<AdminConfigResponse> {
  return httpGet<AdminConfigResponse>('/admin/config');
}

export async function fetchAdminSettings(): Promise<AdminSettingsResponse> {
  return httpGet<AdminSettingsResponse>('/admin/settings');
}

export async function fetchAdminIntegrations(): Promise<AdminIntegrationsResponse> {
  return httpGet<AdminIntegrationsResponse>('/admin/integrations');
}

export async function fetchAdminNotifications(): Promise<AdminNotificationsResponse> {
  return httpGet<AdminNotificationsResponse>('/admin/notifications');
}

export interface CreateLocalAccountRequest {
  email: string;
  password: string;
  personId: string;
  roles: string[];
}

export interface LocalAccountRecord {
  email: string;
  id: string;
  personId: string;
  roles: string[];
}

export async function createLocalAccount(
  request: CreateLocalAccountRequest,
): Promise<LocalAccountRecord> {
  return httpPost<LocalAccountRecord, CreateLocalAccountRequest>('/admin/accounts', request);
}

export interface AdminAccountItem {
  id: string;
  email: string;
  displayName: string;
  isEnabled: boolean;
  personId: string | null;
  roles: string[];
  source: string;
}

export interface AdminAccountListResponse {
  items: AdminAccountItem[];
  totalCount: number;
}

export async function fetchAdminAccounts(
  page = 1,
  pageSize = 20,
): Promise<AdminAccountListResponse> {
  return httpGet<AdminAccountListResponse>(
    `/admin/accounts?page=${page}&pageSize=${pageSize}`,
  );
}

export async function updateAdminAccount(
  id: string,
  patch: { roles?: string[]; isEnabled?: boolean },
): Promise<AdminAccountItem> {
  return httpPatch<AdminAccountItem, typeof patch>(`/admin/accounts/${id}`, patch);
}

export async function deleteAdminAccount(id: string): Promise<void> {
  return httpDelete<void>(`/admin/accounts/${id}`);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return httpPost<void, { currentPassword: string; newPassword: string }>(
    '/auth/password/change',
    { currentPassword, newPassword },
  );
}
