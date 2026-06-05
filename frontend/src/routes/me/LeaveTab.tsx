import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { BalanceMeter, Button, Calendar, Pct, type CalendarEvent } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { fetchEmployeeDashboard, type EmployeeDashboardResponse } from '@/lib/api/dashboard-employee';
import { fetchPublicHolidays, type PublicHoliday } from '@/lib/api/my-time';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  fetchMyLeaveBalance,
  fetchMyLeaveRequests,
  previewLeave,
  type LeaveBalanceDto,
  type LeaveImpactPreviewDto,
  type LeaveRequestDto,
  type LeaveRequestType,
} from '@/lib/api/leaveRequests';

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

const MS_PER_DAY = 86_400_000;

interface Loaded {
  requests: LeaveRequestDto[];
  balances: LeaveBalanceDto[];
  holidays: PublicHoliday[];
  dashboard: EmployeeDashboardResponse | null;
}

/**
 * /me?tab=leave — redesigned Leave surface.
 *
 * Two-column layout:
 *   • Left  — BalanceMeter (entitlement / used / pending / remaining) plus
 *             inline request form with live preview (working days excl.
 *             weekends + public holidays, conflicting assignments warning,
 *             balance-after projection).
 *   • Right — Calendar in year mode showing approved leave (green),
 *             pending (amber), public holidays (info), weekends (subtle).
 *
 * Reads existing endpoints:
 *   GET /leave-requests/my             (mine + status)
 *   GET /leave-requests/my-balance     (added in this PR — entitlement etc.)
 *   GET /public-holidays?year=YYYY     (holiday overlay)
 *   GET /employees/:id/dashboard       (currentAssignments → conflict check)
 *
 * No new tokens. Uses Calendar + BalanceMeter (ds-trunk-2 / ds-trunk-3).
 */
export function LeaveTab(): JSX.Element {
  const { principal } = useAuth();
  const year = new Date().getFullYear();
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<LeaveRequestType>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // LEAN-P4-missing-11 — server preview (dsRefresh) + cancel.
  const dsRefresh = isFeatureEnabled('dsRefresh');
  const [serverPreview, setServerPreview] = useState<LeaveImpactPreviewDto | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const personId = principal?.personId;

  const loadAll = (): void => {
    if (!personId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchMyLeaveRequests(),
      fetchMyLeaveBalance(year).catch(() => [] as LeaveBalanceDto[]),
      fetchPublicHolidays(year),
      fetchEmployeeDashboard(personId).catch(() => null),
    ])
      .then(([requests, balances, holidays, dashboard]) => {
        setData({ requests, balances, holidays, dashboard });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load leave data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    if (!personId) return undefined;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchMyLeaveRequests(),
      fetchMyLeaveBalance(year).catch(() => [] as LeaveBalanceDto[]),
      fetchPublicHolidays(year),
      fetchEmployeeDashboard(personId).catch(() => null),
    ])
      .then(([requests, balances, holidays, dashboard]) => {
        if (!active) return;
        setData({ requests, balances, holidays, dashboard });
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load leave data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [personId, year]);

  // LEAN-P4-missing-11 — debounced server-side preview when dsRefresh is on.
  // Augments the client-side estimate with authoritative conflicts coming
  // from the backend (project assignments + team leave in same OrgUnit).
  useEffect(() => {
    if (!dsRefresh) return;
    if (!startDate || !endDate) {
      setServerPreview(null);
      return;
    }
    let active = true;
    const handle = window.setTimeout(() => {
      previewLeave({ startDate, endDate, type })
        .then((dto) => {
          if (active) setServerPreview(dto);
        })
        .catch(() => {
          if (active) setServerPreview(null);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [dsRefresh, startDate, endDate, type]);

  const onCancelConfirm = async (): Promise<void> => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelLeaveRequest(cancelTarget.id);
      setCancelTarget(null);
      loadAll();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to cancel request.');
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  // ── Calendar events: approved + pending + holidays + own leaves ─────
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!data) return [];
    const events: CalendarEvent[] = [];
    for (const r of data.requests) {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const kind = r.status === 'APPROVED' ? 'approved' : r.status === 'PENDING' ? 'pending' : null;
      if (!kind) continue;
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + MS_PER_DAY)) {
        events.push({ date: new Date(d), kind, label: r.notes ?? LEAVE_TYPE_LABELS[r.type] });
      }
    }
    for (const h of data.holidays) {
      events.push({ date: new Date(h.date), kind: 'holiday', label: h.name });
    }
    return events;
  }, [data]);

  // ── Preview calculation ────────────────────────────────────────────
  const preview = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) return { error: 'End date must not be before start date.' as const };
    const holidayKeys = new Set((data?.holidays ?? []).map((h) => h.date.slice(0, 10)));
    let workingDays = 0;
    const skippedHolidays: string[] = [];
    for (let d = new Date(s); d <= e; d = new Date(d.getTime() + MS_PER_DAY)) {
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const iso = d.toISOString().slice(0, 10);
      const isHoliday = holidayKeys.has(iso);
      if (isWeekend) continue;
      if (isHoliday) {
        skippedHolidays.push(iso);
        continue;
      }
      workingDays += 1;
    }
    // Conflicting assignments: any current assignment that overlaps the range AND has allocation > 0.
    const conflicts =
      data?.dashboard?.currentAssignments.filter((a) => {
        const aStart = new Date(a.startDate);
        const aEnd = a.endDate ? new Date(a.endDate) : new Date(8.64e15);
        return aStart <= e && aEnd >= s && (a.allocationPercent ?? 0) > 0;
      }) ?? [];
    // Balance after: find the matching type balance, subtract requested working days.
    const balance = data?.balances.find((b) => b.leaveType === type);
    const remainingAfter = balance ? balance.remaining - workingDays : null;
    return {
      workingDays,
      skippedHolidays,
      conflicts,
      remainingAfter,
      balance,
    };
  }, [startDate, endDate, type, data]);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setSubmitError('Pick start and end dates.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      await createLeaveRequest({ type, startDate, endDate, notes: notes || undefined });
      setSubmitSuccess('Leave request submitted.');
      setStartDate('');
      setEndDate('');
      setNotes('');
      loadAll();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState variant="skeleton" skeletonType="page" />;
  if (error) return <ErrorState title="Couldn't load leave data" description={error} />;
  if (!data) return <LoadingState variant="skeleton" skeletonType="page" />;

  const annualBalance = data.balances.find((b) => b.leaveType === 'ANNUAL');
  const totalEntitlement = annualBalance?.entitlement ?? 0;
  const totalUsed = annualBalance?.used ?? 0;
  const totalPending = annualBalance?.pending ?? 0;

  const breakdown = data.balances
    .filter((b) => b.leaveType !== 'ANNUAL' && b.entitlement > 0)
    .map((b) => ({
      label: LEAVE_TYPE_LABELS[b.leaveType as LeaveRequestType] ?? b.leaveType,
      used: b.used,
      entitlement: b.entitlement,
    }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionCard title="Your balance">
          {data.balances.length === 0 ? (
            <EmptyState
              title="No balance configured yet"
              description="Your HR team hasn't set a leave entitlement for this year. Once they do, your balance will show here."
            />
          ) : (
            <BalanceMeter
              entitlement={totalEntitlement}
              used={totalUsed}
              pending={totalPending}
              unit="d"
              breakdown={breakdown}
            />
          )}
        </SectionCard>

        <SectionCard title="Request leave">
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label className="field">
              <span className="field__label">Type</span>
              <select
                className="field__control"
                value={type}
                onChange={(ev) => setType(ev.target.value as LeaveRequestType)}
              >
                {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <label className="field">
                <span className="field__label">Start date</span>
                <input
                  className="field__control"
                  type="date"
                  value={startDate}
                  onChange={(ev) => setStartDate(ev.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field__label">End date</span>
                <input
                  className="field__control"
                  type="date"
                  value={endDate}
                  onChange={(ev) => setEndDate(ev.target.value)}
                  required
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Notes (optional)</span>
              <textarea
                className="field__control"
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </label>

            {preview && 'error' in preview && (
              <div
                role="alert"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--color-status-danger)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--color-status-danger)',
                  background: 'color-mix(in oklab, var(--color-status-danger) 8%, var(--color-surface))',
                  fontSize: 13,
                }}
              >
                {preview.error}
              </div>
            )}
            {preview && !('error' in preview) && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Working days</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{preview.workingDays} d</span>
                </div>
                {preview.skippedHolidays.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-status-info)' }}>
                    <span>Public holidays excluded</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{preview.skippedHolidays.length}</span>
                  </div>
                )}
                {preview.balance && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Balance after</span>
                    <span
                      style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        color: (preview.remainingAfter ?? 0) < 0 ? 'var(--color-status-danger)' : 'var(--color-text)',
                      }}
                    >
                      {preview.remainingAfter ?? '—'} d
                    </span>
                  </div>
                )}
                {preview.conflicts.length > 0 && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 'var(--space-1)',
                      paddingTop: 'var(--space-2)',
                      borderTop: '2px solid var(--color-accent)',
                      color: 'var(--color-accent-text, var(--color-accent))',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {preview.conflicts.length} conflicting assignment{preview.conflicts.length === 1 ? '' : 's'}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {preview.conflicts.slice(0, 4).map((c) => (
                        <li key={c.id} style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {c.project.displayName ?? 'Project'} · {c.staffingRole} · <Pct value={c.allocationPercent} fractionDigits={0} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {dsRefresh && serverPreview && serverPreview.conflictingTeamLeaveIds.length > 0 && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 'var(--space-1)',
                      paddingTop: 'var(--space-2)',
                      borderTop: '1px dashed var(--color-status-warning)',
                      color: 'var(--color-status-warning)',
                      fontSize: 12,
                    }}
                  >
                    {serverPreview.conflictingTeamLeaveIds.length} teammate
                    {serverPreview.conflictingTeamLeaveIds.length === 1 ? ' is' : 's are'} also out during this period.
                  </div>
                )}
              </div>
            )}

            {submitError && (
              <div role="alert" style={{ color: 'var(--color-status-danger)', fontSize: 13 }}>{submitError}</div>
            )}
            {submitSuccess && (
              <div role="status" style={{ color: 'var(--color-status-active)', fontSize: 13 }}>{submitSuccess}</div>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !startDate || !endDate || (preview != null && 'error' in preview)}
              loading={submitting}
              style={{ alignSelf: 'flex-start' }}
            >
              {submitting ? 'Submitting…' : 'Request leave'}
            </Button>
          </form>
        </SectionCard>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionCard title={`${year} at a glance`}>
          <Calendar mode="year" month={new Date(year, 0, 1)} events={calendarEvents} />
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap', fontSize: 11, color: 'var(--color-text-muted)' }}>
            <Legend swatch="color-mix(in oklab, var(--color-status-active) 25%, var(--color-surface))" label="Approved" />
            <Legend swatch="color-mix(in oklab, var(--color-status-warning) 28%, var(--color-surface))" label="Pending" />
            <Legend swatch="color-mix(in oklab, var(--color-status-info) 18%, var(--color-surface))" label="Public holiday" />
            <Legend swatch="var(--color-surface-alt)" label="Weekend" />
          </div>
        </SectionCard>

        {dsRefresh && (
          <PendingLeaveList
            requests={data.requests}
            onCancel={(req) => setCancelTarget(req)}
          />
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel leave request"
        message={
          cancelTarget
            ? `Cancel your ${LEAVE_TYPE_LABELS[cancelTarget.type] ?? cancelTarget.type} from ${cancelTarget.startDate} to ${cancelTarget.endDate}? The pending balance will be released.`
            : ''
        }
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel request'}
        tone="danger"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          void onCancelConfirm();
        }}
      />
    </div>
  );
}

interface PendingLeaveListProps {
  requests: LeaveRequestDto[];
  onCancel: (req: LeaveRequestDto) => void;
}

function PendingLeaveList({ requests, onCancel }: PendingLeaveListProps): JSX.Element {
  const pending = requests.filter((r) => r.status === 'PENDING');
  return (
    <SectionCard title={`Pending requests (${pending.length})`}>
      {pending.length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="When you submit a leave request, it will show here until your manager reviews it. You can cancel it any time before approval."
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {pending.map((req) => (
            <li
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-surface)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{LEAVE_TYPE_LABELS[req.type] ?? req.type}</strong>
                  <StatusBadge tone="warning" variant="chip" label="Pending" />
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {req.startDate} → {req.endDate}
                </span>
                {req.notes && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{req.notes}</span>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => onCancel(req)}
                aria-label={`Cancel leave from ${req.startDate} to ${req.endDate}`}
              >
                Cancel
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        aria-hidden="true"
        style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: swatch, border: '1px solid var(--color-border)' }}
      />
      {label}
    </span>
  );
}
