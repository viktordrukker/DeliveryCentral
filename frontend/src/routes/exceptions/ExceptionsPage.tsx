import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useTitleBarActions } from '@/app/title-bar-context';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { formatDistanceToNow } from 'date-fns';
import { ExceptionDetailPanel } from '@/components/exceptions/ExceptionDetailPanel';
import { ExceptionQueueFilters } from '@/components/exceptions/ExceptionQueueFilters';
import { ExceptionQueueTable } from '@/components/exceptions/ExceptionQueueTable';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { useExceptionQueue } from '@/features/exceptions/useExceptionQueue';

export function ExceptionsPage(): JSX.Element {
  const state = useExceptionQueue();
  const tokenState = useStoredApiToken();
  const { setActions } = useTitleBarActions();

  const handleResolve = useCallback(
    async (id: string, resolution: string): Promise<void> => {
      await state.handleResolve(id, resolution);
      toast.success('Exception resolved');
    },
    [state.handleResolve],
  );

  const handleSuppress = useCallback(
    async (id: string, reason: string): Promise<void> => {
      await state.handleSuppress(id, reason);
      toast.success('Exception suppressed');
    },
    [state.handleSuppress],
  );

  // Inject actions into title bar (filters stay in FilterBar since >3 fields)
  useEffect(() => {
    setActions(
      <>
        <Link className="button button--secondary button--sm" to="/dashboard/planned-vs-actual">
          Open planned vs actual
        </Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions]);

  return (
    <PageContainer testId="exceptions-page" viewport>

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

      {state.isLoading ? <LoadingState label="Loading exceptions..." variant="skeleton" skeletonType="table" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        state.data ? (
          <div className="dashboard-main-grid">
            <SectionCard title="Exception Queue">
              <div className="results-meta">
                <span>
                  {state.data.summary.total} open exception
                  {state.data.summary.total === 1 ? '' : 's'}
                  {' '}<TipBalloon tip="Exceptions surface anomalies from assignments, projects, and time compliance." arrow="left" />
                </span>
                <span>Derived from assignments, projects, and time compliance records.</span>
              </div>

              {state.data.items.length === 0 ? (
                <EmptyState
                  description="No exception items match the current queue filters."
                  title="No exceptions in view"
                />
              ) : (
                <ExceptionQueueTable
                  items={state.data.items}
                  onResolve={handleResolve}
                  onSelect={(item) => state.selectException(item.id)}
                  onSuppress={handleSuppress}
                  selectedId={state.selectedId}
                />
              )}
            </SectionCard>

            <SectionCard title="Exception Review">
              <div style={{ marginBottom: 8 }}><TipBalloon tip="Select an exception row to see full context and resolution actions here." arrow="left" /></div>
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

      <div className="data-freshness">
        {state.lastUpdated ? `Updated ${formatDistanceToNow(state.lastUpdated, { addSuffix: true })}` : 'Loading...'} {'\u00B7'}{' '}
        <button onClick={state.reload} type="button" disabled={state.isLoading}>{state.isLoading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
    </PageContainer>
  );
}
