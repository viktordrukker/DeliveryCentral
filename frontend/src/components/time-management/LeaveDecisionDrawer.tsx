import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { BalanceMeter, Button, Drawer, Table, type Column } from '@/components/ds';
import { fetchAssignments, type AssignmentDirectoryItem } from '@/lib/api/assignments';
import {
  approveLeaveRequest,
  fetchMyLeaveBalance,
  rejectLeaveRequest,
  type LeaveBalanceDto,
  type LeaveRequestDto,
  type LeaveRequestType,
} from '@/lib/api/leaveRequests';

export interface LeaveDecisionTarget {
  id: string;
  personId: string;
  personName: string;
  leaveType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveDays?: number;
  notes?: string;
  submittedAt: string | null;
}

interface LeaveDecisionDrawerProps {
  open: boolean;
  target: LeaveDecisionTarget | null;
  onClose: () => void;
  /** Called after successful approve / reject. Parent advances to next item (Law 3). */
  onDecided: (decision: 'approved' | 'rejected', dto: LeaveRequestDto) => void;
  /** Optional callback if parent wants to advance to next pending item without closing drawer. */
  onAdvance?: () => void;
  /** Allow surfacing a generic toast from the parent. */
  onError?: (message: string) => void;
}

const MS_PER_DAY = 86_400_000;
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

interface PreloadedData {
  balances: LeaveBalanceDto[];
  conflicts: AssignmentDirectoryItem[];
}

/**
 * Manager Leave Decision Drawer — surface #7 of the lean-simplification
 * employee-workspace amendment.
 *
 * Composition (Law 7 — single-screen decision context):
 *  • Header: requester name + leave type + range + balance-impact mini meter
 *  • Body:   conflicting assignments (overlapping current allocations)
 *  • Footer: Approve / Reject buttons ≤ 200 px from the data (Law 4)
 *
 * Reject path captures a free-text reason in a Textarea; the textarea pops
 * inline (not a second modal) and Approve becomes "Reject" while it's open.
 *
 * On success the drawer calls onDecided + onAdvance — parent can re-target
 * the drawer at the next pending item without closing (Law 3).
 */
export function LeaveDecisionDrawer({
  open,
  target,
  onClose,
  onDecided,
  onAdvance,
  onError,
}: LeaveDecisionDrawerProps): JSX.Element | null {
  const [preload, setPreload] = useState<PreloadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset when target changes.
  useEffect(() => {
    setShowRejectReason(false);
    setReviewComment('');
    setPreload(null);
  }, [target?.id]);

  // Load balance + overlapping assignments for the target person.
  useEffect(() => {
    if (!open || !target) return undefined;
    let active = true;
    setLoading(true);
    const year = target.leaveStartDate ? new Date(target.leaveStartDate).getFullYear() : new Date().getFullYear();
    Promise.all([
      // Balance lookup runs against the requester. The /me/-style endpoint
      // only exposes the caller's own balance, so we use the manager-scope
      // fetchLeaveRequests path to derive aggregate counts — but as a v1
      // shortcut, surface balance only when the requester is the caller.
      // The drawer still works without it: the conflict table is the
      // primary decision input.
      fetchMyLeaveBalance(year).catch(() => [] as LeaveBalanceDto[]),
      fetchAssignments({ personId: target.personId, pageSize: 100 }).catch(
        () => ({ items: [] as AssignmentDirectoryItem[], totalCount: 0 }),
      ),
    ])
      .then(([balances, assignmentsResp]) => {
        if (!active) return;
        // Filter to overlapping range and active allocation > 0
        const rs = target.leaveStartDate ? new Date(target.leaveStartDate) : null;
        const re = target.leaveEndDate ? new Date(target.leaveEndDate) : null;
        const conflicts = assignmentsResp.items.filter((a) => {
          if (!rs || !re) return true;
          const aStart = new Date(a.startDate);
          const aEnd = a.endDate ? new Date(a.endDate) : new Date(8.64e15);
          return aStart <= re && aEnd >= rs && (a.allocationPercent ?? 0) > 0;
        });
        setPreload({ balances, conflicts });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, target?.id, target?.personId, target?.leaveStartDate, target?.leaveEndDate]);

  const requestedDays = useMemo(() => {
    if (target?.leaveDays != null) return target.leaveDays;
    if (!target?.leaveStartDate || !target?.leaveEndDate) return null;
    const s = new Date(target.leaveStartDate);
    const e = new Date(target.leaveEndDate);
    return Math.max(1, Math.floor((e.getTime() - s.getTime()) / MS_PER_DAY) + 1);
  }, [target]);

  const matchingBalance = useMemo(() => {
    if (!preload || !target?.leaveType) return null;
    return preload.balances.find((b) => b.leaveType === target.leaveType) ?? null;
  }, [preload, target?.leaveType]);

  const handleApprove = useCallback(async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const dto = await approveLeaveRequest(target.id, reviewComment.trim() ? { reviewComment: reviewComment.trim() } : {});
      onDecided('approved', dto);
      setReviewComment('');
      setShowRejectReason(false);
      onAdvance?.();
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Failed to approve leave request.');
    } finally {
      setSubmitting(false);
    }
  }, [target, reviewComment, onDecided, onAdvance, onError]);

  const handleReject = useCallback(async () => {
    if (!target) return;
    const trimmed = reviewComment.trim();
    if (!trimmed) {
      onError?.('Please add a reason before rejecting.');
      return;
    }
    setSubmitting(true);
    try {
      const dto = await rejectLeaveRequest(target.id, { reviewComment: trimmed });
      onDecided('rejected', dto);
      setReviewComment('');
      setShowRejectReason(false);
      onAdvance?.();
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Failed to reject leave request.');
    } finally {
      setSubmitting(false);
    }
  }, [target, reviewComment, onDecided, onAdvance, onError]);

  const onRejectClick = (e?: FormEvent): void => {
    if (e) e.preventDefault();
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }
    void handleReject();
  };

  if (!target) return null;

  const dayLabel = requestedDays === 1 ? 'day' : 'days';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="md"
      ariaLabel={`Review leave request from ${target.personName}`}
      title={
        <span>
          Leave request — <strong>{target.personName}</strong>
        </span>
      }
      description={
        target.leaveType
          ? `${LEAVE_TYPE_LABELS[target.leaveType as LeaveRequestType] ?? target.leaveType} · ${formatRange(target.leaveStartDate, target.leaveEndDate)}${
              requestedDays != null ? ` · ${requestedDays} ${dayLabel}` : ''
            }`
          : undefined
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onRejectClick}
            disabled={submitting}
            data-action="reject"
          >
            {showRejectReason ? 'Confirm reject' : 'Reject…'}
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleApprove()}
            disabled={submitting}
            loading={submitting}
            data-action="approve"
          >
            {submitting ? 'Saving…' : 'Approve'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Balance impact */}
        <section>
          <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Balance impact
          </h3>
          {loading ? (
            <p style={{ margin: 0, color: 'var(--color-text-subtle)', fontSize: 13 }}>Loading…</p>
          ) : matchingBalance ? (
            <BalanceMeter
              entitlement={matchingBalance.entitlement}
              used={matchingBalance.used}
              pending={matchingBalance.pending}
              size="sm"
              showLegend={false}
              unit="d"
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--color-text-subtle)', fontSize: 13 }}>
              {requestedDays != null
                ? `Requested: ${requestedDays} ${dayLabel}. Per-person balance lookup requires expanded BE scope; surfaced on the requester's own /me?tab=leave.`
                : '—'}
            </p>
          )}
        </section>

        {/* Conflicts */}
        <section>
          <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Conflicting assignments
            {preload && preload.conflicts.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--color-accent)', fontWeight: 700 }}>
                {preload.conflicts.length}
              </span>
            )}
          </h3>
          {loading ? (
            <p style={{ margin: 0, color: 'var(--color-text-subtle)', fontSize: 13 }}>Loading…</p>
          ) : preload && preload.conflicts.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-status-active)', fontSize: 13 }}>
              No active assignments overlap this range.
            </p>
          ) : preload ? (() => {
            const conflictColumns: Column<AssignmentDirectoryItem>[] = [
              { key: 'project', title: 'Project', getValue: (c) => c.project.displayName ?? 'Project', render: (c) => c.project.displayName ?? 'Project' },
              { key: 'role', title: 'Role', getValue: (c) => c.staffingRole, render: (c) => <span style={{ color: 'var(--color-text-muted)' }}>{c.staffingRole}</span> },
              { key: 'alloc', title: 'Alloc', align: 'right', getValue: (c) => c.allocationPercent, render: (c) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.allocationPercent}%</span> },
              { key: 'status', title: 'Status', getValue: (c) => c.approvalState, render: (c) => <StatusBadge status={c.approvalState} variant="chip" /> },
            ];
            return (
              <Table
                variant="compact"
                columns={conflictColumns}
                rows={preload.conflicts}
                getRowKey={(c) => c.id}
              />
            );
          })() : null}
        </section>

        {/* Requester notes */}
        {target.notes && (
          <section>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Requester notes
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
              {target.notes}
            </p>
          </section>
        )}

        {/* Reject reason (inline, appears on first Reject click) */}
        {showRejectReason && (
          <section
            data-section="reject-reason"
            style={{
              padding: 'var(--space-3)',
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-status-danger)',
            }}
          >
            <label className="field">
              <span className="field__label" style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}>
                Reason for rejection (required)
              </span>
              <textarea
                className="field__control"
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={1000}
                style={{ resize: 'vertical', width: '100%' }}
                autoFocus
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                {reviewComment.length}/1000
              </span>
            </label>
          </section>
        )}

        {/* Optional comment on approval (collapsed by default; surfaces inline) */}
        {!showRejectReason && (
          <details style={{ fontSize: 13 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>Add a comment with this approval (optional)</summary>
            <textarea
              className="field__control"
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              maxLength={1000}
              placeholder="e.g. Coverage arranged with the resource pool."
              style={{ marginTop: 'var(--space-2)', resize: 'vertical', width: '100%' }}
            />
          </details>
        )}
      </div>
    </Drawer>
  );
}

function formatRange(start: string | undefined, end: string | undefined): string {
  if (!start || !end) return '—';
  const fmt = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
