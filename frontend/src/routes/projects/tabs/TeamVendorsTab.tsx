import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { RolePlanBuilder } from '@/components/projects/RolePlanBuilder';
import { RolePlanComparison } from '@/components/projects/RolePlanComparison';
import { StaffingSwimLaneGantt } from '@/components/projects/StaffingSwimLaneGantt';
import { VendorEngagementPanel } from '@/components/projects/VendorEngagementPanel';
import { ProjectTeamAssignmentForm, ProjectTeamAssignmentFormValues } from '@/components/projects/ProjectTeamAssignmentForm';
import { formatDateShort, formatDate } from '@/lib/format-date';
import type { ProjectDetails, AssignProjectTeamResponse } from '@/lib/api/project-registry';
import { assignTeamToProject } from '@/lib/api/project-registry';
import { listProjectPositions, type ProjectPosition } from '@/lib/api/project-positions';
import { fetchPersonDirectoryById } from '@/lib/api/person-directory';
import { fetchRolePlan, fetchRolePlanComparison, type RolePlanEntryDto, type RolePlanComparisonResult } from '@/lib/api/project-role-plan';
import { fetchTeams, type TeamSummary } from '@/lib/api/teams';
import { fetchProjectVendors, type ProjectVendorEngagementDto } from '@/lib/api/vendors';
import { fetchProjectDashboard, type ProjectDashboardResponse } from '@/lib/api/project-dashboard';
import { Avatar, Pct, Table, type Column } from '@/components/ds';

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', textAlign: 'right' };

interface TeamVendorsTabProps {
  project: ProjectDetails;
  projectId: string;
  reload: () => Promise<void>;
}

export function TeamVendorsTab({ project, projectId, reload }: TeamVendorsTabProps): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const canManageProject = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const tokenState = useStoredApiToken();

  const [positions, setPositions] = useState<ProjectPosition[]>([]);
  const [teamAssignmentsLoading, setTeamAssignmentsLoading] = useState(true);
  const [teamAssignmentsError, setTeamAssignmentsError] = useState<string | null>(null);
  // W1-10 — id → displayName cache for positions whose source DTO didn't
  // carry an enriched `activePersonName` projection. Filled by a follow-up
  // effect that fans out /org/people/:id reads; deduped per personId so the
  // burst stays small even on large team lists.
  const [personNames, setPersonNames] = useState<Map<string, string>>(new Map());
  const [rolePlanEntries, setRolePlanEntries] = useState<RolePlanEntryDto[]>([]);
  const [rolePlanComparison, setRolePlanComparison] = useState<RolePlanComparisonResult | null>(null);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [vendorEngagements, setVendorEngagements] = useState<ProjectVendorEngagementDto[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [assignTeamResult, setAssignTeamResult] = useState<AssignProjectTeamResponse | null>(null);
  const [assignTeamValues, setAssignTeamValues] = useState<ProjectTeamAssignmentFormValues>({
    actorId: '', allocationPercent: '100', endDate: '', note: '', staffingRole: '', startDate: '', teamId: '',
  });
  const [assignTeamErrors, setAssignTeamErrors] = useState<Partial<Record<keyof ProjectTeamAssignmentFormValues, string>>>({});

  // Load assignments + role plan + vendors + dashboard
  useEffect(() => {
    let active = true;
    setTeamAssignmentsLoading(true);

    void (async () => {
      const [positionsResponse, planEntries, vendors, dashResp] = await Promise.all([
        listProjectPositions({ projectId }),
        fetchRolePlan(projectId).catch(() => [] as RolePlanEntryDto[]),
        fetchProjectVendors(projectId).catch(() => [] as ProjectVendorEngagementDto[]),
        fetchProjectDashboard(projectId).catch(() => null),
      ]);
      if (!active) return;
      setPositions(positionsResponse.positions);
      setRolePlanEntries(planEntries);
      setVendorEngagements(vendors);
      setDashboard(dashResp);
      const comparison = await fetchRolePlanComparison(projectId).catch(() => null);
      if (!active) return;
      if (comparison) setRolePlanComparison(comparison);
    })()
      .catch((error: unknown) => { if (active) setTeamAssignmentsError(error instanceof Error ? error.message : 'Failed to load assignments.'); })
      .finally(() => { if (active) setTeamAssignmentsLoading(false); });

    return () => { active = false; };
  }, [projectId]);

  // W1-10 — resolve raw activePersonId → displayName when the DTO didn't
  // carry an enriched `activePersonName` projection. Skips rows already
  // resolved and those that already have a name from the BE.
  useEffect(() => {
    let active = true;
    const unresolved = Array.from(
      new Set(
        positions
          .filter((p) => p.activePersonId && !p.activePersonName && !personNames.has(p.activePersonId))
          .map((p) => p.activePersonId as string),
      ),
    );
    if (unresolved.length === 0) return;
    void Promise.allSettled(unresolved.map((id) => fetchPersonDirectoryById(id))).then((results) => {
      if (!active) return;
      const next = new Map(personNames);
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') next.set(unresolved[i], res.value.displayName);
      });
      setPersonNames(next);
    });
    return () => { active = false; };
  }, [positions, personNames]);

  // Load teams
  useEffect(() => {
    let active = true;
    setTeamsLoading(true);
    void fetchTeams()
      .then((r) => { if (active) setTeams(r.items); })
      .catch((e: unknown) => { if (active) setTeamsError(e instanceof Error ? e.message : 'Failed to load teams.'); })
      .finally(() => { if (active) setTeamsLoading(false); });
    return () => { active = false; };
  }, []);

  const teamOptions = useMemo(
    () => teams.filter((t) => t.orgUnit).map((t) => ({ label: t.name, meta: t.orgUnit ? t.orgUnit.name : 'No org unit', value: t.id })).sort((a, b) => a.label.localeCompare(b.label)),
    [teams],
  );

  // SoT PR 17b — gantt now consumes ProjectPosition[] directly.
  const ganttAssignments = positions;

  async function handleAssignTeam(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isAssigningTeam) return;
    const nextErrors = validateAssignTeam(assignTeamValues);
    setAssignTeamErrors(nextErrors);
    setActionError(null);
    setActionSuccess(null);
    if (Object.keys(nextErrors).length > 0) return;

    const selectedTeam = teams.find((t) => t.id === assignTeamValues.teamId);
    if (!selectedTeam?.orgUnit) { setActionError('Selected team has no org unit mapping.'); return; }

    setIsAssigningTeam(true);
    setAssignTeamResult(null);

    try {
      const response = await assignTeamToProject(projectId, {
        actorId: assignTeamValues.actorId.trim(),
        allocationPercent: Number(assignTeamValues.allocationPercent),
        ...(assignTeamValues.endDate ? { endDate: `${assignTeamValues.endDate}T00:00:00.000Z` } : {}),
        ...(assignTeamValues.note.trim() ? { note: assignTeamValues.note.trim() } : {}),
        staffingRole: assignTeamValues.staffingRole.trim(),
        startDate: `${assignTeamValues.startDate}T00:00:00.000Z`,
        teamOrgUnitId: selectedTeam.orgUnit.id,
      });
      setAssignTeamResult(response);
      setActionSuccess(`Assigned team ${response.teamName}. Created ${response.createdCount}, skipped ${response.skippedDuplicateCount}.`);
      setAssignTeamValues({ actorId: '', allocationPercent: '100', endDate: '', note: '', staffingRole: '', startDate: '', teamId: '' });
      setAssignTeamErrors({});
      await reload();
      const fresh = await listProjectPositions({ projectId });
      setPositions(fresh.positions);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Failed to assign team.');
    } finally {
      setIsAssigningTeam(false);
    }
  }

  return (
    <div data-testid="team-vendors-tab" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {actionError ? <ErrorState description={actionError} /> : null}
      {actionSuccess ? <div className="success-banner">{actionSuccess}</div> : null}

      {/* 1. Team Assignments (read-first, always expanded) */}
      <SectionCard title="Positions">
        {teamAssignmentsLoading ? <LoadingState label="Loading assignments..." variant="skeleton" skeletonType="detail" /> : null}
        {teamAssignmentsError ? <ErrorState description={teamAssignmentsError} /> : null}
        {!teamAssignmentsLoading && !teamAssignmentsError ? (
          positions.length === 0 ? (
            <EmptyState description="No assignments found for this project." title="No team members" action={{ label: 'Create position', href: `/staffing-desk/positions/new?projectId=${projectId}` }} />
          ) : (
            <Table
              variant="compact"
              columns={[
                { key: 'person', title: 'Person', getValue: (p) => {
                  if (p.activePersonName) return p.activePersonName;
                  if (p.activePersonId) return personNames.get(p.activePersonId) ?? p.activePersonId;
                  return '';
                }, render: (p) => {
                  if (!p.activePersonId) {
                    return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
                  }
                  const resolved = personNames.get(p.activePersonId);
                  const label = p.activePersonName ?? resolved ?? 'Resolving…';
                  return (
                    <Link to={`/people/${p.activePersonId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={label} size="xs" />
                      <span>{label}</span>
                    </Link>
                  );
                } },
                { key: 'role', title: 'Role', getValue: (p) => p.role, render: (p) => p.role },
                { key: 'alloc', title: 'Alloc %', align: 'right', getValue: (p) => p.activeAllocationPercent ?? 0, render: (p) => <span style={NUM}><Pct value={p.activeAllocationPercent ?? 0} /></span> },
                { key: 'from', title: 'From', getValue: (p) => p.activeValidFrom ?? p.startDate ?? '', render: (p) => {
                  const value = p.activeValidFrom ?? p.startDate;
                  return value ? formatDateShort(value) : '\u2014';
                } },
                { key: 'to', title: 'To', getValue: (p) => p.activeValidTo ?? p.endDate ?? '', render: (p) => {
                  const value = p.activeValidTo ?? p.endDate;
                  return value ? formatDateShort(value) : '\u2014';
                } },
                { key: 'status', title: 'Status', getValue: (p) => p.fillStatus, render: (p) => p.fillStatus },
              ] as Column<ProjectPosition>[]}
              rows={positions}
              getRowKey={(p) => p.id}
            />
          )
        ) : null}
      </SectionCard>

      {/* 2. Two-column grid: Staffing Timeline | Allocation by Person */}
      <div className="dashboard-main-grid">
        <SectionCard title="Staffing Timeline">
          {teamAssignmentsLoading ? <LoadingState label="Loading timeline..." variant="skeleton" skeletonType="detail" /> : (
            ganttAssignments.length === 0 ? (
              <EmptyState description="No assignments with date ranges to visualize." title="No timeline data" action={{ label: 'Create position', href: `/staffing-desk/positions/new?projectId=${projectId}` }} />
            ) : (
              <StaffingSwimLaneGantt assignments={ganttAssignments} />
            )
          )}
        </SectionCard>

        {dashboard && dashboard.allocationByPerson.length > 0 ? (
          <SectionCard title="Allocation by Person">
            <Table
              variant="compact"
              columns={[
                { key: 'person', title: 'Person', getValue: (i) => i.displayName, render: (i) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <Avatar name={i.displayName} size="xs" />
                    <span>{i.displayName}</span>
                  </span>
                ) },
                { key: 'alloc', title: 'Alloc %', align: 'right', getValue: (i) => i.allocationPercent, render: (i) => <span style={{ ...NUM, fontWeight: 600 }}><Pct value={i.allocationPercent} /></span> },
                { key: 'bar', title: 'Bar', width: 120, render: (i) => (
                  <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(i.allocationPercent, 100)}%`, borderRadius: 2, background: i.allocationPercent > 100 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }} />
                  </div>
                ) },
              ] as Column<typeof dashboard.allocationByPerson[number]>[]}
              rows={dashboard.allocationByPerson}
              getRowKey={(i) => i.personId}
              onRowClick={(i) => navigate(`/people/${i.personId}`)}
            />
          </SectionCard>
        ) : (
          <SectionCard title="Allocation by Person">
            <EmptyState description="No allocation data available." title="No data" />
          </SectionCard>
        )}
      </div>

      {/* 3. Plan vs Actual (collapsible, expanded by default) */}
      {rolePlanComparison && rolePlanComparison.rows.length > 0 ? (
        <SectionCard title={`Plan vs Actual (Fill Rate: ${rolePlanComparison.overallFillRate}%)`} collapsible>
          <RolePlanComparison data={rolePlanComparison} />
        </SectionCard>
      ) : null}

      {/* 4. Role Plan Builder (collapsible, defaultCollapsed) */}
      {canManageProject ? (
        <SectionCard title="Role Plan" collapsible defaultCollapsed>
          <RolePlanBuilder
            projectId={projectId}
            entries={rolePlanEntries}
            onUpdate={() => {
              void fetchRolePlan(projectId).then(setRolePlanEntries);
              void fetchRolePlanComparison(projectId).then(setRolePlanComparison);
            }}
          />
        </SectionCard>
      ) : null}

      {/* 5. Vendor Engagements (collapsible, defaultCollapsed) */}
      <SectionCard title={`Vendor Engagements (${vendorEngagements.length})`} collapsible defaultCollapsed>
        <VendorEngagementPanel engagements={vendorEngagements} />
      </SectionCard>

      {/* 6. Activity by Week (collapsible, defaultCollapsed) */}
      {dashboard && dashboard.evidenceByWeek.some((w) => w.totalHours > 0) ? (() => {
        const visibleWeeks = dashboard.evidenceByWeek.filter((w) => w.totalHours > 0);
        const maxH = Math.max(...dashboard.evidenceByWeek.map((wk) => wk.totalHours), 1);
        return (
          <SectionCard title="Activity by Week (12 wk)" collapsible defaultCollapsed>
            <Table
              variant="compact"
              columns={[
                { key: 'week', title: 'Week', getValue: (w) => w.weekStarting, render: (w) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(w.weekStarting)}</span> },
                { key: 'hours', title: 'Hours', align: 'right', getValue: (w) => w.totalHours, render: (w) => <span style={{ ...NUM, fontWeight: 600 }}>{w.totalHours}h</span> },
                { key: 'bar', title: 'Bar', width: 120, render: (w) => (
                  <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((w.totalHours / maxH) * 100)}%`, borderRadius: 2, background: 'var(--color-status-active)' }} />
                  </div>
                ) },
              ] as Column<typeof visibleWeeks[number]>[]}
              rows={visibleWeeks}
              getRowKey={(w) => w.weekStarting}
            />
          </SectionCard>
        );
      })() : null}

      {/* 7. Assign Team (collapsible, defaultCollapsed) */}
      {canManageProject ? (
        <SectionCard title="Assign Team To Project" collapsible defaultCollapsed>
          <p className="dictionary-editor__copy">Team expansion creates person-level assignments for staffing traceability.</p>
          {!tokenState.hasToken ? (
            <AuthTokenField hasToken={tokenState.hasToken} onClear={tokenState.clearToken} onSave={tokenState.saveToken} token={tokenState.token} />
          ) : null}
          {teamsLoading ? <LoadingState label="Loading teams..." variant="skeleton" skeletonType="detail" /> : null}
          {teamsError ? <ErrorState description={teamsError} /> : null}
          {!teamsLoading && !teamsError ? (
            teamOptions.length > 0 ? (
              <ProjectTeamAssignmentForm
                errors={assignTeamErrors}
                isSubmitting={isAssigningTeam}
                onChange={(field, value) => {
                  setAssignTeamValues((c) => ({ ...c, [field]: value }));
                  setAssignTeamErrors((c) => ({ ...c, [field]: undefined }));
                }}
                onSubmit={handleAssignTeam}
                teamOptions={teamOptions}
                values={assignTeamValues}
              />
            ) : (
              <EmptyState description="Only teams with an org-unit mapping can be expanded." title="No assignable teams" />
            )
          ) : null}

          {assignTeamResult ? (
            <div className="assignment-bulk-results" data-testid="assign-team-result">
              <div className="assignment-bulk-results__summary">
                <div><strong>Created:</strong> {assignTeamResult.createdCount}</div>
                <div><strong>Skipped:</strong> {assignTeamResult.skippedDuplicateCount}</div>
                <div><strong>Team:</strong> {assignTeamResult.teamName}</div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}

function validateAssignTeam(values: ProjectTeamAssignmentFormValues): Partial<Record<keyof ProjectTeamAssignmentFormValues, string>> {
  const errors: Partial<Record<keyof ProjectTeamAssignmentFormValues, string>> = {};
  if (!values.actorId.trim()) errors.actorId = 'Workflow actor is required.';
  if (!values.teamId) errors.teamId = 'Team selection is required.';
  if (!values.staffingRole.trim()) errors.staffingRole = 'Staffing role is required.';
  if (!values.startDate) errors.startDate = 'Start date is required.';
  if (!values.allocationPercent.trim()) {
    errors.allocationPercent = 'Allocation percent is required.';
  } else {
    const n = Number(values.allocationPercent);
    if (!Number.isFinite(n) || n <= 0 || n > 100) errors.allocationPercent = 'Must be between 1 and 100.';
  }
  if (values.startDate && values.endDate && values.endDate < values.startDate) errors.endDate = 'End date cannot be before start date.';
  return errors;
}
