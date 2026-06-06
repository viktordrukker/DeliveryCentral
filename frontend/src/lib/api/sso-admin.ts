import { httpGet, httpPost, httpPut } from './http-client';

/**
 * NEW-LGL-2 — SSO admin API client.
 *
 * Backend lives at `src/modules/auth/sso-admin.controller.ts`. The plaintext
 * client secret is never returned; the server only ever surfaces
 * `clientSecretSet: boolean` so the UI can show a "secret stored" indicator.
 */
export type SsoProvider = 'google' | 'azure_ad' | 'okta' | 'oidc';

export interface SsoConfig {
  provider: SsoProvider;
  clientId: string;
  discoveryUrl: string;
  clientSecretSet: boolean;
  autoProvisionUsers: boolean;
}

export interface SsoUpdateRequest {
  provider: SsoProvider;
  clientId: string;
  discoveryUrl: string;
  /**
   * Plaintext secret. Omit to keep the stored secret unchanged; pass `''`
   * to clear it.
   */
  clientSecret?: string;
  autoProvisionUsers: boolean;
}

export interface SsoTestResult {
  ok: boolean;
  issuer?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  error?: string;
}

export async function fetchSsoConfig(): Promise<SsoConfig> {
  return httpGet<SsoConfig>('/admin/sso/config');
}

export async function updateSsoConfig(body: SsoUpdateRequest): Promise<SsoConfig> {
  return httpPut<SsoConfig, SsoUpdateRequest>('/admin/sso/config', body);
}

export async function testSsoConnection(): Promise<SsoTestResult> {
  return httpPost<SsoTestResult, Record<string, never>>('/admin/sso/test', {});
}
