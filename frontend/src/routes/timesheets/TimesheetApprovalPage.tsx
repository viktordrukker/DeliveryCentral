import { useEffect, useState } from 'react';

import { useTitleBarActions } from '@/app/title-bar-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipTrigger } from '@/components/common/TipBalloon';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { useFilterParams } from '@/hooks/useFilterParams';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import {
  TimesheetWeek,
  approveTimesheet,
  fetchApprovalQueue,
  rejectTimesheet,
} from '@/lib/api/timesheets';
import { Button, DatePicker, Table, type Column } from '@/components/ds';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays(weekStart: string): string[] {
  const days: string[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setUTCDate(d.getUTCDate() + i);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function totalHours(week: TimesheetWeek): number {
  return week.entries.reduce((sum, e) => sum + e.hours, 0);
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'badge--approved';
    case 'SUBMITTED':
      return 'badge--submitted';
    case 'REJECTED':
      return 'badge--rejected';
    default:
      return 'badge--draft';
  }
}

export function TimesheetApprovalPage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const [weeks, setWeeks] = useState<TimesheetWeek[]>([]);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useFilterParams({ from: '', person: '', status: 'SUBMITTED', to: '' });

  useEffect(() => {
    setActions(<TipTrigger />);
    return () => setActions(null);
  }, [setActions]);

  // Selected for bulk approve
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  // Action error
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    fetchApprovalQueue({
      status: filters.status || undefined,
      personId: filters.person || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
      .then((data) => {
        if (active) {
          setWeeks(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load approval queue.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters.status, filters.person, filters.from, filters.to]);

  useEffect(() => {
    void fetchPersonDirectory({ page: 1, pageSize: 200 })
      .then((dir) => {
        const map: Record<string, string> = {};
        for (const p of dir.items) { map[p.id] = p.displayName; }
        setPersonNames(map);
      })
      .catch(() => { /* non-critical, personId shown as fallback */ });
  }, []);

  function toggleSelect(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll(): void {
    if (selected.size === weeks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(weeks.map((w) => w.id)));
    }
  }

  async function handleApprove(id: string): Promise<void> {
    setActionError(null);
    try {
      const updated = await approveTimesheet(id);
      setWeeks((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve.');
    }
  }

  async function handleBulkApprove(): Promise<void> {
    setActionError(null);
    const ids = Array.from(selected);
    try {
      const results = await Promise.all(ids.map((id) => approveTimesheet(id)));
      const resultMap = new Map(results.map((r) => [r.id, r]));
      setWeeks((prev) => prev.map((w) => resultMap.get(w.id) ?? w));
      setSelected(new Set());
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Bulk approve failed.');
    }
  }

  async function handleReject(id: string, reason: string): Promise<void> {
    setActionError(null);
    try {
      const updated = await rejectTimesheet(id, reason);
      setWeeks((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject.');
    }
    setRejectTarget(null);
  }

  // Progress stats
  const submittedCount = weeks.filter((w) => w.status === 'SUBMITTED').length;
  const approvedCount = weeks.filter((w) => w.status === 'APPROVED').length;
  const totalCount = weeks.length;
  const progressPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  if (isLoading) return <LoadingState label="Loading approval queue..." variant="skeleton" skeletonType="table" />;
  if (loadError) return <ErrorState description={loadError} />;

  return (
    <PageContainer testId="timesheet-approval-page" viewport>
      {/* Filter Bar */}
      <div className="filter-bar">
        <label className="field">
          <span className="field__label">Status</span>
          <select
            className="field__control"
            onChange={(e) => setFilters({ status: e.target.value })}
            value={filters.status}
          >
            <option value="">All</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Person ID</span>
          <input
            className="field__control"
            onChange={(e) => setFilters({ person: e.target.value })}
            placeholder="Filter by person"
            type="text"
            value={filters.person}
          />
        </label>
        <label className="field">
          <span className="field__label">From</span>
          <DatePicker onValueChange={(value) => setFilters({ from: value })} value={filters.from}
 />
        </label>
        <label className="field">
          <span className="field__label">To</span>
          <DatePicker onValueChange={(value) => setFilters({ to: value })} value={filters.to}
 />
        </label>
      </div>

      {/* Approval Progress */}
      <SectionCard title="Approval Progress">
        <div className="approval-progress">
          <span>
            {approvedCount} / {totalCount} approved ({submittedCount} pending)
          </span>
          <progress
            aria-label="Approval progress"
            max={100}
            value={progressPct}
          />
          <span>{progressPct}%</span>
        </div>
      </SectionCard>

      {/* Action Error */}
      {actionError && (
        <div className="alert alert--error" role="alert">
          {actionError}
        </div>
      )}

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bulk-actions">
          <span>{selected.size} selected</span>
          <Button variant="primary" onClick={() => void handleBulkApprove()} type="button">
            Approve Selected
          </Button>
        </div>
      )}

      {/* Timesheet List */}
      <ViewportTable>
      {weeks.length === 0 ? (
        <div className="empty-state">No timesheets match the current filters.</div>
      ) : (
        <div>
          <Table
            variant="compact"
            columns={[
              { key: 'select', title: (
                <input
                  aria-label="Select all"
                  checked={selected.size === weeks.length && weeks.length > 0}
                  onChange={toggleSelectAll}
                  type="checkbox"
                />
              ), render: (week) => (
                <input
                  aria-label={`Select ${week.id}`}
                  checked={selected.has(week.id)}
                  onChange={() => toggleSelect(week.id)}
                  type="checkbox"
                  onClick={(e) => e.stopPropagation()}
                />
              ) },
              { key: 'person', title: 'Person', getValue: (w) => personNames[w.personId] ?? w.personId, render: (w) => personNames[w.personId] ?? w.personId },
              { key: 'weekStart', title: 'Week Start', getValue: (w) => w.weekStart, render: (w) => w.weekStart },
              { key: 'status', title: 'Status', getValue: (w) => w.status, render: (w) => (
                <span className={`badge ${getStatusBadgeClass(w.status)}`}>{w.status}</span>
              ) },
              { key: 'hours', title: 'Total Hours', getValue: (w) => totalHours(w), render: (w) => `${totalHours(w).toFixed(1)}h` },
              { key: 'actions', title: 'Actions', render: (w) => (
                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <Button variant="secondary" size="sm" onClick={() => setExpandedId(expandedId === w.id ? null : w.id)} type="button">
                    {expandedId === w.id ? 'Collapse' : 'View'}
                  </Button>
                  {w.status === 'SUBMITTED' && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => void handleApprove(w.id)} type="button">
                        Approve
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setRejectTarget(w.id)} type="button">
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              ) },
            ] as Column<TimesheetWeek>[]}
            rows={weeks}
            getRowKey={(w) => w.id}
            rowClassName={(w) => `approval-row approval-row-${w.id}`}
          />
          {/* Inline-expand panels for each row that is expanded or auto-expanded (SUBMITTED) */}
          {weeks.filter((w) => expandedId === w.id || w.status === 'SUBMITTED').map((week) => (
            <div
              key={`${week.id}-detail`}
              style={{
                marginTop: 'var(--space-1)',
                padding: 'var(--space-2)',
                background: 'var(--color-surface-alt)',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
              }}
              data-testid={`approval-detail-${week.id}`}
            >
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                Detail — {personNames[week.personId] ?? week.personId} · week of {week.weekStart}
              </div>
              <TimesheetReadOnlyGrid week={week} />
            </div>
          ))}
        </div>
      )}
      </ViewportTable>

      {/* Reject Dialog */}
      <ConfirmDialog
        confirmLabel="Reject"
        message="Please provide a reason for rejection."
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) =>
          rejectTarget && reason
            ? void handleReject(rejectTarget, reason)
            : undefined
        }
        open={rejectTarget !== null}
        requireReason
        title="Reject Timesheet"
      />
    </PageContainer>
  );
}

// ─── Read-Only Grid ───────────────────────────────────────────────────────────

function TimesheetReadOnlyGrid({ week }: { week: TimesheetWeek }): JSX.Element {
  const weekDays = getWeekDays(week.weekStart);
  const projectIds = Array.from(new Set(week.entries.map((e) => e.projectId)));

  function getHours(projectId: string, date: string): number {
    return week.entries.find((e) => e.projectId === projectId && e.date === date)?.hours ?? 0;
  }

  return (
    <div className="timesheet-readonly-grid">
      <Table
        variant="compact"
        columns={[
          { key: 'project', title: 'Project', getValue: (id) => id, render: (id) => id },
          ...weekDays.map((date, i) => ({
            key: `d-${date}`,
            title: <span>{DAY_LABELS[i]}<br /><small>{date.slice(5)}</small></span>,
            align: 'center' as const,
            getValue: (id: string) => getHours(id, date),
            render: (id: string) => getHours(id, date) || '',
          })),
          {
            key: 'total',
            title: 'Total',
            align: 'right',
            getValue: (id) => weekDays.reduce((s, d) => s + getHours(id, d), 0),
            render: (id) => <strong>{weekDays.reduce((s, d) => s + getHours(id, d), 0).toFixed(1)}</strong>,
          },
        ] as Column<string>[]}
        rows={projectIds}
        getRowKey={(id) => id}
      />
    </div>
  );
}
