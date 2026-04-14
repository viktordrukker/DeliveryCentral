import { useEffect, useState } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { httpGet } from '@/lib/api/http-client';

interface AbacPolicySummary {
  id: string;
  roles: string[];
  resource: string;
  action: string;
  description: string;
}

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

  const actionColor: Record<string, string> = {
    read: 'var(--color-accent)',
    create: 'var(--color-status-active)',
    update: 'var(--color-status-warning)',
    delete: 'var(--color-status-danger)',
    approve: 'var(--color-info)',
  };

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Active ABAC (Attribute-Based Access Control) policies governing data-level access restrictions."
        title="Access Policies"
      />

      {error ? (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-status-danger)', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label className="field" style={{ flex: '0 1 180px' }}>
          <span className="field__label">Role</span>
          <select
            className="field__control"
            onChange={(e) => setRoleFilter(e.target.value)}
            value={roleFilter}
          >
            <option value="">All roles</option>
            {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: '0 1 180px' }}>
          <span className="field__label">Resource</span>
          <select
            className="field__control"
            onChange={(e) => setResourceFilter(e.target.value)}
            value={resourceFilter}
          >
            <option value="">All resources</option>
            {allResources.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading policies…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No policies match the current filters.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>ID</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Roles</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Resource</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Action</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.id}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {p.roles.map((r) => (
                      <span
                        key={r}
                        style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 600 }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.resource}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span
                    style={{
                      color: actionColor[p.action] ?? 'var(--color-text)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {p.action}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        style={{
          marginTop: '1.5rem',
          background: 'var(--color-warning-bg)',
          border: '1px solid var(--color-status-warning)',
          borderRadius: 6,
          padding: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--color-warning-text)',
        }}
      >
        <strong>Note:</strong> Policies are defined in code at{' '}
        <code>src/modules/identity-access/application/abac/abac-policy.registry.ts</code>. Runtime overrides are
        applied via the ABAC registry and evaluated at the repository layer on each query.
      </div>
    </PageContainer>
  );
}
