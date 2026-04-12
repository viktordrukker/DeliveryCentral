import { httpGet, httpPost } from './http-client';

export interface HrisConfig {
  activeAdapter: 'bamboohr' | 'workday' | 'none';
  bamboohr: { apiKey: string; subdomain: string };
  workday: { tenantUrl: string; clientId: string; clientSecret: string };
  fieldMapping: Record<string, string>;
}

export interface HrisSyncResult {
  adapter: string;
  created: number;
  updated: number;
  errors: string[];
  syncedAt: string;
}

export async function fetchHrisConfig(): Promise<HrisConfig> {
  return httpGet<HrisConfig>('/admin/hris/config');
}

export async function updateHrisConfig(config: Partial<HrisConfig>): Promise<HrisConfig> {
  return httpPost<HrisConfig, Partial<HrisConfig>>('/admin/hris/config', config);
}

export async function triggerHrisSync(): Promise<HrisSyncResult> {
  return httpPost<HrisSyncResult, Record<string, never>>('/admin/hris/sync', {});
}
