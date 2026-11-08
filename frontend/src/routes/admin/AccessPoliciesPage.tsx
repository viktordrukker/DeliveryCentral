import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Button, Table, type Column } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { httpGet } from '@/lib/api/http-client';

interface AbacPolicySummary {
  id: string;
  roles: string[];
  resource: string;
  action: string;
  description: string;
}

const ACTION_TONE: Record<string, StatusTone> = {
  read: 'info',
  create: 'active',
  update: 'warning',
  delete: 'danger',
  approve: 'info',
};

/**
 * W4-11 — content extracted so the unified `/admin/governance/roles`
 * tabbed surface can mount Access Policies inline without round-tripping
 * through the legacy standalone page.
 */
export function AccessPoliciesContent(): JSX.Element {
  const [policies, setPolicies] = useState<AbacPolicySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  useEffect(() => {
    void httpGet<AbacPolicySummary[]>('/admin/access-policies')
      .then((data) => {
        setPolicies(data);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load access policies.');
        setIsLoading(false);
      });
  }, []);

  const allRoles = Array.from(new Set(policies.flatMap((p) => p.roles))).sort();
  const allResources = Array.from(new Set(policies.map((p) => p.resource))).sort();

  const filtered = policies.filter((p) => {
    if (roleFilter && !p.roles.includes(roleFilter)) return false;
    if (resourceFilter && p.resource !== resourceFilter) return false;
    return true;
  });

  if (isLoading) return <LoadingState label="Loading access policies..." />;
  if (error) return <ErrorState description={error} />;

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {isFeatureEnabled('adminRolePermissionUI') ? (
          <div style={{ marginLeft: 'auto' }}>
            <Button as={Link} to="/admin/access-policies/edit" size="sm" variant="secondary">
              Edit role presets
            </Button>
          </div>
        ) : null}
        <label className="field" style={{ flex: '0 1 180px' }}>
          <span className="field__label">Role</span>
          <select className="field__control" onChange={(e) => setRoleFilter(e.target.value)} value={roleFilter}>
            <option value="">All roles</option>
            {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: '0 1 180px' }}>
          <span className="field__label">Resource</span>
          <select className="field__control" onChange={(e) => setResourceFilter(e.target.value)} value={resourceFilter}>
            <option value="">All resources</option>
            {allResources.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <SectionCard>
        {filtered.length === 0 ? (
          <EmptyState description="No policies match the current filters." title="No matching policies" />
        ) : (
          <Table
            variant="compact"
            columns={[
              { key: 'id', title: 'ID', getValue: (p) => p.id, render: (p) => <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.id}</span> },
              { key: 'roles', title: 'Roles', render: (p) => (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {p.roles.map((r) => (<StatusBadge key={r} label={r} size="small" tone="info" />))}
                </div>
              ) },
              { key: 'resource', title: 'Resource', getValue: (p) => p.resource, render: (p) => <span style={{ fontWeight: 600 }}>{p.resource}</span> },
              { key: 'action', title: 'Action', getValue: (p) => p.action, render: (p) => <StatusBadge label={p.action.toUpperCase()} size="small" tone={ACTION_TONE[p.action] ?? 'neutral'} /> },
              { key: 'description', title: 'Description', getValue: (p) => p.description, render: (p) => <span style={{ color: 'var(--color-text-muted)' }}>{p.description}</span> },
            ] as Column<AbacPolicySummary>[]}
            rows={filtered}
            getRowKey={(p) => p.id}
          />
        )}
      </SectionCard>

      <SectionCard>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <strong>Note:</strong> Policies are defined in code at{' '}
          <code>src/modules/identity-access/application/abac/abac-policy.registry.ts</code>. Runtime overrides are
          applied via the ABAC registry and evaluated at the repository layer on each query.
        </div>
      </SectionCard>
    </>
  );
}

export function AccessPoliciesPage(): JSX.Element {
  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Active ABAC (Attribute-Based Access Control) policies governing data-level access restrictions."
        title="Access Policies"
      />
      <AccessPoliciesContent />
    </PageContainer>
  );
}
