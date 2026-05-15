import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ds';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format-date';
import {
  IntegrationRegistryEntry,
  fetchIntegrationsRegistry,
} from '@/lib/api/integrations-registry';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

function statusTone(status: IntegrationRegistryEntry['status']): 'active' | 'warning' | 'neutral' {
  if (status === 'configured') return 'active';
  if (status === 'degraded') return 'warning';
  return 'neutral';
}

export function IntegrationsRegistryPage(): JSX.Element {
  const [rows, setRows] = useState<IntegrationRegistryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchIntegrationsRegistry()
      .then((data) => {
        if (active) {
          setRows(data);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/admin">
            Back to admin panel
          </Button>
        }
        eyebrow="Administration"
        subtitle="Uniform view of every integration adapter: Jira PPM, M365 directory, RADIUS accounts, JSM, LDAP, and the local-LLM scaffold. Status and last-sync metadata only — credentials live in env."
        title="Integrations Registry"
      />

      {isLoading ? (
        <LoadingState label="Loading integrations registry..." variant="skeleton" skeletonType="page" />
      ) : null}
      {error ? <ErrorState description={error} /> : null}

      {!isLoading && !error ? (
        rows.length === 0 ? (
          <SectionCard>
            <EmptyState
              description="The registry endpoint returned no adapters."
              title="No adapters registered"
            />
          </SectionCard>
        ) : (
          <SectionCard title="Adapters">
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Configured</th>
                  <th>Reachable</th>
                  <th style={NUM}>Latency (ms)</th>
                  <th>Last sync</th>
                  <th>Last outcome</th>
                  <th>Summary</th>
                  <th>Manual sync</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.provider}>
                    <td><strong>{row.displayName}</strong></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{row.description}</td>
                    <td>
                      <StatusBadge status={row.status} tone={statusTone(row.status)} variant="chip" />
                    </td>
                    <td>{row.configured ? 'Yes' : 'No'}</td>
                    <td>{row.reachable === null ? '—' : row.reachable ? 'Yes' : 'No'}</td>
                    <td style={NUM}>{row.latencyMs ?? '—'}</td>
                    <td>{row.lastSyncAt ? formatDateTime(row.lastSyncAt) : '—'}</td>
                    <td>{row.lastSyncOutcome ?? '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                      {row.lastSyncSummary ?? '—'}
                    </td>
                    <td>{row.supportsManualSync ? 'Available on /admin/integrations' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )
      ) : null}
    </PageContainer>
  );
}
