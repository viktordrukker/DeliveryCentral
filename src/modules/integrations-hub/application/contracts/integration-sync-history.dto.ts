export interface IntegrationSyncHistoryItemDto {
  failureSummary?: string;
  finishedAt: string;
  integrationType: 'jira' | 'm365' | 'radius';
  itemsProcessedSummary?: string;
  resourceType: string;
  startedAt?: string;
  status: 'FAILED' | 'SUCCEEDED';
  summary: string;
}

