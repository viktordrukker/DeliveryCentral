import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, Table, type Column } from '@/components/ds';
import {
  type FeatureFlagAdminEntry,
  fetchFeatureFlags,
  updateFeatureFlag,
} from '@/lib/api/feature-flags-admin';

/**
 * Sprint F-1.1 — Tenant Settings Catalog admin page.
 *
 * Renders the 88-flag registry with category grouping. Admin can flip a
 * flag per-tenant; change takes effect on the next 30s cache cycle (or
 * immediately for the next request after the BE invalidates).
 */
function maturityTone(level: FeatureFlagAdminEntry['maturityLevel']): 'active' | 'warning' | 'info' | 'neutral' | 'danger' {
  switch (level) {
    case 'ga':
      return 'active';
    case 'beta':
      return 'info';
    case 'developing':
      return 'warning';
    case 'scaffolded':
      return 'neutral';
    case 'deprecated':
      return 'danger';
  }
}

export function FeatureFlagsAdminPage(): JSX.Element {
  const [flags, setFlags] = useState<FeatureFlagAdminEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  async function load(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      setFlags(await fetchFeatureFlags());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feature flags.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleToggle(flag: FeatureFlagAdminEntry, next: boolean): Promise<void> {
    setBusyIds((prev) => new Set(prev).add(flag.id));
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, currentValue: next } : f)),
    );
    try {
      await updateFeatureFlag(flag.id, next);
    } catch (e) {
      // Revert on failure
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, currentValue: !next } : f)),
      );
      setError(e instanceof Error ? e.message : 'Failed to update flag.');
    } finally {
      setBusyIds((prev) => {
        const out = new Set(prev);
        out.delete(flag.id);
        return out;
      });
    }
  }

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return flags;
    return flags.filter(
      (f) =>
        f.id.toLowerCase().includes(term) ||
        f.key.toLowerCase().includes(term) ||
        f.description.toLowerCase().includes(term) ||
        f.category.toLowerCase().includes(term),
    );
  }, [flags, filter]);

  const byCategory = useMemo(() => {
    const out = new Map<string, FeatureFlagAdminEntry[]>();
    for (const f of filtered) {
      if (!out.has(f.category)) out.set(f.category, []);
      out.get(f.category)!.push(f);
    }
    return [...out.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const summary = useMemo(() => {
    const total = flags.length;
    const on = flags.filter((f) => f.currentValue).length;
    return { total, on, off: total - on };
  }, [flags]);

  return (
    <PageContainer testId="admin-feature-flags-page">
      <PageHeader
        eyebrow="Administration"
        title="Feature Flags"
        subtitle="Toggle platform features per tenant. Changes propagate after the 30-second flag cache cycle."
      />

      {error ? <ErrorState description={error} onRetry={() => void load()} /> : null}

      {isLoading ? (
        <LoadingState label="Loading flag registry…" variant="skeleton" skeletonType="page" />
      ) : flags.length === 0 ? (
        <EmptyState title="No flags" description="The registry returned no entries." />
      ) : (
        <>
          <SectionCard title={`Summary — ${summary.on}/${summary.total} ON`}>
            <div className="kpi-strip" aria-label="Feature flag summary" style={{ marginBottom: 0 }}>
              <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
                <span className="kpi-strip__value">{summary.on}</span>
                <span className="kpi-strip__label">Enabled</span>
              </div>
              <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-neutral)' }}>
                <span className="kpi-strip__value">{summary.off}</span>
                <span className="kpi-strip__label">Disabled</span>
              </div>
              <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-accent)' }}>
                <span className="kpi-strip__value">{summary.total}</span>
                <span className="kpi-strip__label">Total registered</span>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <label className="field">
                <span className="field__label">Filter</span>
                <input
                  className="field__control"
                  data-testid="flag-filter-input"
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="id / key / description / category"
                  type="search"
                  value={filter}
                />
              </label>
            </div>
          </SectionCard>

          {byCategory.map(([category, items]) => {
            const columns: Column<FeatureFlagAdminEntry>[] = [
              {
                key: 'flag',
                title: 'Flag',
                width: '20%',
                getValue: (flag) => flag.id,
                render: (flag) => (
                  <>
                    <div style={{ fontWeight: 500 }}>{flag.id}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {flag.key}
                    </div>
                  </>
                ),
              },
              {
                key: 'description',
                title: 'Description',
                width: '38%',
                getValue: (flag) => flag.description,
                render: (flag) => <span style={{ fontSize: 12 }}>{flag.description}</span>,
              },
              {
                key: 'maturity',
                title: 'Maturity',
                width: '10%',
                getValue: (flag) => flag.maturityLevel,
                render: (flag) => (
                  <>
                    <StatusBadge
                      label={flag.maturityLevel}
                      tone={maturityTone(flag.maturityLevel)}
                      variant="chip"
                    />
                    {flag.expectedGaSprint ? (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        GA: {flag.expectedGaSprint}
                      </div>
                    ) : null}
                  </>
                ),
              },
              {
                key: 'owner',
                title: 'Owner',
                width: '12%',
                getValue: (flag) => flag.owner,
                render: (flag) => <span style={{ fontSize: 12 }}>{flag.owner}</span>,
              },
              {
                key: 'state',
                title: 'State',
                width: '10%',
                getValue: (flag) => (flag.currentValue ? 'ON' : 'OFF'),
                render: (flag) => (
                  <StatusBadge
                    label={flag.currentValue ? 'ON' : 'OFF'}
                    tone={flag.currentValue ? 'active' : 'neutral'}
                    variant="chip"
                  />
                ),
              },
              {
                key: 'action',
                title: 'Action',
                width: '10%',
                getValue: () => '',
                render: (flag) => {
                  const busy = busyIds.has(flag.id);
                  return (
                    <Button
                      data-testid={`toggle-${flag.id}`}
                      disabled={busy}
                      onClick={() => void handleToggle(flag, !flag.currentValue)}
                      size="sm"
                      type="button"
                      variant={flag.currentValue ? 'secondary' : 'primary'}
                    >
                      {busy ? '…' : flag.currentValue ? 'Disable' : 'Enable'}
                    </Button>
                  );
                },
              },
            ];
            return (
              <SectionCard key={category} title={`${category} (${items.length})`}>
                <Table
                  variant="compact"
                  columns={columns}
                  rows={items}
                  getRowKey={(flag) => flag.id}
                  data-testid={`flag-table-${category}`}
                />
              </SectionCard>
            );
          })}
        </>
      )}
    </PageContainer>
  );
}
