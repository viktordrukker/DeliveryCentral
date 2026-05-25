import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Table, type Column } from '@/components/ds';
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
        ) : (() => {
          const columns: Column<IntegrationRegistryEntry>[] = [
            { key: 'provider', title: 'Provider', getValue: (r) => r.displayName, render: (r) => <strong>{r.displayName}</strong> },
            { key: 'description', title: 'Description', getValue: (r) => r.description, render: (r) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{r.description}</span> },
            { key: 'status', title: 'Status', getValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} tone={statusTone(r.status)} variant="chip" /> },
            { key: 'configured', title: 'Configured', getValue: (r) => (r.configured ? 'Yes' : 'No'), render: (r) => (r.configured ? 'Yes' : 'No') },
            { key: 'reachable', title: 'Reachable', getValue: (r) => (r.reachable === null ? '—' : r.reachable ? 'Yes' : 'No'), render: (r) => (r.reachable === null ? '—' : r.reachable ? 'Yes' : 'No') },
            { key: 'latency', title: 'Latency (ms)', align: 'right', getValue: (r) => r.latencyMs ?? 0, render: (r) => <span style={NUM}>{r.latencyMs ?? '—'}</span> },
            { key: 'lastSync', title: 'Last sync', getValue: (r) => r.lastSyncAt ?? '', render: (r) => (r.lastSyncAt ? formatDateTime(r.lastSyncAt) : '—') },
            { key: 'lastOutcome', title: 'Last outcome', getValue: (r) => r.lastSyncOutcome ?? '', render: (r) => r.lastSyncOutcome ?? '—' },
            { key: 'summary', title: 'Summary', getValue: (r) => r.lastSyncSummary ?? '', render: (r) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{r.lastSyncSummary ?? '—'}</span> },
            { key: 'manualSync', title: 'Manual sync', getValue: (r) => (r.supportsManualSync ? 'yes' : 'no'), render: (r) => (r.supportsManualSync ? 'Available on /admin/integrations' : '—') },
          ];
          return (
            <SectionCard title="Adapters">
              <Table variant="compact" columns={columns} rows={rows} getRowKey={(r) => r.provider} />
            </SectionCard>
          );
        })()
      ) : null}
    </PageContainer>
  );
}
