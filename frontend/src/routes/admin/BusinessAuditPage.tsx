import { Link } from 'react-router-dom';

import { BusinessAuditFilters } from '@/components/admin/BusinessAuditFilters';
import { exportToXlsx } from '@/lib/export';
import { BusinessAuditTable } from '@/components/admin/BusinessAuditTable';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useBusinessAudit } from '@/features/admin/useBusinessAudit';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { Button } from '@/components/ds';

export function BusinessAuditPage(): JSX.Element {
  const state = useBusinessAudit();
  const tokenState = useStoredApiToken();

  const pageSize = Number(state.limit) || 50;
  const totalPages = Math.max(1, Math.ceil(state.totalCount / pageSize));

  return (
    <PageContainer testId="business-audit-page" viewport>
      <PageHeader
        actions={
          <>
            {state.data.length > 0 ? (
              <Button
                variant="secondary"
                disabled={state.isLoading}
                onClick={() => {
                  exportToXlsx(
                    state.data.map((entry) => ({
                      Action: entry.actionType,
                      Actor: entry.actorId ?? '',
                      'Entity ID': entry.targetEntityId ?? '',
                      'Entity Type': entry.targetEntityType,
                      Timestamp: entry.occurredAt,
                    })),
                    'business-audit',
                  );
                }}
                type="button"
              >
                Export XLSX
              </Button>
            ) : null}
            <Button as={Link} variant="secondary" to="/admin">
              Back to admin panel
            </Button>
          </>
        }
        eyebrow="Administration"
        subtitle="Browse business actions, not technical request logs. This view is meant for governance, HR, and operational investigation workflows."
        title="Business Audit"
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

      <SectionCard title="Investigation Filters">
        <BusinessAuditFilters
          isLoading={state.isLoading}
          limit={state.limit}
          onChange={state.handleChange}
          onLimitChange={state.handleLimitChange}
          onReset={state.handleReset}
          onSubmit={state.handleSubmit}
          values={state.values}
        />
      </SectionCard>

      {state.isLoading ? <LoadingState label="Loading business audit..." variant="skeleton" skeletonType="table" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        <SectionCard title="Business Audit Records">
          <div className="results-meta">
            <span>
              {state.totalCount} record{state.totalCount === 1 ? '' : 's'} total &mdash; page{' '}
              {state.page} of {totalPages}
            </span>
            <span>Business events only. Technical logs stay in monitoring.</span>
          </div>

          {state.data.length === 0 ? (
            <EmptyState
              description="Adjust the investigation filters or broaden the time window to find matching business records."
              title="No business audit records"
            />
          ) : (
            <BusinessAuditTable items={state.data} />
          )}

          {state.totalCount > pageSize ? (
            <div className="pagination">
              <Button variant="secondary" disabled={state.page <= 1 || state.isLoading} onClick={state.handlePrevPage} type="button">
                Previous
              </Button>
              <span className="pagination__info">
                Page {state.page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={state.page >= totalPages || state.isLoading} onClick={state.handleNextPage} type="button">
                Next
              </Button>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
