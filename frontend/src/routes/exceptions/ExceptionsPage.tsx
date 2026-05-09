import { useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useTitleBarActions } from '@/app/title-bar-context';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ExportButton, type ExportColumn } from '@/components/common/ExportButton';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { ListLayout } from '@/components/layout/ListLayout';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { ExceptionDetailPanel } from '@/components/exceptions/ExceptionDetailPanel';
import { ExceptionQueueFilters } from '@/components/exceptions/ExceptionQueueFilters';
import { ExceptionQueueTable } from '@/components/exceptions/ExceptionQueueTable';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { useExceptionQueue } from '@/features/exceptions/useExceptionQueue';
import { type ExceptionQueueItem } from '@/lib/api/exceptions';
import { Button } from '@/components/ds';

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

  const exceptionsItems = state.data?.items ?? [];
  const exportColumns = useMemo<ExportColumn<ExceptionQueueItem>[]>(
    () => [
      { key: 'observedAt', label: 'Observed', accessor: (r) => r.observedAt },
      { key: 'category', label: 'Category', accessor: (r) => r.category },
      { key: 'sourceContext', label: 'Source', accessor: (r) => r.sourceContext },
      { key: 'projectName', label: 'Project', accessor: (r) => r.projectName ?? '' },
      { key: 'personDisplayName', label: 'Person', accessor: (r) => r.personDisplayName ?? '' },
      { key: 'summary', label: 'Summary', accessor: (r) => r.summary },
      { key: 'status', label: 'Status', accessor: (r) => r.status },
      { key: 'targetEntityId', label: 'Target id', accessor: (r) => r.targetEntityId },
      { key: 'targetEntityType', label: 'Target type', accessor: (r) => r.targetEntityType },
    ],
    [],
  );

  // Inject actions into title bar (filters stay in FilterBar since >3 fields)
  useEffect(() => {
    setActions(
      <>
        <Button as={Link} variant="secondary" size="sm" to="/dashboard/planned-vs-actual">
          Open planned vs actual
        </Button>
        <ExportButton
          data={exceptionsItems}
          columns={exportColumns}
          filename={`exceptions-${state.filters.statusFilter ?? 'open'}`}
        />
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, exceptionsItems, exportColumns, state.filters.statusFilter]);

  const banners = (
    <>
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
      {state.isLoading ? <LoadingState label="Loading exceptions..." variant="skeleton" skeletonType="table" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
    </>
  );

  return (
    <ListLayout
      testId="exceptions-page"
      viewport
      banners={banners}
      filterBar={
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
      }
      freshness={state.lastUpdated ? (
        <DataFreshness
          lastFetch={state.lastUpdated}
          onRefresh={state.reload}
          refreshing={state.isLoading}
        />
      ) : null}
    >
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

    </ListLayout>
  );
}
