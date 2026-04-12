import { Link } from 'react-router-dom';

import { AuthTokenField } from '@/components/common/AuthTokenField';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ExceptionDetailPanel } from '@/components/exceptions/ExceptionDetailPanel';
import { ExceptionQueueFilters } from '@/components/exceptions/ExceptionQueueFilters';
import { ExceptionQueueTable } from '@/components/exceptions/ExceptionQueueTable';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { useExceptionQueue } from '@/features/exceptions/useExceptionQueue';

export function ExceptionsPage(): JSX.Element {
  const state = useExceptionQueue();
  const tokenState = useStoredApiToken();

  return (
    <PageContainer testId="exceptions-page" viewport>
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/dashboard/planned-vs-actual">
            Open planned vs actual
          </Link>
        }
        eyebrow="Operations"
        subtitle="Review staffing, project, and reconciliation anomalies in one queue instead of hunting through dashboards, detail screens, or logs."
        title="Exception Queue"
      />

      {!tokenState.hasToken ? (
        <SectionCard title="Authentication">
          <AuthTokenField
            hasToken={tokenState.hasToken}
            onClear={tokenState.clearToken}
            onSave={tokenState.saveToken}
            token={tokenState.token}
          />
        </SectionCard>
      ) : null}

      <FilterBar>
        <ExceptionQueueFilters
          isLoading={state.isLoading}
          onAsOfChange={(value) => state.setFilter('asOf', new Date(value).toISOString())}
          onCategoryChange={(value) => state.setFilter('category', value)}
          onProviderChange={(value) => state.setFilter('provider', value)}
          onStatusFilterChange={(value) => state.setFilter('statusFilter', value)}
          onTargetEntityIdChange={(value) => state.setFilter('targetEntityId', value)}
          values={state.filters}
        />
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading exceptions..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        state.data ? (
          <div className="details-grid">
            <SectionCard title="Exception Queue">
              <div className="results-meta">
                <span>
                  {state.data.summary.total} open exception
                  {state.data.summary.total === 1 ? '' : 's'}
                </span>
                <span>Derived from assignments, work evidence, projects, and reconciliation records.</span>
              </div>

              {state.data.items.length === 0 ? (
                <EmptyState
                  description="No exception items match the current queue filters."
                  title="No exceptions in view"
                />
              ) : (
                <ExceptionQueueTable
                  items={state.data.items}
                  onResolve={state.handleResolve}
                  onSelect={(item) => state.selectException(item.id)}
                  onSuppress={state.handleSuppress}
                  selectedId={state.selectedId}
                />
              )}
            </SectionCard>

            <SectionCard title="Exception Review">
              <ExceptionDetailPanel isLoading={state.isLoadingDetail} item={state.activeItem} />
            </SectionCard>
          </div>
        ) : (
          <SectionCard>
            <EmptyState
              description="The exception queue endpoint returned no payload."
              title="No exception data"
            />
          </SectionCard>
        )
      ) : null}
    </PageContainer>
  );
}
