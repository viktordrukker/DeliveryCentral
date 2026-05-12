import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import {
  type PendingActionItem,
  type PendingActionsResponse,
  fetchPendingActions,
} from '@/lib/api/dashboard-pending-actions';

interface PendingApprovalsCardProps {
  /**
   * Optional override; defaults to the authenticated principal on the BE.
   * Admin/Director scopes a specific person via dashboard view-as.
   */
  personId?: string;
}

function severityTone(severity: PendingActionItem['severity']): 'active' | 'warning' | 'danger' {
  if (severity === 'HIGH') return 'danger';
  if (severity === 'MEDIUM') return 'warning';
  return 'active';
}

function severityBorder(severity: PendingActionItem['severity']): string {
  if (severity === 'HIGH') return 'var(--color-status-danger)';
  if (severity === 'MEDIUM') return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

function kindLabel(kind: PendingActionItem['kind']): string {
  switch (kind) {
    case 'STAFFING_REQUEST': return 'Staffing';
    case 'BUDGET_CHANGE': return 'Budget';
    case 'LEAVE_REQUEST': return 'Leave';
    case 'TIMESHEET': return 'Timesheet';
  }
}

function formatAge(hours: number): string {
  if (hours < 1) return '< 1 h';
  if (hours < 24) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

/**
 * F-3.2 / WO-4.14/5.5 — "Pending Approvals" KPI tile + action queue
 * for the Manager Dashboard. One component embedded on PM, RM, and DM
 * dashboards. Renders a KPI strip tile with count + tone color, plus
 * a compact action table listing up to 10 pending items across staffing
 * requests, budget changes, leave, and timesheets.
 *
 * Empty state shows a forward CTA to keep Law-2 compliant.
 */
export function PendingApprovalsCard({ personId }: PendingApprovalsCardProps): JSX.Element {
  const [data, setData] = useState<PendingActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPendingActions(personId)
      .then((res) => { if (active) setData(res); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Failed to load pending approvals.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personId]);

  const total = data?.totalCount ?? 0;
  const items = data?.items ?? [];

  // KPI tone: red if any HIGH severity, amber if any MEDIUM, green/active if all LOW or empty.
  const worst = items.reduce<PendingActionItem['severity']>(
    (acc, it) => (it.severity === 'HIGH' ? 'HIGH' : acc === 'HIGH' ? 'HIGH' : it.severity === 'MEDIUM' ? 'MEDIUM' : acc),
    'LOW',
  );
  const tone = total === 0 ? 'var(--color-status-active)' : severityBorder(worst);

  return (
    <>
      <div className="kpi-strip" aria-label="Pending approvals" style={{ marginBottom: 'var(--space-3)' }}>
        <Link
          className="kpi-strip__item"
          data-jtbd="What needs my attention?"
          to="/dashboard/manager?view=approvals"
          style={{ borderLeft: `3px solid ${tone}` }}
        >
          <TipBalloon
            tip="Total open items awaiting your decision: staffing-request slate picks, budget-change requests, leave requests, and timesheet approvals."
            arrow="left"
          />
          <span className="kpi-strip__value">{total}</span>
          <span className="kpi-strip__label">Pending approvals</span>
        </Link>
      </div>

      <SectionCard title="Awaiting your action" data-jtbd="What needs my attention right now?">
        {loading ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: 'var(--space-3) 0' }}>
            Loading pending items…
          </div>
        ) : error ? (
          <EmptyState
            description={error}
            title="Could not load pending approvals"
          />
        ) : items.length === 0 ? (
          <EmptyState
            description="No items waiting on you. Browse the approval queue surfaces if you want to review history."
            title="All clear"
          />
        ) : (
          <table className="dash-compact-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: 80 }}>Severity</th>
                <th style={{ textAlign: 'left', width: 100 }}>Kind</th>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'left' }}>Context</th>
                <th style={NUM as object}>Age</th>
                <th style={{ textAlign: 'right', width: 60 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={`${it.kind}:${it.id}`}>
                  <td>
                    <StatusBadge tone={severityTone(it.severity)} label={it.severity} variant="dot" />
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{kindLabel(it.kind)}</td>
                  <td style={{ fontWeight: 500 }}>{it.title}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{it.contextLabel ?? '—'}</td>
                  <td style={{ ...NUM, fontSize: 12, color: 'var(--color-text-muted)' }}>{formatAge(it.ageHours)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={it.ctaUrl} style={{ color: 'var(--color-accent)', fontSize: 12 }}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
