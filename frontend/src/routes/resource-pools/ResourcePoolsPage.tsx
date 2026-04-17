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
import {
  ResourcePoolFormValues,
  initialResourcePoolFormValues,
  useResourcePools,
} from '@/features/resource-pools/useResourcePools';
import { RM_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';

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
          canManage ? (
            <button
              className="button"
              onClick={() => {
                setShowCreate((prev) => !prev);
                setFormErrors({});
                setFormValues(initialResourcePoolFormValues);
              }}
              type="button"
            >
              {showCreate ? 'Cancel' : 'Create pool'}
            </button>
          ) : undefined
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
              <button className="button" disabled={state.isSubmitting} type="submit">
                {state.isSubmitting ? 'Creating…' : 'Create pool'}
              </button>
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
            <div style={{ overflowX: 'auto' }}>
              <table className="dash-compact-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Code</th>
                    <th style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>Members</th>
                    <th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.map((pool) => (
                    <tr key={pool.id} style={{ cursor: 'pointer' }} onClick={() => window.location.assign(`/resource-pools/${pool.id}`)}>
                      <td style={{ fontWeight: 500 }}>{pool.name}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{pool.code}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{pool.members.length}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link style={{ fontSize: 10, color: 'var(--color-accent)' }} to={`/resource-pools/${pool.id}`}>
                          Go
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {state.successMessage ? (
          <p className="form-success">{state.successMessage}</p>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
