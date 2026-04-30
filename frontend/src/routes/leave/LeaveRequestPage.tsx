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
import { PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Button, DatePicker, Table, type Column } from '@/components/ds';

const LEAVE_TYPE_LABELS: Record<LeaveRequestType, string> = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  OT_OFF: 'Overtime Off',
  PERSONAL: 'Personal',
  PARENTAL: 'Parental Leave',
  BEREAVEMENT: 'Bereavement',
  STUDY: 'Study Leave',
  OTHER: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'var(--color-status-active)',
  PENDING: 'var(--color-status-warning)',
  REJECTED: 'var(--color-status-danger)',
};

export function LeaveRequestPage(): JSX.Element {
  const { principal } = useAuth();
  const isManager = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);

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
              <DatePicker id="start-date"
 onValueChange={(value) => setStartDate(value)}
 required value={startDate}
 />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="end-date">End Date</label>
              <DatePicker id="end-date"
 min={startDate}
 onValueChange={(value) => setEndDate(value)}
 required value={endDate}
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

          <Button variant="primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="My Leave Requests">
        {myRequests.length === 0 ? (
          <EmptyState
            description="You have not submitted any leave requests yet. Use the form above to request time off."
            title="No leave requests"
          />
        ) : (
          <Table
            variant="compact"
            columns={[
              { key: 'type', title: 'Type', getValue: (r) => LEAVE_TYPE_LABELS[r.type], render: (r) => <span style={{ fontWeight: 500 }}>{LEAVE_TYPE_LABELS[r.type]}</span> },
              { key: 'dates', title: 'Dates', getValue: (r) => `${r.startDate} → ${r.endDate}`, render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.startDate} → {r.endDate}</span> },
              { key: 'status', title: 'Status', getValue: (r) => r.status, render: (r) => (
                <span style={{ background: STATUS_COLORS[r.status] ?? 'var(--color-status-neutral)', borderRadius: '4px', color: 'var(--color-surface)', fontSize: '11px', fontWeight: 600, padding: '1px 6px' }}>
                  {r.status}
                </span>
              ) },
              { key: 'notes', title: 'Notes', getValue: (r) => r.notes ?? '', render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.notes ?? ''}</span> },
              { key: 'submitted', title: 'Submitted', getValue: (r) => r.createdAt, render: (r) => (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {formatDate(r.createdAt)}
                  {r.reviewedAt ? ` · Reviewed ${formatDate(r.reviewedAt)}` : ''}
                </span>
              ) },
            ] as Column<LeaveRequestDto>[]}
            rows={myRequests}
            getRowKey={(r) => r.id}
          />
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
            <Table
              variant="compact"
              columns={[
                { key: 'person', title: 'Person', getValue: (r) => r.personId, render: (r) => <span style={{ fontSize: '12px' }}>{r.personId.slice(0, 8)}…</span> },
                { key: 'type', title: 'Type', getValue: (r) => LEAVE_TYPE_LABELS[r.type], render: (r) => LEAVE_TYPE_LABELS[r.type] },
                { key: 'start', title: 'Start', getValue: (r) => r.startDate, render: (r) => r.startDate },
                { key: 'end', title: 'End', getValue: (r) => r.endDate, render: (r) => r.endDate },
                { key: 'notes', title: 'Notes', getValue: (r) => r.notes ?? '', render: (r) => (
                  <span style={{ display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.notes ?? '—'}
                  </span>
                ) },
                { key: 'actions', title: 'Actions', render: (r) => (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button variant="secondary" size="sm" onClick={() => void handleApprove(r.id)} type="button">Approve</Button>
                    <Button variant="secondary" size="sm" onClick={() => void handleReject(r.id)} style={{ color: 'var(--color-status-danger)' }} type="button">Reject</Button>
                  </div>
                ) },
              ] as Column<LeaveRequestDto>[]}
              rows={pendingRequests}
              getRowKey={(r) => r.id}
            />
          )}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
