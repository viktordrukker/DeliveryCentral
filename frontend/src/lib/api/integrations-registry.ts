import { httpGet } from './http-client';

export type IntegrationProvider = 'jira' | 'm365' | 'radius' | 'jsm' | 'ldap' | 'llm';
export type IntegrationStatus = 'configured' | 'degraded' | 'not_configured';

export interface IntegrationRegistryEntry {
  provider: IntegrationProvider;
  displayName: string;
  description: string;
  status: IntegrationStatus;
  configured: boolean;
  reachable: boolean | null;
  latencyMs: number | null;
  lastSyncAt: string | null;
  lastSyncOutcome: 'succeeded' | 'failed' | null;
  lastSyncSummary: string | null;
  supportsManualSync: boolean;
  deployment: string | null;
}

export async function fetchIntegrationsRegistry(): Promise<IntegrationRegistryEntry[]> {
  return httpGet<IntegrationRegistryEntry[]>('/admin/integrations/registry');
}
