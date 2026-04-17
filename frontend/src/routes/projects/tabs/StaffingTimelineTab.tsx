import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StaffingSwimLaneGantt } from '@/components/projects/StaffingSwimLaneGantt';
import { fetchAssignments, type AssignmentDirectoryItem } from '@/lib/api/assignments';
import { fetchProjectDashboard, type ProjectDashboardResponse } from '@/lib/api/project-dashboard';
import { formatDate } from '@/lib/format-date';

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', textAlign: 'right' };

interface StaffingTimelineTabProps {
  projectId: string;
}

export function StaffingTimelineTab({ projectId }: StaffingTimelineTabProps): JSX.Element {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void Promise.all([
      fetchAssignments({ projectId }),
      fetchProjectDashboard(projectId).catch(() => null),
    ]).then(([assignResp, dashResp]) => {
      if (!active) return;
      setAssignments(assignResp.items);
      setDashboard(dashResp);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Failed to load timeline data.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [projectId]);

  if (loading) return <LoadingState label="Loading staffing timeline..." variant="skeleton" skeletonType="detail" />;
  if (error) return <ErrorState description={error} />;

  return (
    <>
      {/* ── Swim-Lane Gantt ── */}
      <SectionCard title="Staffing Timeline">
        {assignments.length === 0 ? (
          <EmptyState description="No assignments with date ranges to visualize." title="No timeline data" action={{ label: 'Create assignment', href: `/assignments/new?projectId=${projectId}` }} />
        ) : (
          <StaffingSwimLaneGantt assignments={assignments} />
        )}
      </SectionCard>

      {/* ── Allocation by Person ── */}
      {dashboard && dashboard.allocationByPerson.length > 0 ? (
        <SectionCard title="Allocation by Person" collapsible chartExport={{
          headers: ['Person', 'Allocation %'],
          rows: dashboard.allocationByPerson.map((i) => ({ Person: i.displayName, 'Allocation %': String(i.allocationPercent) })),
        }}>
          <table className="dash-compact-table">
            <thead><tr><th>Person</th><th style={NUM}>Alloc %</th><th style={{ width: 120 }}>Bar</th></tr></thead>
            <tbody>
              {dashboard.allocationByPerson.map((item) => (
                <tr key={item.personId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                  <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                  <td style={{ ...NUM, fontWeight: 600 }}>{item.allocationPercent}%</td>
                  <td>
                    <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(item.allocationPercent, 100)}%`, borderRadius: 2, background: item.allocationPercent > 100 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}

      {/* ── Activity by Week ── */}
      {dashboard && dashboard.evidenceByWeek.some((w) => w.totalHours > 0) ? (
        <SectionCard title="Activity by Week (12 wk)" collapsible chartExport={{
          headers: ['Week', 'Hours'],
          rows: dashboard.evidenceByWeek.filter((w) => w.totalHours > 0).map((w) => ({ Week: w.weekStarting, Hours: String(w.totalHours) })),
        }}>
          <table className="dash-compact-table">
            <thead><tr><th>Week</th><th style={NUM}>Hours</th><th style={{ width: 120 }}>Bar</th></tr></thead>
            <tbody>
              {dashboard.evidenceByWeek.filter((w) => w.totalHours > 0).map((w) => {
                const maxH = Math.max(...dashboard.evidenceByWeek.map((wk) => wk.totalHours), 1);
                return (
                  <tr key={w.weekStarting}>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(w.weekStarting)}</td>
                    <td style={{ ...NUM, fontWeight: 600 }}>{w.totalHours}h</td>
                    <td>
                      <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((w.totalHours / maxH) * 100)}%`, borderRadius: 2, background: 'var(--color-status-active)' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      ) : null}
    </>
  );
}
