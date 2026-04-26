import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { formatChangeType } from '@/lib/labels';
import { formatDate } from '@/lib/format-date';
import type {
  OpenStaffingRequestSummary,
  ProjectDashboardAttentionItem,
  RecentlyChangedAssignmentItem,
} from '@/lib/api/dashboard-project-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

export interface OverallocatedPerson {
  id: string;
  displayName: string;
  totalPercent: number;
}

interface Props {
  overallocated: OverallocatedPerson[];
  projectsWithStaffingGaps: ProjectDashboardAttentionItem[];
  openRequests: OpenStaffingRequestSummary[];
  recentChanges: RecentlyChangedAssignmentItem[];
  onPersonClick: (personId: string) => void;
  onProjectClick: (projectId: string) => void;
  onRequestClick: (requestId: string) => void;
}

export function PmStaffingTab({
  overallocated,
  projectsWithStaffingGaps,
  openRequests,
  recentChanges,
  onPersonClick,
  onProjectClick,
  onRequestClick,
}: Props): JSX.Element {
  const hasIssues = overallocated.length > 0 || projectsWithStaffingGaps.length > 0;

  return (
    <>
      {hasIssues && (
        <div className="dash-action-section" style={{ position: 'relative' }}>
          <TipBalloon tip="Staffing issues needing attention — overallocated people and projects with gaps." arrow="left" />
          <div className="dash-action-section__header">
            <span className="dash-action-section__title">
              Staffing Issues ({overallocated.length + projectsWithStaffingGaps.length})
            </span>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table className="dash-compact-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th style={{ width: 70 }}>Severity</th>
                  <th style={{ width: 100 }}>Category</th>
                  <th>Entity</th>
                  <th style={{ width: 160 }}>Detail</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {overallocated.map((person, i) => (
                  <tr key={`over-${person.id}`} style={{ cursor: 'pointer' }} onClick={() => onPersonClick(person.id)}>
                    <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-danger)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>High</span>
                      </span>
                    </td>
                    <td>Overallocated</td>
                    <td style={{ fontWeight: 500 }}>{person.displayName}</td>
                    <td style={{ fontSize: 11 }}>{person.totalPercent}% total allocation</td>
                    <td>
                      <Link
                        to={`/people/${person.id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 10, color: 'var(--color-accent)' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {projectsWithStaffingGaps.map((item, i) => (
                  <tr key={`gap-${item.projectId}-${item.reason}`} style={{ cursor: 'pointer' }} onClick={() => onProjectClick(item.projectId)}>
                    <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{overallocated.length + i + 1}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-warning)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>Med</span>
                      </span>
                    </td>
                    <td>Staffing Gap</td>
                    <td style={{ fontWeight: 500 }}>{item.projectName}</td>
                    <td style={{ fontSize: 11 }}>{item.reason} · {item.detail}</td>
                    <td>
                      <Link
                        to={`/assignments/new?projectId=${item.projectId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 10, color: 'var(--color-accent)' }}
                      >
                        Fill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openRequests.length > 0 && (
        <SectionCard title={`Open Staffing Requests (${openRequests.length})`} collapsible>
          <div style={{ overflow: 'auto' }}>
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th style={{ width: 80 }}>Priority</th>
                  <th style={{ width: 90 }}>Start</th>
                  <th style={NUM}>Headcount</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {openRequests.map((req) => (
                  <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => onRequestClick(req.id)}>
                    <td style={{ fontWeight: 500 }}>{req.role}</td>
                    <td><PriorityBadge priority={req.priority} /></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{req.startDate}</td>
                    <td style={NUM}>{req.headcountFulfilled}/{req.headcountRequired}</td>
                    <td>
                      <Link
                        to={`/staffing-requests/${req.id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 10, color: 'var(--color-accent)' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8 }}>
            <Link style={{ fontSize: 11, color: 'var(--color-text-muted)' }} to="/staffing-requests">
              View all staffing requests
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Recently Changed Assignments"
        collapsible
        chartExport={{
          headers: ['Project', 'Person', 'Change', 'Date'],
          rows: recentChanges.map((i) => ({
            Project: i.projectName,
            Person: i.personDisplayName,
            Change: i.changeType,
            Date: i.changedAt.slice(0, 10),
          })),
        }}
      >
        {recentChanges.length === 0 ? (
          <EmptyState
            description="No recent assignment changes were found for managed projects."
            title="No recent changes"
          />
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Person</th>
                  <th style={{ width: 100 }}>Change</th>
                  <th style={{ width: 90 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentChanges.map((item) => (
                  <tr key={item.assignmentId}>
                    <td style={{ fontWeight: 500 }}>{item.projectName}</td>
                    <td>{item.personDisplayName}</td>
                    <td style={{ fontSize: 11 }}>{formatChangeType(item.changeType)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.changedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
