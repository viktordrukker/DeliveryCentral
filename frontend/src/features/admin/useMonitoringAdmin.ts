import { useEffect, useMemo, useState } from 'react';

import {
  DiagnosticsResponse,
  HealthResponse,
  ReadinessResponse,
  fetchDiagnostics,
  fetchHealth,
  fetchReadiness,
} from '@/lib/api/monitoring';

export interface MonitoringAlert {
  id: string;
  severity: 'degraded' | 'healthy';
  summary: string;
  title: string;
}

export interface MonitoringErrorItem {
  id: string;
  source: string;
  summary: string;
}

export interface MonitoringAdminData {
  alerts: MonitoringAlert[];
  diagnostics: DiagnosticsResponse;
  errors: MonitoringErrorItem[];
  health: HealthResponse;
  overallStatus: 'degraded' | 'ready';
  readiness: ReadinessResponse;
}

interface MonitoringAdminState {
  data: MonitoringAdminData | null;
  error: string | null;
  isLoading: boolean;
}

export function useMonitoringAdmin(): MonitoringAdminState {
  const [data, setData] = useState<MonitoringAdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void Promise.all([fetchHealth(), fetchReadiness(), fetchDiagnostics()])
      .then(([health, readiness, diagnostics]) => {
        if (!isMounted) {
          return;
        }

        setData({
          alerts: buildAlerts(readiness, diagnostics),
          diagnostics,
          errors: buildErrors(diagnostics),
          health,
          overallStatus:
            health.status === 'ok' &&
            readiness.status === 'ready' &&
            diagnostics.integrations.overallStatus === 'ready' &&
            diagnostics.notifications.status === 'ready' &&
            diagnostics.migrations.status === 'ready' &&
            diagnostics.database.connected &&
            diagnostics.database.schemaHealthy
              ? 'ready'
              : 'degraded',
          readiness,
        });
      })
      .catch((reason: Error) => {
        if (!isMounted) {
          return;
        }

        setData(null);
        setError(reason.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(
    () => ({
      data,
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );
}

function buildAlerts(
  readiness: ReadinessResponse,
  diagnostics: DiagnosticsResponse,
): MonitoringAlert[] {
  const readinessAlerts = readiness.checks.map<MonitoringAlert>((check) => ({
    id: `readiness-${check.name}`,
    severity: check.status === 'degraded' ? 'degraded' : 'healthy',
    summary: check.summary,
    title: `${capitalize(check.name)} readiness`,
  }));

  if (diagnostics.notifications.failedDeliveryCount > 0) {
    readinessAlerts.push({
      id: 'notification-failures',
      severity: 'degraded',
      summary: `${diagnostics.notifications.terminalFailureCount} terminal failure(s), ${diagnostics.notifications.retryingDeliveryCount} retrying delivery attempt(s).`,
      title: 'Notification failures',
    });
  }

  if (!diagnostics.database.schemaHealthy) {
    readinessAlerts.push({
      id: 'database-schema',
      severity: 'degraded',
      summary: diagnostics.database.schemaError ?? 'Database schema sanity check failed.',
      title: 'Database schema',
    });
  }

  if (diagnostics.integrations.degradedCount > 0) {
    readinessAlerts.push({
      id: 'integration-summary',
      severity: 'degraded',
      summary: `${diagnostics.integrations.degradedCount} integration provider(s) degraded; ${diagnostics.integrations.neverSyncedCount} have not synced yet.`,
      title: 'Integration health',
    });
  }

  return readinessAlerts;
}

function buildErrors(diagnostics: DiagnosticsResponse): MonitoringErrorItem[] {
  const items: MonitoringErrorItem[] = [];

  if (diagnostics.database.error) {
    items.push({
      id: 'database-error',
      source: 'database',
      summary: diagnostics.database.error,
    });
  }

  if (diagnostics.migrations.error) {
    items.push({
      id: 'migration-error',
      source: 'migrations',
      summary: diagnostics.migrations.error,
    });
  }

  diagnostics.integrations.items
    .filter((item) => item.status === 'degraded' || item.lastOutcome === 'failed')
    .forEach((item) => {
      items.push({
        id: `integration-${item.name}`,
        source: item.name,
        summary: item.summary ?? 'Integration reported a degraded state.',
      });
    });

  if (diagnostics.notifications.failedDeliveryCount > 0) {
    items.push({
      id: 'notifications',
      source: 'notifications',
      summary: diagnostics.notifications.summary,
    });
  }

  if (diagnostics.database.schemaError) {
    items.push({
      id: 'database-schema',
      source: 'database schema',
      summary: diagnostics.database.schemaError,
    });
  }

  return items;
}

function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
}
