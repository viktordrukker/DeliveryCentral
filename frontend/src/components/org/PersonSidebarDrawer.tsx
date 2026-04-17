import { Link, useNavigate } from 'react-router-dom';

import type { OrgPersonEnriched } from '@/features/org-chart/useOrgChart';
import { usePersonSidebarData } from '@/features/org-chart/usePersonSidebarData';
import { useAuth } from '@/app/auth-context';
import { PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f', '#558b2f'];
function avatarBg(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

interface PersonSidebarDrawerProps {
  person: OrgPersonEnriched;
  onClose: () => void;
}

export function PersonSidebarDrawer({ person, onClose }: PersonSidebarDrawerProps): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const sidebar = usePersonSidebarData(person.id);

  const isAdminViewer = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);

  // Compute alerts
  const alerts: Array<{ level: 'red' | 'orange' | 'yellow'; label: string }> = [];
  if (person.totalAllocation > 100) {
    alerts.push({ level: 'red', label: `Overallocated (${person.totalAllocation}%)` });
  }
  if (person.totalAllocation === 0 && person.lifecycleStatus.toUpperCase() === 'ACTIVE') {
    alerts.push({ level: 'yellow', label: 'On bench (0% allocated)' });
  }
  if (!sidebar.isLoading && sidebar.openExceptions.length > 0) {
    alerts.push({ level: 'orange', label: `${sidebar.openExceptions.length} open exception${sidebar.openExceptions.length !== 1 ? 's' : ''}` });
  }

  const allocColor = person.totalAllocation > 100
    ? 'var(--color-error, #d32f2f)'
    : person.totalAllocation > 80
      ? 'var(--color-warning, #f57c00)'
      : 'var(--color-success, #2e7d32)';

  return (
    <div className="org-chart-drawer">
      {/* Header */}
      <div className="org-chart-drawer__header">
        <h3>{person.displayName}</h3>
        <button className="button button--ghost button--sm" onClick={onClose} type="button">{'\u2715'}</button>
      </div>

      {/* Identity */}
      <div className="person-drawer__identity">
        <div className="person-drawer__avatar" style={{ background: avatarBg(person.displayName) }}>
          {person.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="person-drawer__name">{person.displayName}</div>
          {(person.role || person.grade) && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>
              {person.role && <span>{person.role}</span>}
              {person.role && person.grade && <span> {'\u00B7'} </span>}
              {person.grade && <span>{person.grade}</span>}
            </div>
          )}
          {person.primaryEmail && (
            <div className="person-drawer__email">
              <a href={`mailto:${person.primaryEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {person.primaryEmail}
              </a>
            </div>
          )}
          <div className="person-drawer__meta">
            <span className={'person-drawer__status person-drawer__status--' + person.lifecycleStatus.toLowerCase()}>
              {person.lifecycleStatus}
            </span>
            {person.orgUnitName && (
              <span>{'\u00B7'} {person.orgUnitName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Alerts (admin roles only) */}
      {isAdminViewer && alerts.length > 0 && (
        <div className="person-drawer__section">
          <div className="person-drawer__section-title">Alerts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {alerts.map((alert, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  background: alert.level === 'red' ? 'rgba(239,68,68,.1)' : alert.level === 'orange' ? 'rgba(245,124,0,.1)' : 'rgba(245,158,11,.1)',
                  color: alert.level === 'red' ? '#991b1b' : alert.level === 'orange' ? '#9a3412' : '#92400e',
                }}
              >
                <span style={{ fontSize: 14 }}>{alert.level === 'red' ? '\u26A0' : '\u26A0'}</span>
                {alert.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocation bar */}
      <div className="person-drawer__section">
        <div className="person-drawer__section-title">Allocation</div>
        <div className="person-drawer__alloc-bar-wrapper">
          <div className="person-drawer__alloc-bar">
            <div
              className="person-drawer__alloc-bar-fill"
              style={{
                width: `${Math.min(person.totalAllocation, 100)}%`,
                background: allocColor,
              }}
            />
          </div>
          <span className="person-drawer__alloc-label">{person.totalAllocation}%</span>
        </div>
      </div>

      {/* Assignments with staffing role */}
      <div className="person-drawer__section">
        <div className="person-drawer__section-title">
          Assignments ({person.assignmentCount})
        </div>
        {sidebar.isLoading ? (
          <div className="person-drawer__empty">Loading...</div>
        ) : sidebar.assignments.length > 0 ? (
          <ul className="person-drawer__assignment-list">
            {sidebar.assignments.map((a) => (
              <li key={a.id} className="person-drawer__assignment-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/projects/${a.project.id}`} className="person-drawer__assignment-link">
                    {a.project.displayName}
                  </Link>
                  <span className="person-drawer__assignment-pct">{a.allocationPercent}%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #999)' }}>
                  {a.staffingRole}
                  {a.endDate && <span> {'\u00B7'} ends {new Date(a.endDate).toLocaleDateString()}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : person.allocations.length > 0 ? (
          <ul className="person-drawer__assignment-list">
            {person.allocations.map((a) => (
              <li key={a.projectId} className="person-drawer__assignment-item">
                <Link to={`/projects/${a.projectId}`} className="person-drawer__assignment-link">
                  {a.projectName}
                </Link>
                <span className="person-drawer__assignment-pct">{a.allocationPercent}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="person-drawer__empty">No active assignments</div>
        )}
      </div>

      {/* Reporting line */}
      <div className="person-drawer__section">
        <div className="person-drawer__section-title">Reporting Line</div>
        {person.lineManagerName ? (
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Reports to: </span>
            <Link to={`/people/${person.lineManagerId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
              {person.lineManagerName}
            </Link>
          </div>
        ) : (
          <div className="person-drawer__empty">No line manager</div>
        )}
      </div>

      {/* Resource pools */}
      {person.resourcePools.length > 0 && (
        <div className="person-drawer__section">
          <div className="person-drawer__section-title">Resource Pools</div>
          <div className="person-drawer__tags">
            {person.resourcePools.map((pool) => (
              <Link key={pool.id} to={`/resource-pools/${pool.id}`} className="person-drawer__tag">
                {pool.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {!sidebar.isLoading && sidebar.skills.length > 0 && (
        <div className="person-drawer__section">
          <div className="person-drawer__section-title">Skills</div>
          <div className="person-drawer__tags">
            {sidebar.skills.slice(0, 8).map((skill) => (
              <span key={skill.id} className="person-drawer__tag" style={{
                background: skill.certified ? 'rgba(34,197,94,.1)' : undefined,
                borderLeft: `3px solid ${proficiencyColor(skill.proficiency)}`,
              }}>
                {skill.skillName}
                {skill.certified && <span title="Certified" style={{ marginLeft: 3 }}>{'\u2713'}</span>}
              </span>
            ))}
            {sidebar.skills.length > 8 && (
              <span className="person-drawer__tag" style={{ fontStyle: 'italic' }}>
                +{sidebar.skills.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action links */}
      <div className="person-drawer__actions">
        <button
          className="button button--primary"
          onClick={() => navigate(`/people/${person.id}`)}
          type="button"
          style={{ width: '100%' }}
        >
          View Profile
        </button>
        <Link className="button button--secondary" to={`/assignments?personId=${person.id}`} style={{ width: '100%', textAlign: 'center' }}>
          View Assignments
        </Link>
        {person.primaryEmail && (
          <a className="button button--secondary" href={`mailto:${person.primaryEmail}`} style={{ width: '100%', textAlign: 'center' }}>
            Send Email
          </a>
        )}
      </div>
    </div>
  );
}

function proficiencyColor(level: number): string {
  if (level >= 4) return '#22c55e';
  if (level >= 3) return '#3b82f6';
  if (level >= 2) return '#f59e0b';
  return '#94a3b8';
}
