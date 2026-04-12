import { httpGet, httpPost } from './http-client';

export interface JiraIntegrationStatus {
  lastProjectSyncAt?: string;
  lastProjectSyncOutcome?: 'succeeded' | 'failed';
  lastProjectSyncSummary?: string;
  provider: 'jira';
  status: 'configured' | 'degraded' | 'not_configured';
  supportsProjectSync: boolean;
  supportsWorkEvidence: boolean;
}

export interface JiraProjectSyncResponse {
  projectsCreated: number;
  projectsUpdated: number;
  syncedProjectIds: string[];
}

export async function fetchJiraIntegrationStatus(): Promise<JiraIntegrationStatus> {
  return httpGet<JiraIntegrationStatus>('/integrations/jira/status');
}

export async function triggerJiraProjectSync(): Promise<JiraProjectSyncResponse> {
  return httpPost<JiraProjectSyncResponse, Record<string, never>>(
    '/integrations/jira/projects/sync',
    {},
  );
}
