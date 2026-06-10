import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, Drawer } from '@/components/ds';
import { approveTimesheet, rejectTimesheet } from '@/lib/api/timesheets';

export interface TimesheetInspectorTarget {
  id: string;
  personId: string;
  personName: string;
  weekStart: string;
  totalHours?: number;
  overtimeHours?: number;
  status: string;
  submittedAt: string | null;
}

interface TimesheetInspectorDrawerProps {
  open: boolean;
  target: TimesheetInspectorTarget | null;
  onClose: () => void;
  onDecided: (decision: 'approved' | 'rejected') => void;
  onAdvance?: () => void;
  onError?: (message: string) => void;
}

const STANDARD_WEEK_HOURS = 40;

export interface Anomaly {
  severity: 'info' | 'warning' | 'danger';
  text: string;
}

/**
 * Pure timesheet-hours anomaly heuristic. Exported so the time-management
 * approval queue can render the same flags inline (V2-A.11) without
 * duplicating the thresholds. Accepts a structural subset so both the
 * inspector target and the lighter queue row satisfy it.
 */
export function deriveAnomalies(target: { totalHours?: number; overtimeHours?: number }): Anomaly[] {
  const out: Anomaly[] = [];
  const total = target.totalHours ?? 0;
  const ot = target.overtimeHours ?? 0;
  const standard = Math.max(0, total - ot);

  if (total === 0) {
    out.push({ severity: 'danger', text: 'No hours logged this week.' });
  } else if (standard < STANDARD_WEEK_HOURS - 0.5) {
    out.push({
      severity: 'warning',
      text: `Under expected hours: ${standard.toFixed(1)}h reported vs ${STANDARD_WEEK_HOURS}h standard (variance −${(STANDARD_WEEK_HOURS - standard).toFixed(1)}h).`,
    });
  } else if (standard > STANDARD_WEEK_HOURS + 0.5) {
    out.push({
      severity: 'info',
      text: `Over expected hours: ${standard.toFixed(1)}h reported vs ${STANDARD_WEEK_HOURS}h standard.`,
    });
  }

  if (ot > 0) {
    if (ot >= 16) {
      out.push({
        severity: 'danger',
        text: `Heavy overtime: ${ot.toFixed(1)}h — confirm with the requester before approving.`,
      });
    } else if (ot >= 8) {
      out.push({
        severity: 'warning',
        text: `Notable overtime: ${ot.toFixed(1)}h.`,
      });
    } else {
      out.push({
        severity: 'info',
        text: `Some overtime: ${ot.toFixed(1)}h.`,
      });
    }
  }

  return out;
}

/**
 * Manager Timesheet Inspector Drawer — surface #11 of the lean-simplification
 * employee-workspace amendment.
 *
 * Composition (Law 7 — single-screen approval):
 *  • Header: requester + week + status chip
 *  • Body:   KPI triple (reported / standard / overtime) +
 *            anomalies callout +
 *            scoped placeholder for the per-day grid (waits for the
 *            manager-scope week-detail endpoint — issue 254)
 *  • Footer: Approve / Reject buttons ≤ 200 px from the data (Law 4)
 *
 * Reject path requires a reason (POST /timesheets/:id/reject { reason }).
 * Approve uses the existing POST /timesheets/:id/approve {}.
 *
 * Same Law-3 pattern as the Leave Decision Drawer: onAdvance fires after
 * decision so the parent can re-target the drawer at the next pending
 * timesheet without closing.
 */
export function TimesheetInspectorDrawer({
  open,
  target,
  onClose,
  onDecided,
  onAdvance,
  onError,
}: TimesheetInspectorDrawerProps): JSX.Element | null {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setShowRejectReason(false);
    setReason('');
  }, [target?.id]);

  const anomalies = useMemo(() => (target ? deriveAnomalies(target) : []), [target]);

  const handleApprove = useCallback(async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      await approveTimesheet(target.id);
      onDecided('approved');
      onAdvance?.();
      setReason('');
      setShowRejectReason(false);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Failed to approve timesheet.');
    } finally {
      setSubmitting(false);
    }
  }, [target, onDecided, onAdvance, onError]);

  const handleReject = useCallback(async () => {
    if (!target) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      onError?.('Please add a reason before rejecting.');
      return;
    }
    setSubmitting(true);
    try {
      await rejectTimesheet(target.id, trimmed);
      onDecided('rejected');
      onAdvance?.();
      setReason('');
      setShowRejectReason(false);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Failed to reject timesheet.');
    } finally {
      setSubmitting(false);
    }
  }, [target, reason, onDecided, onAdvance, onError]);

  const onRejectClick = (e?: FormEvent): void => {
    if (e) e.preventDefault();
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }
    void handleReject();
  };

  if (!target) return null;

  const total = target.totalHours ?? 0;
  const ot = target.overtimeHours ?? 0;
  const standard = Math.max(0, total - ot);
  const variance = standard - STANDARD_WEEK_HOURS;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="md"
      ariaLabel={`Review timesheet for ${target.personName}`}
      title={
        <span>
          Timesheet — <strong>{target.personName}</strong>
        </span>
      }
      description={`Week of ${target.weekStart}`}
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
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <StatusBadge status={target.status} variant="chip" />
          {target.submittedAt && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Submitted {formatRelative(target.submittedAt)}
            </span>
          )}
        </div>

        {/* KPI triple */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-control)',
          }}
        >
          <KpiBlock
            label="Reported"
            value={`${total.toFixed(1)}h`}
            tone="default"
          />
          <KpiBlock
            label="Standard"
            value={`${standard.toFixed(1)}h`}
            tone={variance < -0.5 ? 'warning' : variance > 0.5 ? 'info' : 'active'}
            foot={variance === 0 ? 'on target' : `${variance > 0 ? '+' : ''}${variance.toFixed(1)}h`}
          />
          <KpiBlock
            label="Overtime"
            value={`${ot.toFixed(1)}h`}
            tone={ot >= 16 ? 'danger' : ot >= 8 ? 'warning' : 'default'}
          />
        </section>

        {/* Anomalies */}
        <section>
          <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Anomalies
          </h3>
          {anomalies.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-status-active)', fontSize: 13 }}>No anomalies detected.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {anomalies.map((a, i) => (
                <li
                  key={i}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-control)',
                    background:
                      a.severity === 'danger'
                        ? 'color-mix(in oklab, var(--color-status-danger) 8%, var(--color-surface))'
                        : a.severity === 'warning'
                          ? 'color-mix(in oklab, var(--color-status-warning) 8%, var(--color-surface))'
                          : 'color-mix(in oklab, var(--color-status-info) 8%, var(--color-surface))',
                    borderLeft: `3px solid ${
                      a.severity === 'danger'
                        ? 'var(--color-status-danger)'
                        : a.severity === 'warning'
                          ? 'var(--color-status-warning)'
                          : 'var(--color-status-info)'
                    }`,
                    fontSize: 13,
                    color: 'var(--color-text)',
                  }}
                >
                  {a.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Per-day grid placeholder */}
        <section>
          <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Day-by-day breakdown
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-subtle)', fontSize: 13 }}>
            The per-day entry grid + project breakdown ships once the manager-scope week-detail endpoint lands (tracked in issue 254). Approve / reject below works against the summary-level data already in this queue.
          </p>
        </section>

        {/* Reject reason (inline) */}
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                placeholder="e.g. Hours don't match positions; please review and resubmit."
                style={{ resize: 'vertical', width: '100%' }}
                autoFocus
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                {reason.length}/1000
              </span>
            </label>
          </section>
        )}
      </div>
    </Drawer>
  );
}

interface KpiBlockProps {
  label: string;
  value: string;
  tone: 'default' | 'active' | 'warning' | 'danger' | 'info';
  foot?: string;
}

function KpiBlock({ label, value, tone, foot }: KpiBlockProps): JSX.Element {
  const color =
    tone === 'active'
      ? 'var(--color-status-active)'
      : tone === 'warning'
        ? 'var(--color-status-warning)'
        : tone === 'danger'
          ? 'var(--color-status-danger)'
          : tone === 'info'
            ? 'var(--color-status-info)'
            : 'var(--color-text)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </span>
      {foot && (
        <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
          {foot}
        </span>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}
