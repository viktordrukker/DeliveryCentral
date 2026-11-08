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

const SOP_DOC_HREF =
  'https://github.com/viktordrukker/DeliveryCentral/blob/main/docs/runbooks/ACCESS_POLICIES_EDIT_SOP.md';

/**
 * W4-11 — exported headerless content for embedding under the consolidated
 * `/admin/governance/roles` tabbed shell. Renders the page header inline so
 * the tab host can compose without duplicating the action affordance.
 */
export function AccessPoliciesContent({ headerless = false }: { headerless?: boolean } = {}): JSX.Element {
  const [policies, setPolicies] = useState<AbacPolicySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const adminRoleUiOn = isFeatureEnabled('adminRolePermissionUI');

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
    <>
      {headerless ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          {adminRoleUiOn ? (
            <Button as={Link} to="/admin/access-policies/edit" size="sm" variant="secondary">
              Edit role presets
            </Button>
          ) : (
            <Button
              as="a"
              href={SOP_DOC_HREF}
              target="_blank"
              rel="noreferrer noopener"
              size="sm"
              variant="secondary"
              data-testid="edit-via-runbook-cta"
            >
              Edit access policies via the admin runbook
            </Button>
          )}
        </div>
      ) : (
        <PageHeader
          eyebrow="Admin"
          subtitle="Active ABAC (Attribute-Based Access Control) policies governing data-level access restrictions."
          title="Access Policies"
          actions={
            adminRoleUiOn
              ? [
                  <Button
                    key="edit-presets"
                    as={Link}
                    to="/admin/access-policies/edit"
                    size="sm"
                    variant="secondary"
                  >
                    Edit role presets
                  </Button>,
                ]
              : [
                  <Button
                    key="edit-runbook"
                    as="a"
                    href={SOP_DOC_HREF}
                    target="_blank"
                    rel="noreferrer noopener"
                    size="sm"
                    variant="secondary"
                    data-testid="edit-via-runbook-cta"
                  >
                    Edit access policies via the admin runbook
                  </Button>,
                ]
          }
        />
      )}

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
            {adminRoleUiOn ? null : (
              <div
                data-testid="edit-via-runbook-note"
                style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}
              >
                <strong>How to edit:</strong> the in-app editor is gated behind{' '}
                <code>flag.feature.admin.rolePermissionUI.enabled</code> and remains OFF during soak.
                Until it flips to GA, edit access policies via the{' '}
                <a href={SOP_DOC_HREF} rel="noreferrer noopener" target="_blank" style={{ color: 'var(--color-accent)' }}>
                  Access Policies Edit SOP
                </a>
                .
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
    </>
  );
}

export function AccessPoliciesPage(): JSX.Element {
  return (
    <PageContainer viewport>
      <AccessPoliciesContent />
    </PageContainer>
  );
}
