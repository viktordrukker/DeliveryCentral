import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { hasAnyRole, TIMESHEET_MANAGER_ROLES, PEOPLE_MANAGE_ROLES, ASSIGNMENT_CREATE_ROLES } from '@/app/route-manifest';
import { StatusBadge } from '@/components/common/StatusBadge';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { StaffingDeskInlineActions } from '@/components/staffing-desk/StaffingDeskInlineActions';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import type { StaffingDeskActions } from '@/features/staffing-desk/useStaffingDeskActions';
import { statusTone, priorityTone } from '@/features/staffing-desk/staffing-desk.types';
import { humanizeEnum } from '@/lib/labels';
import { formatDateShort } from '@/lib/format-date';
import { fetchPersonDirectoryById, type PersonDirectoryItem } from '@/lib/api/person-directory';
import { fetchPersonSkills, type PersonSkill } from '@/lib/api/skills';

interface Props {
  actions: StaffingDeskActions;
  onClose: () => void;
  row: StaffingDeskRow | null;
}

const OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' };
const BACKDROP: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' };
const PANEL: React.CSSProperties = {
  position: 'relative', width: 460, maxWidth: '90vw', height: '100%',
  background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-modal)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
};
const HEADER: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
};
const BODY: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', flex: 1, overflowY: 'auto' };
const DL: React.CSSProperties = { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '3px var(--space-2)', fontSize: 12, marginBottom: 'var(--space-2)' };
const DT: React.CSSProperties = { color: 'var(--color-text-muted)', fontWeight: 500 };
const SECTION: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-subtle)', marginBottom: 'var(--space-1)', marginTop: 'var(--space-2)' };
const S_NAV: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
  padding: 'var(--space-2) 0',
};
const S_NAV_LINK: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
  padding: '6px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500,
  color: 'var(--color-accent)', textDecoration: 'none',
  border: '1px solid var(--color-border)', transition: 'background 80ms',
};

export function StaffingDeskDetailDrawer({ actions, onClose, row }: Props): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  const navigate = useNavigate();
  const [personInfo, setPersonInfo] = useState<PersonDirectoryItem | null>(null);
  const [personSkills, setPersonSkills] = useState<PersonSkill[]>([]);

  function goTo(path: string): void {
    onClose();
    // Small delay so drawer unmounts before navigation
    setTimeout(() => navigate(path), 50);
  }

  useEffect(() => {
    if (!row) return;
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  useEffect(() => {
    if (!row || row.kind !== 'assignment' || !row.personId) { setPersonInfo(null); setPersonSkills([]); return; }
    let active = true;
    void fetchPersonDirectoryById(row.personId).then((p) => { if (active) setPersonInfo(p); }).catch(() => {});
    void fetchPersonSkills(row.personId).then((s) => { if (active) setPersonSkills(s); }).catch(() => {});
    return () => { active = false; };
  }, [row?.personId, row?.kind]);

  if (!row) return null;

  const canViewPeople = hasAnyRole(roles, [...PEOPLE_MANAGE_ROLES]);
  const canViewAssignments = hasAnyRole(roles, [...ASSIGNMENT_CREATE_ROLES]);
  const canViewTimesheets = hasAnyRole(roles, [...TIMESHEET_MANAGER_ROLES]);

  return (
    <div style={OVERLAY} role="dialog" aria-label="Staffing desk detail">
      <div style={BACKDROP} onClick={onClose} />
      <div ref={panelRef} style={PANEL} tabIndex={-1}>
        <div style={HEADER}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: 2 }}>
              {row.kind === 'assignment' ? 'Assignment' : 'Staffing Request'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{row.personName ?? row.role}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.projectName}</div>
          </div>
          <button className="button button--secondary button--sm" onClick={onClose} type="button" style={{ fontSize: 16, lineHeight: 1, padding: '2px 8px' }}>&times;</button>
        </div>

        <div style={BODY}>
          {/* Status badges */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <StatusBadge label={humanizeEnum(row.status)} tone={statusTone(row)} variant="chip" />
            {row.priority && <StatusBadge label={row.priority} tone={priorityTone(row.priority)} variant="chip" />}
          </div>

          {/* Quick navigation — RBAC-gated links */}
          {row.kind === 'assignment' && row.personId && (
            <>
              <div style={SECTION}>Quick Actions</div>
              <div style={S_NAV}>
                {canViewPeople && (
                  <button type="button" style={S_NAV_LINK} onClick={() => goTo(`/people/${row.personId}`)}>
                    View Employee Profile
                  </button>
                )}
                {canViewAssignments && (
                  <button type="button" style={S_NAV_LINK} onClick={() => goTo(`/assignments/${row.id}`)}>
                    View Assignment Details
                  </button>
                )}
                {canViewTimesheets && (
                  <button type="button" style={S_NAV_LINK} onClick={() => goTo(`/time-management?person=${encodeURIComponent(row.personName ?? '')}`)}>
                    Review Timesheets
                  </button>
                )}
                <button type="button" style={S_NAV_LINK} onClick={() => goTo(`/projects/${row.projectId}`)}>
                  View Project
                </button>
              </div>
            </>
          )}

          {row.kind === 'request' && (
            <>
              <div style={SECTION}>Quick Actions</div>
              <div style={S_NAV}>
                <button type="button" style={S_NAV_LINK} onClick={() => goTo(`/staffing-requests/${row.id}`)}>
                  View Request Details
                </button>
                <button type="button" style={S_NAV_LINK} onClick={() => goTo(`/projects/${row.projectId}`)}>
                  View Project
                </button>
              </div>
            </>
          )}

          {/* Assignment/request details */}
          <div style={SECTION}>Details</div>
          <dl style={DL}>
            <dt style={DT}>Role</dt><dd>{row.role || '—'}</dd>
            <dt style={DT}>Allocation</dt><dd style={{ fontVariantNumeric: 'tabular-nums' }}>{row.allocationPercent}%</dd>
            <dt style={DT}>Start Date</dt><dd>{formatDateShort(row.startDate)}</dd>
            <dt style={DT}>End Date</dt><dd>{row.endDate ? formatDateShort(row.endDate) : 'Open-ended'}</dd>
            {row.assignmentCode && (<><dt style={DT}>Code</dt><dd>{row.assignmentCode}</dd></>)}
            {row.kind === 'request' && (
              <>
                <dt style={DT}>Headcount</dt><dd style={{ fontVariantNumeric: 'tabular-nums' }}>{row.headcountFulfilled}/{row.headcountRequired}</dd>
                {row.skills.length > 0 && (<><dt style={DT}>Skills</dt><dd>{row.skills.join(', ')}</dd></>)}
                {row.requestedByName && (<><dt style={DT}>Requested by</dt><dd>{row.requestedByName}</dd></>)}
                {row.summary && (<><dt style={DT}>Summary</dt><dd style={{ whiteSpace: 'normal' }}>{row.summary}</dd></>)}
              </>
            )}
          </dl>

          {/* Employee profile (for assignment rows) */}
          {row.kind === 'assignment' && (
            <>
              <div style={SECTION}>Employee Profile</div>
              <dl style={DL}>
                <dt style={DT}>Grade</dt><dd>{row.personGrade ?? '—'}</dd>
                <dt style={DT}>Job Role</dt><dd>{row.personRole ?? '—'}</dd>
                <dt style={DT}>Department</dt><dd>{row.personOrgUnit ?? '—'}</dd>
                <dt style={DT}>Line Manager</dt><dd>{row.personManager ?? '—'}</dd>
                <dt style={DT}>Resource Pool</dt><dd>{row.personPool ?? '—'}</dd>
                <dt style={DT}>Emp. Status</dt><dd>{row.personEmploymentStatus ?? '—'}</dd>
                {row.personEmail && (<><dt style={DT}>Email</dt><dd style={{ fontSize: 11 }}>{row.personEmail}</dd></>)}
              </dl>

              {/* Skills from person metadata (pre-loaded in row) */}
              {row.personSkills.length > 0 && (
                <>
                  <div style={SECTION}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--space-2)' }}>
                    {row.personSkills.map((s) => (
                      <span key={s} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Detailed skills with proficiency (from API) */}
              {personSkills.length > 0 && row.personSkills.length === 0 && (
                <>
                  <div style={SECTION}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--space-2)' }}>
                    {personSkills.map((s) => (
                      <span key={s.id} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
                      }}>
                        {s.skillName}{s.proficiency ? ` (${s.proficiency})` : ''}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* WorkloadTimeline */}
          {row.kind === 'assignment' && row.personId && (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <div style={SECTION}>Workload Timeline</div>
              <WorkloadTimeline personId={row.personId} preloadedAssignments={row.personAssignments} />
            </div>
          )}

          {/* Workflow actions */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
            <div style={SECTION}>Workflow Actions</div>
            <StaffingDeskInlineActions actions={actions} row={row} />
          </div>
        </div>
      </div>
    </div>
  );
}
