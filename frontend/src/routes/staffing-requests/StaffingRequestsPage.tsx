import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PaginationControls } from '@/components/common/PaginationControls';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { ExportButton } from '@/components/common/ExportButton';
import { CopyLinkButton } from '@/components/common/CopyLinkButton';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatDateShort } from '@/lib/format-date';
import {
  DerivedStaffingRequestStatus,
  StaffingRequest,
  fetchStaffingRequests,
} from '@/lib/api/staffing-requests';
import { getAgingDays, getAgingTone, getAgingTooltip } from '@/features/staffing-desk/aging';

const DERIVED_STATUSES: DerivedStaffingRequestStatus[] = [
  'Open',
  'In progress',
  'Filled',
  'Closed',
  'Cancelled',
];

const DERIVED_STATUS_TONE: Record<DerivedStaffingRequestStatus, string> = {
  Open: 'info',
  'In progress': 'pending',
  Filled: 'active',
  Closed: 'neutral',
  Cancelled: 'danger',
};

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'High',
  LOW: 'Low',
  MEDIUM: 'Medium',
  URGENT: 'Urgent',
};

export function StaffingRequestsPage(): JSX.Element {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<StaffingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useFilterParams({ status: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { setActions } = useTitleBarActions();

  // Inject actions + filter into title bar (only 1 filter field)
  useEffect(() => {
    setActions(
      <>
        <select
          onChange={(e) => setFilters({ status: e.target.value })}
          value={filters.status}
          style={{ fontSize: 12, padding: '4px 8px', height: 28 }}
        >
          <option value="">All statuses</option>
          {DERIVED_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ExportButton
          data={requests}
          columns={[
            { key: 'projectName', label: 'Project', accessor: (r) => r.projectName ?? r.projectId },
            { key: 'role', label: 'Role' },
            { key: 'priority', label: 'Priority' },
            { key: 'allocationPercent', label: 'Alloc %' },
            { key: 'startDate', label: 'Start' },
            { key: 'endDate', label: 'End' },
            { key: 'status', label: 'Status' },
            { key: 'headcountFulfilled', label: 'Headcount Fulfilled' },
            { key: 'headcountRequired', label: 'Headcount Required' },
            { key: 'createdAt', label: 'Created' },
          ]}
          filename="staffing_requests"
        />
        <CopyLinkButton />
        <button className="button button--sm" onClick={() => navigate('/staffing-requests/new')} type="button">
          Create request
        </button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, filters.status, setFilters, navigate, requests]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchStaffingRequests()
      .then((data) => setRequests(data))
      .catch(() => setError('Failed to load staffing requests.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredRequests = filters.status
    ? requests.filter((r) => r.derivedStatus === filters.status)
    : requests;

  return (
    <PageContainer viewport>
      <SectionCard title="Staffing Requests">
        {isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {error ? <ErrorState description={error} /> : null}
        {!isLoading && !error && filteredRequests.length === 0 ? (
          <EmptyState description="No staffing requests match the current filter." title="No requests" />
        ) : null}
        {!isLoading && !error && filteredRequests.length > 0 ? (() => {
          const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
          const pagedItems = filteredRequests.slice((page - 1) * pageSize, page * pageSize);
          return (
            <>
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col">Role</th>
                      <th style={{ width: 70 }}>Priority</th>
                      <th style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', width: 60 }}>Alloc %</th>
                      <th style={{ width: 140 }}>Dates</th>
                      <th style={{ width: 72 }}>Age</th>
                      <th style={{ width: 80 }}>Status</th>
                      <th style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', width: 80 }}>
                        HC <TipBalloon tip="Shows fulfilled vs required headcount for this request." arrow="bottom" />
                      </th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedItems.map((r) => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staffing-requests/${r.id}`)}>
                        <td style={{ fontWeight: 500 }}>{r.projectName ?? r.projectId}</td>
                        <td>{r.role}</td>
                        <td style={{ fontSize: 11, fontWeight: 600 }}>{PRIORITY_LABELS[r.priority] ?? r.priority}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.allocationPercent}%</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                          {formatDateShort(r.startDate)} {'\u2192'} {formatDateShort(r.endDate)}
                        </td>
                        <td><StatusBadge label={r.derivedStatus} tone={DERIVED_STATUS_TONE[r.derivedStatus] as never} variant="dot" /></td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.headcountFulfilled}/{r.headcountRequired}</td>
                        <td><Link to={`/staffing-requests/${r.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={filteredRequests.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="requests"
              />
            </>
          );
        })() : null}
      </SectionCard>
    </PageContainer>
  );
}
