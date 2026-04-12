import { httpGet } from './http-client';

export interface HealthResponse {
  diagnosticsPath: string;
  environment: string;
  service: string;
  status: string;
  timestamp: string;
}

export interface ReadinessCheck {
  name: string;
  status: 'degraded' | 'ready';
  summary: string;
}

export interface ReadinessResponse {
  checks: ReadinessCheck[];
  status: 'degraded' | 'ready';
  timestamp: string;
}

export interface DiagnosticsIntegrationItem {
  capabilities: string[];
  lastSyncAt?: string;
  lastOutcome?: string;
  name: string;
  status: string;
  summary?: string;
  summaryMetrics: Array<{
    label: string;
    value: number | string;
  }>;
}

export interface DiagnosticsResponse {
  auditVisibility: {
    lastBusinessAuditAt: string | null;
    totalBusinessAuditRecords: number;
  };
  database: {
    connected: boolean;
    error?: string;
    host: string;
    latencyMs: number | null;
    port: number | null;
    schema: string | null;
    schemaError?: string;
    schemaHealthy: boolean;
    serverTime?: string;
    version?: string;
  };
  integrations: {
    configuredCount: number;
    degradedCount: number;
    items: DiagnosticsIntegrationItem[];
    neverSyncedCount: number;
    overallStatus: 'degraded' | 'ready';
  };
  migrations: {
    appliedCount: number;
    availableLocalCount: number;
    error?: string;
    latestAppliedAt: string | null;
    migrationTableAccessible: boolean;
    pendingLocalCount: number;
    status: 'degraded' | 'ready';
  };
  notifications: {
    enabledChannelCount: number;
    failedDeliveryCount: number;
    lastAttemptedAt: string | null;
    ready: boolean;
    recentOutcomeCount: number;
    retryingDeliveryCount: number;
    status: 'degraded' | 'ready';
    succeededDeliveryCount: number;
    summary: string;
    templateCount: number;
    terminalFailureCount: number;
  };
  service: string;
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return httpGet<HealthResponse>('/health');
}

export async function fetchReadiness(): Promise<ReadinessResponse> {
  return httpGet<ReadinessResponse>('/readiness');
}

export async function fetchDiagnostics(): Promise<DiagnosticsResponse> {
  return httpGet<DiagnosticsResponse>('/diagnostics');
}
