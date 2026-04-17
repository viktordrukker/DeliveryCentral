import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipTrigger } from '@/components/common/TipBalloon';
import { approveTimesheet, rejectTimesheet } from '@/lib/api/timesheets';
import { approveLeaveRequest, rejectLeaveRequest } from '@/lib/api/leaveRequests';
import { httpGet } from '@/lib/api/http-client';
import {
  fetchApprovalQueue,
  fetchTeamCalendar,
  fetchCompliance,
  type ApprovalQueueItem,
  type TeamCalendarPerson,
  type ComplianceRow,
} from '@/lib/api/time-management';
import { useOvertimeSummary } from '@/features/dashboard/useOvertimeSummary';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LEAVE_ICONS: Record<string, string> = { ANNUAL: 'V', SICK: 'S', OT_OFF: 'O', PERSONAL: 'P', PARENTAL: 'M', BEREAVEMENT: 'B', STUDY: 'T' };

type Tab = 'queue' | 'calendar' | 'compliance' | 'overtime';

interface RejectionReason { key: string; label: string }

function monthStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/* ── Rejection Modal ── */
function RejectModal({ open, item, reasons, onConfirm, onCancel }: {
  open: boolean;
  item: ApprovalQueueItem | null;
  reasons: RejectionReason[];
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}): JSX.Element | null {
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');

  if (!open || !item) return null;

  const reasonLabel = reasons.find((r) => r.key === selectedReason)?.label ?? '';
  const finalReason = selectedReason === 'OTHER'
    ? `Other: ${customNote}`
    : customNote
      ? `${reasonLabel} — ${customNote}`
      : reasonLabel;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '24px 28px', minWidth: 420, maxWidth: 520, boxShadow: 'var(--shadow-modal)', border: '1px solid var(--color-border)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Reject Timesheet</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          {item.personName} — {item.type === 'timesheet' ? `Week of ${item.weekStart}` : `${item.leaveType} ${item.leaveStartDate}`}
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason Category</span>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="field__control"
            style={{ width: '100%' }}
          >
            <option value="">Select a reason...</option>
            {reasons.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            {selectedReason === 'OTHER' ? 'Please specify' : 'Additional notes (optional)'}
          </span>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder={selectedReason === 'OTHER' ? 'Describe the issue...' : 'Add context for the employee...'}
            rows={3}
            className="field__control"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="button button--secondary button--sm" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="button button--sm"
            style={{ background: 'var(--color-status-danger)', color: '#fff', border: 'none' }}
            disabled={!selectedReason || (selectedReason === 'OTHER' && !customNote.trim())}
            onClick={() => { onConfirm(finalReason); setSelectedReason(''); setCustomNote(''); }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export function TimeManagementPage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const nav = useNavigate();
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState(() => new Date().getUTCMonth() + 1);
  const [tab, setTab] = useState<Tab>('queue');

  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [calendar, setCalendar] = useState<TeamCalendarPerson[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<ApprovalQueueItem | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([]);

  const ms = monthStr(year, month);
  const { data: otData } = useOvertimeSummary({ weeks: 4 });

  // Fetch rejection reasons from metadata dictionary
  useEffect(() => {
    void httpGet<{ entries?: Array<{ entryKey: string; displayName: string; isEnabled: boolean }> }>('/metadata/dictionaries/42222222-0000-0000-0000-000000000201')
      .then((d) => {
        const entries = (d.entries ?? []).filter((e) => e.isEnabled).map((e) => ({ key: e.entryKey, label: e.displayName }));
        if (entries.length > 0) setRejectionReasons(entries);
        else setRejectionReasons([{ key: 'INCORRECT_HOURS', label: 'Incorrect Hours' }, { key: 'WRONG_PROJECT', label: 'Wrong Project' }, { key: 'OTHER', label: 'Other' }]);
      })
      .catch(() => {
        setRejectionReasons([{ key: 'INCORRECT_HOURS', label: 'Incorrect Hours' }, { key: 'WRONG_PROJECT', label: 'Wrong Project' }, { key: 'OTHER', label: 'Other' }]);
      });
  }, []);

  // Fetch data
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchApprovalQueue(ms),
      fetchTeamCalendar(ms),
      fetchCompliance(ms),
    ])
      .then(([q, c, comp]) => {
        if (!active) return;
        setQueue(q);
        setCalendar(c);
        setCompliance(comp);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (active) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); }
      });
    return () => { active = false; };
  }, [ms, tick]);

  // Title bar
  useEffect(() => {
    setActions(
      <>
        <button type="button" className="button button--secondary button--sm" onClick={() => { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }}>{'\u25C2'} Prev</button>
        <span style={{ fontWeight: 600, fontSize: 14, minWidth: 100, textAlign: 'center' }}>{MONTH_NAMES[month - 1]} {year}</span>
        <button type="button" className="button button--secondary button--sm" onClick={() => { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }}>Next {'\u25B8'}</button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, year, month]);

  // KPIs
  const pendingCount = queue.filter((q) => q.status === 'SUBMITTED' || q.status === 'PENDING').length;
  const approvedCount = queue.filter((q) => q.status === 'APPROVED').length;
  const gapDays = compliance.reduce((s, c) => s + c.gapDays, 0);
  const totalOT = compliance.reduce((s, c) => s + c.overtimeHours, 0);
  const leaveCount = queue.filter((q) => q.type === 'leave').length;
  const complianceRate = compliance.length > 0 ? Math.round((compliance.filter((c) => c.status === 'compliant').length / compliance.length) * 100) : 0;

  async function handleApprove(item: ApprovalQueueItem): Promise<void> {
    try {
      if (item.type === 'timesheet') await approveTimesheet(item.id);
      else await approveLeaveRequest(item.id);
      toast.success(`Approved ${item.personName}'s ${item.type}`);
      setTick((t) => t + 1);
    } catch { toast.error('Approval failed'); }
  }

  function handleReject(item: ApprovalQueueItem): void {
    setRejectTarget(item);
  }

  async function confirmReject(reason: string): Promise<void> {
    if (!rejectTarget) return;
    try {
      if (rejectTarget.type === 'timesheet') await rejectTimesheet(rejectTarget.id, reason);
      else await rejectLeaveRequest(rejectTarget.id);
      toast.success(`Rejected ${rejectTarget.personName}'s ${rejectTarget.type}`);
      setRejectTarget(null);
      setTick((t) => t + 1);
    } catch { toast.error('Rejection failed'); }
  }

  async function handleBulkApprove(): Promise<void> {
    const items = queue.filter((q) => selected.has(q.id) && (q.status === 'SUBMITTED' || q.status === 'PENDING'));
    let count = 0;
    for (const item of items) {
      try {
        if (item.type === 'timesheet') await approveTimesheet(item.id);
        else await approveLeaveRequest(item.id);
        count++;
      } catch { /* continue */ }
    }
    toast.success(`Approved ${count} of ${items.length} items`);
    setSelected(new Set());
    setTick((t) => t + 1);
  }

  function toggleSelect(id: string): void {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  // Calendar grid
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return (
    <PageContainer testId="time-management-page">
      {loading ? <LoadingState label="Loading time management..." variant="skeleton" skeletonType="page" /> : null}
      {error ? <ErrorState description={error} /> : null}

      {!loading && !error ? (
        <>
          {/* KPI Strip */}
          <div className="kpi-strip" aria-label="Time management summary">
            <a className="kpi-strip__item" href="#" onClick={(e) => { e.preventDefault(); setTab('queue'); }} style={{ borderLeft: `3px solid ${pendingCount > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{pendingCount}</span>
              <span className="kpi-strip__label">Pending</span>
            </a>
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <span className="kpi-strip__value">{approvedCount}</span>
              <span className="kpi-strip__label">Approved</span>
            </div>
            <a className="kpi-strip__item" href="#" onClick={(e) => { e.preventDefault(); setTab('compliance'); }} style={{ borderLeft: `3px solid ${gapDays > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{gapDays}</span>
              <span className="kpi-strip__label">Gap Days</span>
            </a>
            <a className="kpi-strip__item" href="#" onClick={(e) => { e.preventDefault(); setTab('overtime'); }} style={{ borderLeft: `3px solid ${totalOT > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{Math.round(totalOT)}h</span>
              <span className="kpi-strip__label">Overtime</span>
            </a>
            <a className="kpi-strip__item" href="#" onClick={(e) => { e.preventDefault(); setTab('calendar'); }} style={{ borderLeft: `3px solid var(--color-chart-1)` }}>
              <span className="kpi-strip__value">{leaveCount}</span>
              <span className="kpi-strip__label">Leave Requests</span>
            </a>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${complianceRate >= 80 ? 'var(--color-status-active)' : 'var(--color-status-danger)'}` }}>
              <span className="kpi-strip__value">{complianceRate}%</span>
              <span className="kpi-strip__label">Compliance</span>
            </div>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
            {(['queue', 'calendar', 'compliance', 'overtime'] as Tab[]).map((t) => (
              <button key={t} type="button" className={`button button--sm ${tab === t ? 'button--primary' : 'button--secondary'}`} onClick={() => setTab(t)}>
                {{ queue: `Approval Queue (${pendingCount})`, calendar: 'Team Calendar', compliance: 'Compliance', overtime: 'Overtime' }[t]}
              </button>
            ))}
          </div>

          {/* APPROVAL QUEUE */}
          {tab === 'queue' && (
            <SectionCard title="Approval Queue">
              {queue.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                  <button type="button" className="button button--primary button--sm" disabled={selected.size === 0} onClick={handleBulkApprove}>Approve Selected ({selected.size})</button>
                  <button type="button" className="button button--secondary button--sm" onClick={() => { const pending = queue.filter((q) => q.status === 'SUBMITTED' || q.status === 'PENDING'); setSelected(new Set(pending.map((q) => q.id))); }}>Select All Pending</button>
                </div>
              )}
              {queue.length > 0 ? (
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th>Type</th>
                      <th>Person</th>
                      <th>Period</th>
                      <th style={NUM}>Hours/Days</th>
                      <th>Status</th>
                      <th style={{ width: 130 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((item) => {
                      const isPending = item.status === 'SUBMITTED' || item.status === 'PENDING';
                      return (
                        <tr key={item.id}>
                          <td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} disabled={!isPending} /></td>
                          <td><StatusBadge label={item.type === 'timesheet' ? 'Time' : item.leaveType ?? 'Leave'} size="small" tone={item.type === 'timesheet' ? 'info' : 'neutral'} /></td>
                          <td style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => nav(`/people/${item.personId}`)}>{item.personName}</td>
                          <td>{item.type === 'timesheet' ? `Week of ${item.weekStart}` : `${item.leaveStartDate} – ${item.leaveEndDate}`}</td>
                          <td style={NUM}>{item.type === 'timesheet' ? `${item.totalHours}h` : `${item.leaveDays}d`}{item.overtimeHours && item.overtimeHours > 0 ? <span style={{ color: 'var(--color-status-warning)', fontSize: 10 }}> +{item.overtimeHours}h OT</span> : null}</td>
                          <td><StatusBadge label={item.status} size="small" tone={item.status === 'APPROVED' ? 'active' : item.status === 'SUBMITTED' || item.status === 'PENDING' ? 'warning' : 'danger'} /></td>
                          <td>
                            {isPending && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button type="button" className="button button--sm button--primary" onClick={() => handleApprove(item)} style={{ fontSize: 10 }}>Approve</button>
                                <button type="button" className="button button--sm button--secondary" onClick={() => handleReject(item)} style={{ fontSize: 10 }}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Queue empty" description="No pending approvals for this month." />
              )}
            </SectionCard>
          )}

          {/* TEAM CALENDAR */}
          {tab === 'calendar' && (
            <SectionCard title="Team Absence Calendar">
              {calendar.length > 0 ? (
                <div style={{ overflow: 'auto' }}>
                  <table className="dash-compact-table" style={{ minWidth: daysInMonth * 26 + 140, fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 120, position: 'sticky', left: 0, background: 'var(--color-surface-alt)', zIndex: 2 }}>Person</th>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = new Date(Date.UTC(year, month - 1, i + 1));
                          const dow = d.getUTCDay();
                          return <th key={i} style={{ width: 24, textAlign: 'center', fontSize: 9, padding: '2px 0', background: dow === 0 || dow === 6 ? 'var(--color-border)' : 'var(--color-surface-alt)' }}>{i + 1}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {calendar.map((person) => {
                        const dayMap = new Map(person.days.map((d) => [d.date, d.type]));
                        return (
                          <tr key={person.personId}>
                            <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, fontWeight: 500 }}>{person.displayName}</td>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const dateStr = new Date(Date.UTC(year, month - 1, i + 1)).toISOString().slice(0, 10);
                              const dow = new Date(Date.UTC(year, month - 1, i + 1)).getUTCDay();
                              const leaveType = dayMap.get(dateStr);
                              const bg = leaveType ? (leaveType === 'SICK' ? 'color-mix(in srgb, var(--color-status-danger) 20%, transparent)' : leaveType === 'ANNUAL' ? 'color-mix(in srgb, var(--color-chart-1) 20%, transparent)' : 'color-mix(in srgb, var(--color-chart-5) 20%, transparent)') : dow === 0 || dow === 6 ? 'var(--color-border)' : undefined;
                              return <td key={i} style={{ textAlign: 'center', fontSize: 9, background: bg, padding: 1 }} title={leaveType ?? ''}>{leaveType ? LEAVE_ICONS[leaveType] ?? 'L' : ''}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No leave" description="No team members have approved leave this month." />
              )}
            </SectionCard>
          )}

          {/* COMPLIANCE */}
          {tab === 'compliance' && (
            <SectionCard title="Time Compliance">
              {compliance.length > 0 ? (
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th style={NUM}>Reported</th>
                      <th style={NUM}>Expected</th>
                      <th style={NUM}>Gaps</th>
                      <th style={NUM}>OT</th>
                      <th style={NUM}>Leave</th>
                      <th style={NUM}>Submitted</th>
                      <th style={NUM}>Approved</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance.map((c) => (
                      <tr key={c.personId} style={{ cursor: 'pointer' }} onClick={() => nav(`/my-time?person=${c.personId}`)}>
                        <td style={{ fontWeight: 500 }}>{c.displayName}</td>
                        <td style={NUM}>{c.reportedHours}h</td>
                        <td style={NUM}>{c.expectedHours}h</td>
                        <td style={{ ...NUM, color: c.gapDays > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)', fontWeight: c.gapDays > 0 ? 600 : 400 }}>{c.gapDays}d</td>
                        <td style={{ ...NUM, color: c.overtimeHours > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{c.overtimeHours}h</td>
                        <td style={NUM}>{c.leaveDays}d</td>
                        <td style={NUM}>{c.submittedWeeks}/{c.totalWeeks}</td>
                        <td style={NUM}>{c.approvedWeeks}/{c.totalWeeks}</td>
                        <td><StatusBadge label={c.status === 'compliant' ? 'Compliant' : c.status === 'partial' ? 'Partial' : 'Non-Compliant'} size="small" tone={c.status === 'compliant' ? 'active' : c.status === 'partial' ? 'warning' : 'danger'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No data" description="No timesheet data for this month." />
              )}
            </SectionCard>
          )}

          {/* OVERTIME */}
          {tab === 'overtime' && otData && (
            <SectionCard title={`Overtime — ${otData.totalOvertimeHours}h across ${otData.peopleWithOvertime} people`}>
              {otData.personSummaries.filter((p) => p.overtimeHours > 0).length > 0 ? (
                <table className="dash-compact-table">
                  <thead>
                    <tr><th>Person</th><th style={NUM}>Total</th><th style={NUM}>Standard</th><th style={NUM}>Overtime</th><th style={NUM}>Cap</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {otData.personSummaries.filter((p) => p.overtimeHours > 0).map((p) => (
                      <tr key={p.personId} style={{ cursor: 'pointer' }} onClick={() => nav(`/people/${p.personId}`)}>
                        <td style={{ fontWeight: 500 }}>{p.displayName}</td>
                        <td style={NUM}>{p.totalHours}h</td>
                        <td style={NUM}>{p.standardHours}h</td>
                        <td style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-warning)' }}>{p.overtimeHours}h</td>
                        <td style={NUM}>{p.effectiveThreshold}h/wk</td>
                        <td><StatusBadge label={p.exceedsThreshold ? 'Over Cap' : 'Within Cap'} size="small" tone={p.exceedsThreshold ? 'danger' : 'active'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No overtime" description="No overtime recorded in the current period." />
              )}
            </SectionCard>
          )}

          {tab === 'overtime' && !otData && <LoadingState label="Loading overtime..." />}
        </>
      ) : null}

      <RejectModal
        open={rejectTarget !== null}
        item={rejectTarget}
        reasons={rejectionReasons}
        onConfirm={confirmReject}
        onCancel={() => setRejectTarget(null)}
      />
    </PageContainer>
  );
}
