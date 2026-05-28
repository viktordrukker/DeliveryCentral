import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { OrgPersonEnriched } from '@/features/org-chart/useOrgChart';
import type { FlatOrgNode } from './InteractiveOrgChart';
import { useAuth } from '@/app/auth-context';
import { PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { humanizeEnum, ORG_UNIT_TYPE_LABELS } from '@/lib/labels';
import { Button, Pct } from '@/components/ds';
const PAGE_SIZE = 15;

interface DepartmentSidebarDrawerProps {
  dept: FlatOrgNode;
  people: OrgPersonEnriched[];
  onClose: () => void;
}

export function DepartmentSidebarDrawer({ dept, people, onClose }: DepartmentSidebarDrawerProps): JSX.Element {
  const { principal } = useAuth();
  const isAdminViewer = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Filter people belonging to this department (including all child org units)
  const matchCodes = new Set(dept.allCodes ?? [dept.code]);
  const deptMembers = people.filter(
    (p) => (p.orgUnitCode && matchCodes.has(p.orgUnitCode)) || p.orgUnitName === dept.name,
  );

  // Search within members
  const filteredMembers = memberSearch
    ? deptMembers.filter((m) =>
        m.displayName.toLowerCase().includes(memberSearch.toLowerCase())
        || (m.primaryEmail?.toLowerCase().includes(memberSearch.toLowerCase()) ?? false),
      )
    : deptMembers;

  const visibleMembers = showAll ? filteredMembers : filteredMembers.slice(0, PAGE_SIZE);

  // Aggregate metrics
  const totalMembers = deptMembers.length;
  const activeMembers = deptMembers.filter((m) => m.lifecycleStatus.toUpperCase() === 'ACTIVE').length;
  const avgAllocation = totalMembers > 0
    ? Math.round(deptMembers.reduce((sum, m) => sum + m.totalAllocation, 0) / totalMembers)
    : 0;
  const overallocated = deptMembers.filter((m) => m.totalAllocation > 100).length;
  const onBench = deptMembers.filter((m) => m.totalAllocation === 0 && m.lifecycleStatus.toUpperCase() === 'ACTIVE').length;

  // Alerts
  const alerts: Array<{ level: 'red' | 'orange' | 'yellow'; label: string }> = [];
  if (overallocated > 0) {
    alerts.push({ level: 'red', label: `${overallocated} overallocated member${overallocated !== 1 ? 's' : ''}` });
  }
  if (onBench > 0) {
    alerts.push({ level: 'yellow', label: `${onBench} on bench (0% allocated)` });
  }
  if (!dept.manager) {
    alerts.push({ level: 'orange', label: 'No department manager assigned' });
  }

  return (
    <div className="org-chart-drawer">
      {/* Header */}
      <div className="org-chart-drawer__header">
        <h3>{dept.name}</h3>
        <Button variant="secondary" size="sm" onClick={onClose} type="button">{'\u2715'}</Button>
      </div>

      {/* Identity */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--color-accent-soft)',
            color: 'var(--color-accent-text)',
            fontWeight: 600,
          }}>
            {dept.kind ? humanizeEnum(dept.kind, ORG_UNIT_TYPE_LABELS) : 'Unit'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{dept.code}</span>
        </div>
        {dept.manager && (
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Led by: </span>
            <Link to={`/people/${dept.manager.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
              {dept.manager.displayName}
            </Link>
          </div>
        )}
      </div>

      {/* Alerts (admin roles only) */}
      {isAdminViewer && alerts.length > 0 && (
        <div className="person-drawer__section">
          <div className="person-drawer__section-title">Issues</div>
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
                  background: alert.level === 'red' ? 'color-mix(in srgb, var(--color-status-danger) 10%, transparent)' : alert.level === 'orange' ? 'color-mix(in srgb, var(--color-status-warning) 10%, transparent)' : 'color-mix(in srgb, var(--color-status-warning) 10%, transparent)',
                  color: alert.level === 'red' ? 'var(--color-status-danger)' : alert.level === 'orange' ? 'var(--color-status-warning)' : 'var(--color-status-warning)',
                }}
              >
                <span style={{ fontSize: 14 }}>{'\u26A0'}</span>
                {alert.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="person-drawer__section">
        <div className="person-drawer__section-title">Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <MetricTile label="Members" value={String(totalMembers)} sublabel={`${activeMembers} active`} />
          <MetricTile label="Avg. Allocation" value={<Pct value={avgAllocation} fractionDigits={0} />} color={avgAllocation > 100 ? 'var(--color-status-danger)' : avgAllocation > 80 ? 'var(--color-status-warning)' : 'var(--color-status-active)'} />
          <MetricTile label="Overallocated" value={String(overallocated)} color={overallocated > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'} />
          <MetricTile label="On Bench" value={String(onBench)} color={onBench > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'} />
        </div>
      </div>

      {/* Staff list */}
      <div className="person-drawer__section">
        <div className="person-drawer__section-title">
          Staff ({totalMembers})
        </div>
        {totalMembers > PAGE_SIZE && (
          <input
            type="search"
            className="field__control"
            placeholder="Search members..."
            value={memberSearch}
            onChange={(e) => { setMemberSearch(e.target.value); setShowAll(false); }}
            style={{ marginBottom: 8, fontSize: 12, padding: '4px 8px' }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
          {visibleMembers.map((member) => (
            <Link
              key={member.id}
              to={`/people/${member.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 4,
                background: 'var(--color-surface-alt)',
                textDecoration: 'none',
                color: 'inherit',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: member.lifecycleStatus.toUpperCase() === 'ACTIVE' ? 'var(--color-status-active)' : 'var(--color-status-neutral)',
                }} />
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.displayName}
                </span>
              </div>
              <span style={{
                fontWeight: 700,
                flexShrink: 0,
                fontSize: 11,
                color: member.totalAllocation > 100 ? 'var(--color-status-danger)' : member.totalAllocation > 80 ? 'var(--color-status-warning)' : member.totalAllocation === 0 ? 'var(--color-status-neutral)' : 'var(--color-status-active)',
              }}>
                <Pct value={member.totalAllocation} fractionDigits={0} />
              </span>
            </Link>
          ))}
          {filteredMembers.length === 0 && (
            <div className="person-drawer__empty">No members found</div>
          )}
        </div>
        {!showAll && filteredMembers.length > PAGE_SIZE && (
          <Button variant="secondary" size="sm" onClick={() => setShowAll(true)} type="button" style={{ marginTop: 8, width: '100%', fontSize: 11 }}>
            Show all {filteredMembers.length} members
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="person-drawer__actions">
        <Button as={Link} variant="primary" to={`/people?departmentId=${dept.id}`} style={{ width: '100%', textAlign: 'center' }}>
          View in Directory
        </Button>
      </div>
    </div>
  );
}

function MetricTile({ label, value, sublabel, color }: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  color?: string;
}): JSX.Element {
  return (
    <div style={{
      padding: '8px',
      borderRadius: 6,
      background: 'var(--color-surface-alt)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? 'var(--color-text)' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginTop: 1 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
