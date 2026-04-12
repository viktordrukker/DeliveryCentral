export interface JiraIntegrationStatusDto {
  provider: 'jira';
  status: 'configured' | 'degraded' | 'not_configured';
  supportsProjectSync: boolean;
  supportsWorkEvidence: boolean;
  lastProjectSyncAt?: string;
  lastProjectSyncOutcome?: 'succeeded' | 'failed';
  lastProjectSyncSummary?: string;
}
