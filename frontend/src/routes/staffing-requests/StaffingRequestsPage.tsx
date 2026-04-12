import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { TableSkeleton } from '@/components/common/Skeleton';
import { StaffingRequest, StaffingRequestStatus, fetchStaffingRequests } from '@/lib/api/staffing-requests';

const STATUS_LABELS: Record<StaffingRequestStatus, string> = {
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  FULFILLED: 'Fulfilled',
  IN_REVIEW: 'In Review',
  OPEN: 'Open',
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
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchStaffingRequests(statusFilter ? { status: statusFilter as StaffingRequestStatus } : undefined)
      .then((data) => setRequests(data))
      .catch(() => setError('Failed to load staffing requests.'))
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <button className="button" onClick={() => navigate('/staffing-requests/new')} type="button">
            Create request
          </button>
        }
        eyebrow="Supply & Demand"
        subtitle="Project managers post staffing needs; resource managers propose candidates."
        title="Staffing Requests"
      />

      <div className="filter-bar">
        <label className="field">
          <span className="field__label">Status</span>
          <select
            className="field__control"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <SectionCard title="Staffing Requests">
        {isLoading ? <TableSkeleton cols={6} rows={5} /> : null}
        {error ? <ErrorState description={error} /> : null}
        {!isLoading && !error && requests.length === 0 ? (
          <EmptyState description="No staffing requests match the current filter." title="No requests" />
        ) : null}
        {!isLoading && !error && requests.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Role</th>
                <th>Priority</th>
                <th>Allocation %</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Headcount</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.projectName ?? r.projectId}</td>
                  <td>
                    <Link to={`/staffing-requests/${r.id}`} style={{ color: 'var(--color-accent, #93c5fd)' }}>{r.role}</Link>
                  </td>
                  <td>{PRIORITY_LABELS[r.priority] ?? r.priority}</td>
                  <td>{r.allocationPercent}%</td>
                  <td>
                    {r.startDate} → {r.endDate}
                  </td>
                  <td>
                    <span className={`badge badge--${r.status.toLowerCase().replace('_', '-')}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td>
                    {r.headcountFulfilled}/{r.headcountRequired}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
