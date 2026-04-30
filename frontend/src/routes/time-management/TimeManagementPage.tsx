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
import { Button, Table, type Column } from '@/components/ds';

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
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="primary" size="sm" style={{ background: 'var(--color-status-danger)', color: '#fff', border: 'none' }} disabled={!selectedReason || (selectedReason === 'OTHER' && !customNote.trim())} onClick={() => { onConfirm(finalReason); setSelectedReason(''); setCustomNote(''); }}>
            Reject
          </Button>
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
        <Button size="sm" variant="secondary" onClick={() => { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }}>{'\u25C2'} Prev</Button>
        <span style={{ fontWeight: 600, fontSize: 14, minWidth: 100, textAlign: 'center' }}>{MONTH_NAMES[month - 1]} {year}</span>
        <Button size="sm" variant="secondary" onClick={() => { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }}>Next {'\u25B8'}</Button>
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
              <Button key={t} type="button" size="sm" variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
                {{ queue: `Approval Queue (${pendingCount})`, calendar: 'Team Calendar', compliance: 'Compliance', overtime: 'Overtime' }[t]}
              </Button>
            ))}
          </div>

          {/* APPROVAL QUEUE */}
          {tab === 'queue' && (
            <SectionCard title="Approval Queue">
              {queue.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                  <Button type="button" variant="primary" size="sm" disabled={selected.size === 0} onClick={handleBulkApprove}>Approve Selected ({selected.size})</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { const pending = queue.filter((q) => q.status === 'SUBMITTED' || q.status === 'PENDING'); setSelected(new Set(pending.map((q) => q.id))); }}>Select All Pending</Button>
                </div>
              )}
              {queue.length > 0 ? (
                <Table
                  variant="compact"
                  columns={[
                    { key: 'select', title: '', width: 30, render: (item) => {
                      const isPending = item.status === 'SUBMITTED' || item.status === 'PENDING';
                      return <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} disabled={!isPending} />;
                    } },
                    { key: 'type', title: 'Type', render: (item) => <StatusBadge label={item.type === 'timesheet' ? 'Time' : item.leaveType ?? 'Leave'} size="small" tone={item.type === 'timesheet' ? 'info' : 'neutral'} /> },
                    { key: 'person', title: 'Person', getValue: (item) => item.personName, render: (item) => <span style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => nav(`/people/${item.personId}`)}>{item.personName}</span> },
                    { key: 'period', title: 'Period', render: (item) => item.type === 'timesheet' ? `Week of ${item.weekStart}` : `${item.leaveStartDate} – ${item.leaveEndDate}` },
                    { key: 'hours', title: 'Hours/Days', align: 'right', render: (item) => <span style={NUM}>{item.type === 'timesheet' ? `${item.totalHours}h` : `${item.leaveDays}d`}{item.overtimeHours && item.overtimeHours > 0 ? <span style={{ color: 'var(--color-status-warning)', fontSize: 10 }}> +{item.overtimeHours}h OT</span> : null}</span> },
                    { key: 'status', title: 'Status', render: (item) => <StatusBadge label={item.status} size="small" tone={item.status === 'APPROVED' ? 'active' : item.status === 'SUBMITTED' || item.status === 'PENDING' ? 'warning' : 'danger'} /> },
                    { key: 'actions', title: 'Actions', width: 130, render: (item) => {
                      const isPending = item.status === 'SUBMITTED' || item.status === 'PENDING';
                      if (!isPending) return null;
                      return (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button type="button" variant="primary" size="sm" onClick={() => handleApprove(item)} style={{ fontSize: 10 }}>Approve</Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => handleReject(item)} style={{ fontSize: 10 }}>Reject</Button>
                        </div>
                      );
                    } },
                  ] as Column<typeof queue[number]>[]}
                  rows={queue}
                  getRowKey={(item) => item.id}
                />
              ) : (
                <EmptyState title="Queue empty" description="No pending approvals for this month." />
              )}
            </SectionCard>
          )}

          {/* TEAM CALENDAR */}
          {tab === 'calendar' && (
            <SectionCard title="Team Absence Calendar">
              {calendar.length > 0 ? (
                <Table
                  variant="compact"
                  columns={[
                    {
                      key: 'person',
                      title: 'Person',
                      cellStyle: { position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, fontWeight: 500, minWidth: 120 },
                      getValue: (p) => p.displayName,
                      render: (p) => p.displayName,
                    },
                    ...Array.from({ length: daysInMonth }, (_, i) => {
                      const d = new Date(Date.UTC(year, month - 1, i + 1));
                      const dow = d.getUTCDay();
                      const dateStr = d.toISOString().slice(0, 10);
                      return {
                        key: `d-${i}`,
                        title: <span style={{ fontSize: 9 }}>{i + 1}</span>,
                        align: 'center' as const,
                        cellStyle: { width: 24, padding: 1 },
                        render: (p: TeamCalendarPerson) => {
                          const dayMap = new Map(p.days.map((dd) => [dd.date, dd.type]));
                          const leaveType = dayMap.get(dateStr);
                          const bg = leaveType
                            ? (leaveType === 'SICK' ? 'color-mix(in srgb, var(--color-status-danger) 20%, transparent)' : leaveType === 'ANNUAL' ? 'color-mix(in srgb, var(--color-chart-1) 20%, transparent)' : 'color-mix(in srgb, var(--color-chart-5) 20%, transparent)')
                            : dow === 0 || dow === 6 ? 'var(--color-border)' : undefined;
                          return (
                            <span style={{ display: 'inline-block', fontSize: 9, background: bg, padding: 1, minWidth: 22 }} title={leaveType ?? ''}>
                              {leaveType ? LEAVE_ICONS[leaveType] ?? 'L' : ''}
                            </span>
                          );
                        },
                      };
                    }),
                  ] as Column<TeamCalendarPerson>[]}
                  rows={calendar}
                  getRowKey={(p) => p.personId}
                />
              ) : (
                <EmptyState title="No leave" description="No team members have approved leave this month." />
              )}
            </SectionCard>
          )}

          {/* COMPLIANCE */}
          {tab === 'compliance' && (
            <SectionCard title="Time Compliance">
              {compliance.length > 0 ? (
                <Table
                  variant="compact"
                  columns={[
                    { key: 'person', title: 'Person', getValue: (c) => c.displayName, render: (c) => <span style={{ fontWeight: 500 }}>{c.displayName}</span> },
                    { key: 'reported', title: 'Reported', align: 'right', getValue: (c) => c.reportedHours, render: (c) => <span style={NUM}>{c.reportedHours}h</span> },
                    { key: 'expected', title: 'Expected', align: 'right', getValue: (c) => c.expectedHours, render: (c) => <span style={NUM}>{c.expectedHours}h</span> },
                    { key: 'gaps', title: 'Gaps', align: 'right', getValue: (c) => c.gapDays, render: (c) => <span style={{ ...NUM, color: c.gapDays > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)', fontWeight: c.gapDays > 0 ? 600 : 400 }}>{c.gapDays}d</span> },
                    { key: 'ot', title: 'OT', align: 'right', getValue: (c) => c.overtimeHours, render: (c) => <span style={{ ...NUM, color: c.overtimeHours > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{c.overtimeHours}h</span> },
                    { key: 'leave', title: 'Leave', align: 'right', getValue: (c) => c.leaveDays, render: (c) => <span style={NUM}>{c.leaveDays}d</span> },
                    { key: 'submitted', title: 'Submitted', align: 'right', render: (c) => <span style={NUM}>{c.submittedWeeks}/{c.totalWeeks}</span> },
                    { key: 'approved', title: 'Approved', align: 'right', render: (c) => <span style={NUM}>{c.approvedWeeks}/{c.totalWeeks}</span> },
                    { key: 'status', title: 'Status', render: (c) => <StatusBadge label={c.status === 'compliant' ? 'Compliant' : c.status === 'partial' ? 'Partial' : 'Non-Compliant'} size="small" tone={c.status === 'compliant' ? 'active' : c.status === 'partial' ? 'warning' : 'danger'} /> },
                  ] as Column<typeof compliance[number]>[]}
                  rows={compliance}
                  getRowKey={(c) => c.personId}
                  onRowClick={(c) => nav(`/my-time?person=${c.personId}`)}
                />
              ) : (
                <EmptyState title="No data" description="No timesheet data for this month." />
              )}
            </SectionCard>
          )}

          {/* OVERTIME */}
          {tab === 'overtime' && otData && (
            <SectionCard title={`Overtime — ${otData.totalOvertimeHours}h across ${otData.peopleWithOvertime} people`}>
              {otData.personSummaries.filter((p) => p.overtimeHours > 0).length > 0 ? (
                <Table
                  variant="compact"
                  columns={[
                    { key: 'person', title: 'Person', getValue: (p) => p.displayName, render: (p) => <span style={{ fontWeight: 500 }}>{p.displayName}</span> },
                    { key: 'total', title: 'Total', align: 'right', getValue: (p) => p.totalHours, render: (p) => <span style={NUM}>{p.totalHours}h</span> },
                    { key: 'std', title: 'Standard', align: 'right', getValue: (p) => p.standardHours, render: (p) => <span style={NUM}>{p.standardHours}h</span> },
                    { key: 'ot', title: 'Overtime', align: 'right', getValue: (p) => p.overtimeHours, render: (p) => <span style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-warning)' }}>{p.overtimeHours}h</span> },
                    { key: 'cap', title: 'Cap', align: 'right', getValue: (p) => p.effectiveThreshold, render: (p) => <span style={NUM}>{p.effectiveThreshold}h/wk</span> },
                    { key: 'status', title: 'Status', render: (p) => <StatusBadge label={p.exceedsThreshold ? 'Over Cap' : 'Within Cap'} size="small" tone={p.exceedsThreshold ? 'danger' : 'active'} /> },
                  ] as Column<typeof otData.personSummaries[number]>[]}
                  rows={otData.personSummaries.filter((p) => p.overtimeHours > 0)}
                  getRowKey={(p) => p.personId}
                  onRowClick={(p) => nav(`/people/${p.personId}`)}
                />
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
