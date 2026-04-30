import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ExportButton } from '@/components/common/ExportButton';
import {
  ResourcePoolFormValues,
  initialResourcePoolFormValues,
  useResourcePools,
} from '@/features/resource-pools/useResourcePools';
import { RM_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Button, Table, type Column } from '@/components/ds';
import type { ResourcePool } from '@/lib/api/resource-pools';

export function ResourcePoolsPage(): JSX.Element {
  const { principal } = useAuth();
  const state = useResourcePools();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formValues, setFormValues] = useState<ResourcePoolFormValues>(initialResourcePoolFormValues);
  const [formErrors, setFormErrors] = useState<Partial<ResourcePoolFormValues>>({});

  const canManage = hasAnyRole(principal?.roles, RM_MANAGE_ROLES);

  const filteredPools = state.pools.filter(
    (pool) =>
      !search ||
      pool.name.toLowerCase().includes(search.toLowerCase()) ||
      pool.code.toLowerCase().includes(search.toLowerCase()),
  );

  function handleFieldChange(field: keyof ResourcePoolFormValues, value: string): void {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const errors: Partial<ResourcePoolFormValues> = {};
    if (!formValues.code.trim()) errors.code = 'Code is required.';
    if (!formValues.name.trim()) errors.name = 'Name is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!validate()) return;
    const success = await state.createPool(formValues);
    if (success) {
      setFormValues(initialResourcePoolFormValues);
      setFormErrors({});
      setShowCreate(false);
    }
  }

  return (
    <PageContainer testId="resource-pools-page">
      <PageHeader
        actions={
          <>
            <ExportButton
              data={filteredPools}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'description', label: 'Description' },
                { key: 'memberCount', label: 'Members' },
              ]}
              filename="resource_pools"
            />
            {canManage ? (
              <Button
                variant="primary"
                onClick={() => {
                  setShowCreate((prev) => !prev);
                  setFormErrors({});
                  setFormValues(initialResourcePoolFormValues);
                }}
                type="button"
              >
                {showCreate ? 'Cancel' : 'Create pool'}
              </Button>
            ) : null}
          </>
        }
        eyebrow="Resource Management"
        subtitle="Named pools of people available for staffing allocation across projects."
        title="Resource Pools"
      />

      {showCreate && canManage ? (
        <SectionCard title="Create Resource Pool">
          {state.error ? <ErrorState description={state.error} /> : null}
          <form className="form-stack" onSubmit={(e) => void handleSubmit(e)}>
            <label className="field">
              <span className="field__label">Code *</span>
              <input
                aria-invalid={!!formErrors.code}
                className="field__control"
                onChange={(e) => handleFieldChange('code', e.target.value)}
                placeholder="e.g. BACKEND"
                type="text"
                value={formValues.code}
              />
              {formErrors.code ? <span className="field__error">{formErrors.code}</span> : null}
            </label>
            <label className="field">
              <span className="field__label">Name *</span>
              <input
                aria-invalid={!!formErrors.name}
                className="field__control"
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g. Backend Engineers"
                type="text"
                value={formValues.name}
              />
              {formErrors.name ? <span className="field__error">{formErrors.name}</span> : null}
            </label>
            <label className="field">
              <span className="field__label">Description</span>
              <input
                className="field__control"
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Optional description"
                type="text"
                value={formValues.description}
              />
            </label>
            <div className="form-actions">
              <Button variant="primary" disabled={state.isSubmitting} type="submit">
                {state.isSubmitting ? 'Creating…' : 'Create pool'}
              </Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <FilterBar>
        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code"
            type="search"
            value={search}
          />
        </label>
      </FilterBar>

      <SectionCard title="Resource Pools">
        {state.isLoading ? <LoadingState label="Loading resource pools..." variant="skeleton" skeletonType="table" /> : null}
        {!state.isLoading && state.error && !showCreate ? (
          <ErrorState description={state.error} />
        ) : null}

        {!state.isLoading && !state.error ? (
          filteredPools.length === 0 ? (
            <EmptyState
              action={canManage ? { href: '#', label: 'Create Pool' } : undefined}
              description="No resource pools match the current filter."
              title="No pools"
            />
          ) : (
            <Table
              variant="compact"
              columns={[
                { key: 'name', title: 'Name', getValue: (p) => p.name, render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
                { key: 'code', title: 'Code', getValue: (p) => p.code, render: (p) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.code}</span> },
                { key: 'members', title: 'Members', align: 'right', getValue: (p) => p.members.length, render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.members.length}</span> },
                { key: 'go', title: '', align: 'right', render: (p) => (
                  <Link style={{ fontSize: 10, color: 'var(--color-accent)' }} to={`/resource-pools/${p.id}`} onClick={(e) => e.stopPropagation()}>Go</Link>
                ) },
              ] as Column<ResourcePool>[]}
              rows={filteredPools}
              getRowKey={(p) => p.id}
              onRowClick={(p) => window.location.assign(`/resource-pools/${p.id}`)}
            />
          )
        ) : null}

        {state.successMessage ? (
          <p className="form-success">{state.successMessage}</p>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
