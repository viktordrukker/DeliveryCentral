// Typed API wrapper for the in-app setup wizard. Mirrors the backend
// SetupController (src/modules/setup/presentation/setup.controller.ts).
//
// Every call below targets endpoints that exist BEFORE the operator can
// log in — none of them rely on a Bearer token. Token gating is via the
// custom `X-Setup-Token` header which is supplied by the wizard's
// in-memory token store (see useSetupWizard).

import { httpGet, httpPost } from './http-client';

export interface SetupStatus {
  required: boolean;
  tokenRequired: boolean;
  runId: string | null;
  nextStep: SetupStepKey | null;
  completedAt: string | null;
  fingerprint: ConnectionFingerprint | null;
}

export type SetupStepKey =
  | 'preflight'
  | 'migrations'
  | 'tenant'
  | 'admin'
  | 'integrations'
  | 'monitoring'
  | 'seed'
  | 'complete';

export type SeedProfile = 'demo' | 'preset' | 'clean';

export type PreflightBranch =
  | 'EMPTY_POSTGRES'
  | 'EMPTY_DB'
  | 'MIGRATIONS_OK'
  | 'MIGRATIONS_BEHIND'
  | 'ORPHAN_TABLES'
  | 'MIGRATIONS_AHEAD';

export interface ConnectionFingerprint {
  host: string;
  port: number;
  database: string;
  user: string;
  serverVersion: string | null;
}

export interface PreflightResult {
  branch: PreflightBranch;
  fingerprint: ConnectionFingerprint;
  migrations: {
    inDb: string[];
    onDisk: string[];
    pending: string[];
    failed: string[];
    ahead: string[];
  };
  schemaDiffSql: string | null;
  hostFacts: { diskFreeGb: number | null; memTotalGb: number | null };
}

export interface PreflightResponse {
  runId: string;
  result: PreflightResult;
}

export interface TenantInput {
  code: string;
  name: string;
  timezone: string;
  locale: string;
  currency: string;
}

export interface AdminInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface IntegrationsInput {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  emailFromAddress?: string;
  corsOrigin?: string;
  accessTokenExpiresInSec?: number;
  refreshTokenExpiresInSec?: number;
}

export interface MonitoringForwarderInput {
  enabled: boolean;
  endpoint?: string;
  hecUrl?: string;
  token?: string;
  apiKey?: string;
  region?: string;
  host?: string;
  port?: number;
  headers?: string;
}

export interface MonitoringInput {
  otlp?: MonitoringForwarderInput;
  splunk?: MonitoringForwarderInput;
  datadog?: MonitoringForwarderInput;
  syslog?: MonitoringForwarderInput;
}

function tokenHeader(token: string | null): Record<string, string> {
  return token ? { 'X-Setup-Token': token } : {};
}

// ─── Public (no token) ────────────────────────────────────────────────────

export async function fetchSetupStatus(): Promise<SetupStatus> {
  return httpGet<SetupStatus>('/setup/status');
}

export async function issueSetupToken(): Promise<{ tokenIssued: boolean }> {
  return httpPost<{ tokenIssued: boolean }, Record<string, never>>('/setup/token/issue', {});
}

// ─── Token-gated wizard steps ─────────────────────────────────────────────

export async function runPreflight(token: string, runId?: string): Promise<PreflightResponse> {
  return httpPost<PreflightResponse, { runId?: string }>('/setup/preflight', { runId }, {
    headers: tokenHeader(token),
  });
}

export async function createDatabase(token: string, runId: string): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, { runId: string }>('/setup/preflight/create-database', { runId }, {
    headers: tokenHeader(token),
  });
}

export async function applyMigrations(
  token: string,
  runId: string,
  options: { wipeFirst?: boolean } = {},
): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, { runId: string; wipeFirst?: boolean }>(
    '/setup/migrations/apply',
    { runId, ...options },
    { headers: tokenHeader(token) },
  );
}

export async function upsertTenant(
  token: string,
  runId: string,
  input: TenantInput,
): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, TenantInput & { runId: string }>(
    '/setup/tenant',
    { runId, ...input },
    { headers: tokenHeader(token) },
  );
}

export async function createAdmin(
  token: string,
  runId: string,
  input: AdminInput,
): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, AdminInput & { runId: string }>(
    '/setup/admin',
    { runId, ...input },
    { headers: tokenHeader(token) },
  );
}

export async function saveIntegrations(
  token: string,
  runId: string,
  input: IntegrationsInput,
): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, IntegrationsInput & { runId: string }>(
    '/setup/integrations',
    { runId, ...input },
    { headers: tokenHeader(token) },
  );
}

export async function sendSmtpTest(
  token: string,
  runId: string,
  recipient: string,
): Promise<{ ok: boolean; detail?: string }> {
  return httpPost<{ ok: boolean; detail?: string }, { runId: string; recipient: string }>(
    '/setup/integrations/smtp-test',
    { runId, recipient },
    { headers: tokenHeader(token) },
  );
}

export async function saveMonitoring(
  token: string,
  runId: string,
  input: MonitoringInput,
): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, MonitoringInput & { runId: string }>(
    '/setup/monitoring',
    { runId, ...input },
    { headers: tokenHeader(token) },
  );
}

export async function runSeed(
  token: string,
  runId: string,
  profile: SeedProfile,
): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, { runId: string; profile: SeedProfile }>(
    '/setup/seed',
    { runId, profile },
    { headers: tokenHeader(token) },
  );
}

export async function completeSetup(token: string, runId: string): Promise<{ ok: true }> {
  return httpPost<{ ok: true }, { runId: string }>('/setup/complete', { runId }, {
    headers: tokenHeader(token),
  });
}

// ─── Diagnostic bundle download ───────────────────────────────────────────

export function diagnosticBundleHref(token: string, runId: string): string {
  // Returns a direct GET URL the wizard can put into an <a download>; the
  // browser auto-saves the gzipped JSON.
  const baseUrl = window.location.origin;
  // We can't put X-Setup-Token in <a href>; instead surface the URL the
  // operator can curl with the header. The button component fetches in
  // JS and triggers a Blob download.
  return `${baseUrl}/api/setup/diagnostic-bundle?runId=${encodeURIComponent(runId)}`;
}

export async function downloadDiagnosticBundle(token: string, runId: string): Promise<void> {
  const url = `/api/setup/diagnostic-bundle?runId=${encodeURIComponent(runId)}`;
  const res = await fetch(url, { headers: { 'X-Setup-Token': token } });
  if (!res.ok) {
    throw new Error(`Diagnostic bundle download failed (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const filename =
    res.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] ??
    `dc-setup-${runId}.json.gz`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
