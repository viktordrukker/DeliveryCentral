import { httpGet, httpPost } from './http-client';

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

export interface IntegrationRegistryTestConnectionResult {
  provider: IntegrationProvider;
  reachable: boolean;
  latencyMs: number | null;
  errorMessage?: string;
}

export async function fetchIntegrationsRegistry(): Promise<IntegrationRegistryEntry[]> {
  return httpGet<IntegrationRegistryEntry[]>('/admin/integrations/registry');
}

/**
 * W2-10 — uniform reachability probe for registry-only adapters (JSM,
 * LDAP, LLM). Jira/M365/RADIUS expose their own test-connection
 * endpoints on the legacy controllers.
 */
export async function testIntegrationRegistryConnection(
  provider: 'jsm' | 'ldap' | 'llm',
): Promise<IntegrationRegistryTestConnectionResult> {
  return httpPost<IntegrationRegistryTestConnectionResult, Record<string, never>>(
    `/admin/integrations/registry/${provider}/test-connection`,
    {},
  );
}
