import { httpGet, httpPost } from './http-client';
import { JiraIntegrationStatus, JiraProjectSyncResponse } from './jira-integrations';

export interface M365IntegrationStatus {
  defaultOrgUnitId: string;
  lastDirectorySyncAt?: string;
  lastDirectorySyncOutcome?: 'failed' | 'succeeded';
  lastDirectorySyncSummary?: string;
  linkedIdentityCount: number;
  matchStrategy: 'email' | 'none';
  provider: 'm365';
  status: 'configured' | 'degraded' | 'not_configured';
  supportsDirectorySync: boolean;
  supportsManagerSync: boolean;
}

export interface M365DirectorySyncResponse {
  employeesCreated: number;
  employeesLinked: number;
  managerMappingsResolved: number;
  syncedPersonIds: string[];
}

export interface M365ReconciliationRecord {
  candidatePersonIds: string[];
  category: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
  externalDisplayName?: string;
  externalEmail?: string;
  externalPrincipalName?: string;
  externalUserId: string;
  lastEvaluatedAt: string;
  lastSeenAt?: string;
  matchedByStrategy?: string;
  personId?: string;
  resolvedManagerPersonId?: string;
  sourceAccountEnabled?: boolean;
  sourceDepartment?: string;
  sourceJobTitle?: string;
  sourceUpdatedAt?: string;
  summary: string;
}

export interface M365ReconciliationReview {
  items: M365ReconciliationRecord[];
  lastSyncAt?: string;
  lastSyncOutcome?: 'failed' | 'succeeded';
  summary: {
    ambiguous: number;
    matched: number;
    staleConflict: number;
    total: number;
    unmatched: number;
  };
}

export interface RadiusIntegrationStatus {
  lastAccountSyncAt?: string;
  lastAccountSyncOutcome?: 'failed' | 'succeeded';
  lastAccountSyncSummary?: string;
  linkedAccountCount: number;
  matchStrategy: 'email' | 'none';
  provider: 'radius';
  status: 'configured' | 'degraded' | 'not_configured';
  supportsAccountSync: boolean;
  unlinkedAccountCount: number;
}

export interface RadiusSyncResponse {
  accountsImported: number;
  accountsLinked: number;
  syncedAccountIds: string[];
  unmatchedAccounts: number;
}

export interface RadiusReconciliationRecord {
  accountPresenceState?: string;
  candidatePersonIds: string[];
  category: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
  externalAccountId: string;
  externalDisplayName?: string;
  externalEmail?: string;
  externalUsername?: string;
  lastEvaluatedAt: string;
  lastSeenAt?: string;
  matchedByStrategy?: string;
  personId?: string;
  sourceType: string;
  sourceUpdatedAt?: string;
  summary: string;
}

export interface RadiusReconciliationReview {
  items: RadiusReconciliationRecord[];
  lastSyncAt?: string;
  lastSyncOutcome?: 'failed' | 'succeeded';
  summary: {
    ambiguous: number;
    matched: number;
    presenceDrift: number;
    total: number;
    unmatched: number;
  };
}

export interface IntegrationSyncHistoryItem {
  failureSummary?: string;
  finishedAt: string;
  integrationType: 'jira' | 'm365' | 'radius';
  itemsProcessedSummary?: string;
  resourceType: string;
  startedAt?: string;
  status: 'FAILED' | 'SUCCEEDED';
  summary: string;
}

export async function fetchAdminJiraStatus(): Promise<JiraIntegrationStatus> {
  return httpGet<JiraIntegrationStatus>('/integrations/jira/status');
}

export async function fetchAdminM365Status(): Promise<M365IntegrationStatus> {
  return httpGet<M365IntegrationStatus>('/integrations/m365/directory/status');
}

export async function fetchAdminRadiusStatus(): Promise<RadiusIntegrationStatus> {
  return httpGet<RadiusIntegrationStatus>('/integrations/radius/status');
}

export async function triggerAdminJiraSync(): Promise<JiraProjectSyncResponse> {
  return httpPost<JiraProjectSyncResponse, Record<string, never>>(
    '/integrations/jira/projects/sync',
    {},
  );
}

export async function triggerAdminM365Sync(): Promise<M365DirectorySyncResponse> {
  return httpPost<M365DirectorySyncResponse, Record<string, never>>(
    '/integrations/m365/directory/sync',
    {},
  );
}

export async function fetchAdminM365Reconciliation(params?: {
  category?: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
  query?: string;
}): Promise<M365ReconciliationReview> {
  const search = new URLSearchParams();
  if (params?.category) {
    search.set('category', params.category);
  }
  if (params?.query?.trim()) {
    search.set('query', params.query.trim());
  }

  return httpGet<M365ReconciliationReview>(
    `/integrations/m365/directory/reconciliation${search.size > 0 ? `?${search.toString()}` : ''}`,
  );
}

export async function triggerAdminRadiusSync(): Promise<RadiusSyncResponse> {
  return httpPost<RadiusSyncResponse, Record<string, never>>(
    '/integrations/radius/accounts/sync',
    {},
  );
}

export async function fetchAdminRadiusReconciliation(params?: {
  category?: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
  query?: string;
}): Promise<RadiusReconciliationReview> {
  const search = new URLSearchParams();
  if (params?.category) {
    search.set('category', params.category);
  }
  if (params?.query?.trim()) {
    search.set('query', params.query.trim());
  }

  return httpGet<RadiusReconciliationReview>(
    `/integrations/radius/reconciliation${search.size > 0 ? `?${search.toString()}` : ''}`,
  );
}

export async function fetchIntegrationSyncHistory(params?: {
  limit?: number;
  provider?: 'jira' | 'm365' | 'radius';
}): Promise<IntegrationSyncHistoryItem[]> {
  const search = new URLSearchParams();
  if (params?.provider) {
    search.set('provider', params.provider);
  }
  if (typeof params?.limit === 'number') {
    search.set('limit', String(params.limit));
  }

  return httpGet<IntegrationSyncHistoryItem[]>(
    `/integrations/history${search.size > 0 ? `?${search.toString()}` : ''}`,
  );
}
