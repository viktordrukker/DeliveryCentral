import { FormEvent, useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { formatDate } from '@/lib/format-date';
import {
  LeaveRequestDto,
  LeaveRequestType,
  approveLeaveRequest,
  createLeaveRequest,
  fetchLeaveRequests,
  fetchMyLeaveRequests,
  rejectLeaveRequest,
} from '@/lib/api/leaveRequests';
import { useAuth } from '@/app/auth-context';

const LEAVE_TYPE_LABELS: Record<LeaveRequestType, string> = {
  ANNUAL: 'Annual Leave',
  OTHER: 'Other',
  SICK: 'Sick Leave',
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'var(--color-status-active)',
  PENDING: 'var(--color-status-warning)',
  REJECTED: 'var(--color-status-danger)',
};

export function LeaveRequestPage(): JSX.Element {
  const { principal } = useAuth();
  const isManager =
    principal?.roles.some((r) =>
      ['hr_manager', 'admin', 'director', 'resource_manager'].includes(r),
    ) ?? false;

  const [myRequests, setMyRequests] = useState<LeaveRequestDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveRequestType>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  function loadData(): void {
    setIsLoading(true);
    setError(null);

    const promises: Array<Promise<unknown>> = [
      fetchMyLeaveRequests().then(setMyRequests),
    ];
    if (isManager) {
      promises.push(
        fetchLeaveRequests({ status: 'PENDING' }).then(setPendingRequests),
      );
    }

    void Promise.all(promises)
      .catch(() => setError('Failed to load leave requests.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadData, [isManager]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!startDate || !endDate) {
      setSubmitError('Start date and end date are required.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createLeaveRequest({
        endDate,
        notes: notes || undefined,
        startDate,
        type: leaveType,
      });
      setMyRequests((prev) => [created, ...prev]);
      setStartDate('');
      setEndDate('');
      setNotes('');
      setSuccessMessage('Leave request submitted successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setSubmitError('Failed to submit leave request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(id: string): Promise<void> {
    try {
      await approveLeaveRequest(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      setMyRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r)),
      );
    } catch {
      setError('Failed to approve leave request.');
    }
  }

  async function handleReject(id: string): Promise<void> {
    try {
      await rejectLeaveRequest(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      setMyRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'REJECTED' } : r)),
      );
    } catch {
      setError('Failed to reject leave request.');
    }
  }

  return (
    <PageContainer testId="leave-request-page">
      <PageHeader
        eyebrow="My Work"
        subtitle="Submit and track your leave requests. Managers can approve or reject pending requests."
        title="Time Off"
      />

      {isLoading ? <LoadingState label="Loading leave requests..." variant="skeleton" skeletonType="table" /> : null}
      {error ? <ErrorState description={error} /> : null}

      <SectionCard title="Request Leave">
        <form onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: '480px' }}>
          <div className="field" style={{ marginBottom: '12px' }}>
            <label className="field__label" htmlFor="leave-type">Leave Type</label>
            <select
              className="field__control"
              id="leave-type"
              onChange={(e) => setLeaveType(e.target.value as LeaveRequestType)}
              value={leaveType}
            >
              <option value="ANNUAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="start-date">Start Date</label>
              <input
                className="field__control"
                id="start-date"
                onChange={(e) => setStartDate(e.target.value)}
                required
                type="date"
                value={startDate}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="end-date">End Date</label>
              <input
                className="field__control"
                id="end-date"
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                type="date"
                value={endDate}
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: '16px' }}>
            <label className="field__label" htmlFor="leave-notes">Notes (optional)</label>
            <textarea
              className="field__control"
              id="leave-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant details..."
              rows={3}
              style={{ resize: 'vertical' }}
              value={notes}
            />
          </div>

          {submitError ? (
            <p style={{ color: 'var(--color-status-danger)', fontSize: '13px', marginBottom: '8px' }}>{submitError}</p>
          ) : null}
          {successMessage ? (
            <p style={{ color: 'var(--color-status-active)', fontSize: '13px', marginBottom: '8px' }}>{successMessage}</p>
          ) : null}

          <button
            className="button button--primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="My Leave Requests">
        {myRequests.length === 0 ? (
          <EmptyState
            description="You have not submitted any leave requests yet. Use the form above to request time off."
            title="No leave requests"
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500 }}>{LEAVE_TYPE_LABELS[req.type]}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{req.startDate} → {req.endDate}</td>
                    <td>
                      <span
                        style={{
                          background: STATUS_COLORS[req.status] ?? 'var(--color-status-neutral)',
                          borderRadius: '4px',
                          color: 'var(--color-surface)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '1px 6px',
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{req.notes ?? ''}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {formatDate(req.createdAt)}
                      {req.reviewedAt ? ` · Reviewed ${formatDate(req.reviewedAt)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {isManager ? (
        <SectionCard title="Pending Approval Queue">
          {pendingRequests.length === 0 ? (
            <EmptyState
              description="All leave requests have been reviewed. No pending approvals."
              title="No pending requests"
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dash-compact-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontSize: '12px' }}>{req.personId.slice(0, 8)}…</td>
                      <td>{LEAVE_TYPE_LABELS[req.type]}</td>
                      <td>{req.startDate}</td>
                      <td>{req.endDate}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.notes ?? '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="button button--secondary"
                            onClick={() => void handleApprove(req.id)}
                            style={{ fontSize: '12px', padding: '2px 8px' }}
                            type="button"
                          >
                            Approve
                          </button>
                          <button
                            className="button button--secondary"
                            onClick={() => void handleReject(req.id)}
                            style={{ color: 'var(--color-status-danger)', fontSize: '12px', padding: '2px 8px' }}
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
