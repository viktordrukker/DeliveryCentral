import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
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

export function AccessPoliciesPage(): JSX.Element {
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

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Active ABAC (Attribute-Based Access Control) policies governing data-level access restrictions."
        title="Access Policies"
      />

      {isLoading ? <LoadingState label="Loading access policies..." /> : null}
      {error ? <ErrorState description={error} /> : null}

      {!isLoading && !error ? (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Roles</th>
                      <th>Resource</th>
                      <th>Action</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.id}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {p.roles.map((r) => (
                              <StatusBadge key={r} label={r} size="small" tone="info" />
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.resource}</td>
                        <td>
                          <StatusBadge label={p.action.toUpperCase()} size="small" tone={ACTION_TONE[p.action] ?? 'neutral'} />
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      ) : null}
    </PageContainer>
  );
}
