import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
import { ProjectTeamAssignmentForm, ProjectTeamAssignmentFormValues } from '@/components/projects/ProjectTeamAssignmentForm';
import { formatDateShort } from '@/lib/format-date';
import type { ProjectDetails, AssignProjectTeamResponse } from '@/lib/api/project-registry';
import { assignTeamToProject } from '@/lib/api/project-registry';
import { fetchAssignments, type AssignmentDirectoryItem } from '@/lib/api/assignments';
import { Button, Table, type Column } from '@/components/ds';
import { StaffingRequestDrawer } from '@/components/staffing-requests/StaffingRequestDrawer';
import { fetchRolePlan, fetchRolePlanComparison, type RolePlanEntryDto, type RolePlanComparisonResult } from '@/lib/api/project-role-plan';
import { fetchTeams, type TeamSummary } from '@/lib/api/teams';

interface TeamTabProps {
  project: ProjectDetails;
  projectId: string;
  reload: () => Promise<void>;
}

export function TeamTab({ project, projectId, reload }: TeamTabProps): JSX.Element {
  const { principal } = useAuth();
  const canManageProject = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const tokenState = useStoredApiToken();

  const [teamAssignments, setTeamAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [teamAssignmentsLoading, setTeamAssignmentsLoading] = useState(true);
  const [teamAssignmentsError, setTeamAssignmentsError] = useState<string | null>(null);
  const [rolePlanEntries, setRolePlanEntries] = useState<RolePlanEntryDto[]>([]);
  const [rolePlanComparison, setRolePlanComparison] = useState<RolePlanComparisonResult | null>(null);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [requestDrawerOpen, setRequestDrawerOpen] = useState<boolean>(false);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [assignTeamResult, setAssignTeamResult] = useState<AssignProjectTeamResponse | null>(null);
  const [assignTeamValues, setAssignTeamValues] = useState<ProjectTeamAssignmentFormValues>({
    actorId: '', allocationPercent: '100', endDate: '', note: '', staffingRole: '', startDate: '', teamId: '',
  });
  const [assignTeamErrors, setAssignTeamErrors] = useState<Partial<Record<keyof ProjectTeamAssignmentFormValues, string>>>({});

  // Load assignments + role plan
  useEffect(() => {
    let active = true;
    setTeamAssignmentsLoading(true);

    void (async () => {
      const [assignmentResponse, planEntries] = await Promise.all([
        fetchAssignments({ projectId }),
        fetchRolePlan(projectId).catch(() => [] as RolePlanEntryDto[]),
      ]);
      if (!active) return;
      setTeamAssignments(assignmentResponse.items);
      setRolePlanEntries(planEntries);
      const comparison = await fetchRolePlanComparison(projectId).catch(() => null);
      if (!active) return;
      if (comparison) setRolePlanComparison(comparison);
    })()
      .catch((error: unknown) => { if (active) setTeamAssignmentsError(error instanceof Error ? error.message : 'Failed to load assignments.'); })
      .finally(() => { if (active) setTeamAssignmentsLoading(false); });

    return () => { active = false; };
  }, [projectId]);

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
      // Reload assignments
      const fresh = await fetchAssignments({ projectId });
      setTeamAssignments(fresh.items);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Failed to assign team.');
    } finally {
      setIsAssigningTeam(false);
    }
  }

  return (
    <>
      {actionError ? <ErrorState description={actionError} /> : null}
      {actionSuccess ? <div className="success-banner">{actionSuccess}</div> : null}

      {canManageProject ? (
        <SectionCard title="Role Plan" collapsible>
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

      {rolePlanComparison && rolePlanComparison.rows.length > 0 ? (
        <SectionCard title={`Plan vs Actual (Fill Rate: ${rolePlanComparison.overallFillRate}%)`} collapsible>
          <RolePlanComparison data={rolePlanComparison} />
        </SectionCard>
      ) : null}

      <SectionCard title="Team Assignments">
        {canManageProject ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
            <Button variant="primary" size="sm" onClick={() => setRequestDrawerOpen(true)}>
              + Request staffing
            </Button>
          </div>
        ) : null}
        <StaffingRequestDrawer
          open={requestDrawerOpen}
          onClose={() => setRequestDrawerOpen(false)}
          onSubmitted={() => { void reload(); }}
          initialValues={{ projectId }}
        />
        {teamAssignmentsLoading ? <LoadingState label="Loading assignments..." variant="skeleton" skeletonType="detail" /> : null}
        {teamAssignmentsError ? <ErrorState description={teamAssignmentsError} /> : null}
        {!teamAssignmentsLoading && !teamAssignmentsError ? (
          teamAssignments.length === 0 ? (
            <EmptyState description="No assignments found for this project." title="No team members" action={{ label: 'Create assignment', href: `/assignments/new?projectId=${projectId}` }} />
          ) : (
            <Table
              variant="compact"
              columns={[
                { key: 'person', title: 'Person', getValue: (a) => a.person.displayName, render: (a) => <Link to={`/people/${a.person.id}`}>{a.person.displayName}</Link> },
                { key: 'role', title: 'Role', getValue: (a) => a.staffingRole, render: (a) => a.staffingRole },
                { key: 'alloc', title: 'Alloc %', align: 'right', getValue: (a) => a.allocationPercent, render: (a) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{a.allocationPercent}%</span> },
                { key: 'from', title: 'From', getValue: (a) => a.startDate, render: (a) => formatDateShort(a.startDate) },
                { key: 'to', title: 'To', getValue: (a) => a.endDate ?? '', render: (a) => a.endDate ? formatDateShort(a.endDate) : '\u2014' },
                { key: 'status', title: 'Status', getValue: (a) => a.approvalState, render: (a) => a.approvalState },
              ] as Column<AssignmentDirectoryItem>[]}
              rows={teamAssignments}
              getRowKey={(a) => a.id}
            />
          )
        ) : null}
      </SectionCard>

      {canManageProject ? (
        <SectionCard title="Assign Team To Project" collapsible>
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
    </>
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
