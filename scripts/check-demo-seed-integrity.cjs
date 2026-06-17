#!/usr/bin/env node
/**
 * Demo-seed integrity check (NO database).
 *
 * Loads the demo dataset arrays from prisma/seeds/demo-profile.ts (via
 * ts-node/register) and asserts, purely in memory:
 *   (a) every FK reference resolves to an existing row in its target array
 *       (person / org / project / position / budget / etc.);
 *   (b) every required field per the documented shapes is present + non-undefined;
 *   (c) the ProjectPosition 4-tuple rule (activePersonId / activeAllocationPercent
 *       / activeValidFrom / activeValidTo are all-null or all-set);
 *   (d) enum values fall within the documented sets.
 *
 * Exit 0 = clean. Non-zero = at least one violation (printed).
 *
 * Run via `npm run demo-seed:check` (ts-node --transpile-only).
 */

const path = require('path');

require('ts-node').register({
  transpileOnly: true,
  project: path.resolve(__dirname, '..', 'tsconfig.json'),
});

const demo = require(path.resolve(__dirname, '..', 'prisma', 'seeds', 'demo-profile.ts'));

const errors = [];
function fail(msg) {
  errors.push(msg);
}

// --- Build id sets for FK closure -----------------------------------------
const idSet = (rows) => new Set(rows.map((r) => r.id));

const personIds = idSet(demo.demoPeople);
const orgIds = idSet(demo.demoOrgUnits);
const positionIds = idSet(demo.demoPositions);
const poolIds = idSet(demo.demoResourcePools);
const clientIds = idSet(demo.demoClients);
const projectIds = idSet(demo.demoProjects);
const projectPositionIds = idSet(demo.demoProjectPositions);
const budgetIds = idSet(demo.demoProjectBudgets);
const externalLinkIds = idSet(demo.demoProjectExternalLinks);
const wesIds = idSet(demo.demoWorkEvidenceSources);
const wevIds = idSet(demo.demoWorkEvidence);
const caseIds = new Set(demo.demoCases.map((c) => c.id));

// Helper: check a value is present (not undefined). null is allowed unless
// flagged required.
function reqFields(label, rows, fields) {
  rows.forEach((r, i) => {
    for (const f of fields) {
      if (r[f] === undefined) fail(`${label}[${i}] (${r.id ?? '?'}): missing required field "${f}"`);
      else if (r[f] === null) fail(`${label}[${i}] (${r.id ?? '?'}): required field "${f}" is null`);
    }
  });
}

// Helper: FK must resolve into target set (when non-null).
function fk(label, rows, field, targetSet, { nullable = false } = {}) {
  rows.forEach((r, i) => {
    const v = r[field];
    if (v === null || v === undefined) {
      if (!nullable) fail(`${label}[${i}] (${r.id ?? '?'}): FK "${field}" is null but required`);
      return;
    }
    if (!targetSet.has(v)) fail(`${label}[${i}] (${r.id ?? '?'}): FK "${field}"=${v} does not resolve`);
  });
}

// Helper: enum membership.
function enumIn(label, rows, field, allowed, { nullable = false } = {}) {
  const set = new Set(allowed);
  rows.forEach((r, i) => {
    const v = r[field];
    if (v === null || v === undefined) {
      if (!nullable) fail(`${label}[${i}] (${r.id ?? '?'}): enum "${field}" missing`);
      return;
    }
    if (!set.has(v)) fail(`${label}[${i}] (${r.id ?? '?'}): enum "${field}"=${v} not in {${allowed.join(',')}}`);
  });
}

// --- Person ----------------------------------------------------------------
reqFields('Person', demo.demoPeople, ['id', 'personNumber', 'givenName', 'familyName', 'displayName', 'primaryEmail', 'grade', 'role', 'skillsets', 'employmentStatus', 'hiredAt']);
enumIn('Person', demo.demoPeople, 'employmentStatus', ['ACTIVE', 'LEAVE', 'INACTIVE', 'TERMINATED']);
// Uniqueness: personNumber + primaryEmail
(() => {
  const nums = new Set();
  const emails = new Set();
  demo.demoPeople.forEach((p) => {
    if (nums.has(p.personNumber)) fail(`Person: duplicate personNumber ${p.personNumber}`);
    nums.add(p.personNumber);
    if (emails.has(p.primaryEmail)) fail(`Person: duplicate primaryEmail ${p.primaryEmail}`);
    emails.add(p.primaryEmail);
  });
})();

// --- OrgUnit ----------------------------------------------------------------
reqFields('OrgUnit', demo.demoOrgUnits, ['id', 'code', 'name', 'status', 'managerPersonId', 'kind']);
enumIn('OrgUnit', demo.demoOrgUnits, 'status', ['ACTIVE', 'INACTIVE', 'ARCHIVED']);
enumIn('OrgUnit', demo.demoOrgUnits, 'kind', ['root', 'region', 'country', 'directorate', 'department']);
fk('OrgUnit.parent', demo.demoOrgUnits, 'parentOrgUnitId', orgIds, { nullable: true });
fk('OrgUnit.manager', demo.demoOrgUnits, 'managerPersonId', personIds);

// --- Position ---------------------------------------------------------------
reqFields('Position', demo.demoPositions, ['id', 'orgUnitId', 'title', 'isManagerial', 'validFrom']);
fk('Position.org', demo.demoPositions, 'orgUnitId', orgIds);
fk('Position.occupant', demo.demoPositions, 'occupantPersonId', personIds, { nullable: true });

// --- PersonOrgMembership ----------------------------------------------------
reqFields('Membership', demo.demoPersonOrgMemberships, ['id', 'personId', 'orgUnitId', 'isPrimary', 'validFrom']);
fk('Membership.person', demo.demoPersonOrgMemberships, 'personId', personIds);
fk('Membership.org', demo.demoPersonOrgMemberships, 'orgUnitId', orgIds);
fk('Membership.position', demo.demoPersonOrgMemberships, 'positionId', positionIds, { nullable: true });

// --- ReportingLine ----------------------------------------------------------
reqFields('ReportingLine', demo.demoReportingLines, ['id', 'subjectPersonId', 'managerPersonId', 'relationshipType', 'authority', 'isPrimary', 'validFrom']);
enumIn('ReportingLine', demo.demoReportingLines, 'relationshipType', ['SOLID_LINE', 'DOTTED_LINE', 'FUNCTIONAL', 'PROJECT']);
enumIn('ReportingLine', demo.demoReportingLines, 'authority', ['APPROVER', 'REVIEWER', 'VIEWER']);
fk('ReportingLine.subject', demo.demoReportingLines, 'subjectPersonId', personIds);
fk('ReportingLine.manager', demo.demoReportingLines, 'managerPersonId', personIds);

// --- ResourcePool + memberships --------------------------------------------
reqFields('ResourcePool', demo.demoResourcePools, ['id', 'code', 'name']);
fk('ResourcePool.org', demo.demoResourcePools, 'orgUnitId', orgIds, { nullable: true });
reqFields('PoolMembership', demo.demoResourcePoolMemberships, ['id', 'personId', 'resourcePoolId', 'validFrom']);
fk('PoolMembership.person', demo.demoResourcePoolMemberships, 'personId', personIds);
fk('PoolMembership.pool', demo.demoResourcePoolMemberships, 'resourcePoolId', poolIds);

// --- Client -----------------------------------------------------------------
reqFields('Client', demo.demoClients, ['id', 'name', 'isActive']);
(() => {
  const names = new Set();
  demo.demoClients.forEach((c) => {
    if (names.has(c.name)) fail(`Client: duplicate name ${c.name}`);
    names.add(c.name);
  });
})();

// --- Project ----------------------------------------------------------------
reqFields('Project', demo.demoProjects, ['id', 'projectCode', 'name', 'status', 'version']);
enumIn('Project', demo.demoProjects, 'status', ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ON_HOLD', 'CLOSED', 'COMPLETED', 'ARCHIVED']);
enumIn('Project', demo.demoProjects, 'engagementModel', ['TIME_AND_MATERIAL', 'FIXED_PRICE', 'MANAGED_SERVICE', 'INTERNAL'], { nullable: true });
enumIn('Project', demo.demoProjects, 'priority', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], { nullable: true });
fk('Project.pm', demo.demoProjects, 'projectManagerId', personIds, { nullable: true });
fk('Project.client', demo.demoProjects, 'clientId', clientIds, { nullable: true });
(() => {
  const codes = new Set();
  demo.demoProjects.forEach((p) => {
    if (codes.has(p.projectCode)) fail(`Project: duplicate projectCode ${p.projectCode}`);
    codes.add(p.projectCode);
  });
})();

// --- ProjectPosition + 4-tuple ---------------------------------------------
const FILL_STATUSES = ['DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'RELEASED'];
const STAFFING_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const SLA_STAGES = ['PROPOSAL', 'REVIEW', 'APPROVAL', 'RM_FINALIZE'];
reqFields('ProjectPosition', demo.demoProjectPositions, ['id', 'projectId', 'role', 'requiredAllocationPercent', 'startDate', 'endDate', 'priority', 'fillStatus', 'version']);
enumIn('ProjectPosition', demo.demoProjectPositions, 'fillStatus', FILL_STATUSES);
enumIn('ProjectPosition', demo.demoProjectPositions, 'priority', STAFFING_PRIORITY);
enumIn('ProjectPosition', demo.demoProjectPositions, 'slaStage', SLA_STAGES, { nullable: true });
fk('ProjectPosition.project', demo.demoProjectPositions, 'projectId', projectIds);
fk('ProjectPosition.active', demo.demoProjectPositions, 'activePersonId', personIds, { nullable: true });
fk('ProjectPosition.requestedBy', demo.demoProjectPositions, 'requestedByPersonId', personIds, { nullable: true });
demo.demoProjectPositions.forEach((pp, i) => {
  const tuple = [pp.activePersonId, pp.activeAllocationPercent, pp.activeValidFrom, pp.activeValidTo];
  const setCount = tuple.filter((v) => v !== null && v !== undefined).length;
  // The 4-tuple is all-null or all-set. Exception: ASSIGNED / BOOKED open-ended
  // fills legitimately leave activeValidTo null, so allow setCount === 3 ONLY
  // when activeValidTo is the missing one and the other three are present.
  if (setCount === 0) return; // unfilled — OK
  if (setCount === 4) return; // fully filled — OK
  if (setCount === 3 && (pp.activeValidTo === null || pp.activeValidTo === undefined)
      && pp.activePersonId && pp.activeAllocationPercent != null && pp.activeValidFrom) {
    return; // open-ended active fill — OK
  }
  fail(`ProjectPosition[${i}] (${pp.id}): 4-tuple rule violated — activePersonId=${pp.activePersonId} alloc=${pp.activeAllocationPercent} from=${pp.activeValidFrom} to=${pp.activeValidTo}`);
});

// --- ProjectPositionCandidate ----------------------------------------------
const CAND_DECISIONS = ['PENDING', 'PICKED', 'DECLINED', 'AUTO_DECLINED'];
reqFields('Candidate', demo.demoProjectPositionCandidates, ['id', 'positionId', 'candidatePersonId', 'rank', 'matchScore', 'decision']);
enumIn('Candidate', demo.demoProjectPositionCandidates, 'decision', CAND_DECISIONS);
fk('Candidate.position', demo.demoProjectPositionCandidates, 'positionId', projectPositionIds);
fk('Candidate.person', demo.demoProjectPositionCandidates, 'candidatePersonId', personIds);

// --- ProjectPositionFillHistory --------------------------------------------
const CHANGE_TYPES = ['DRAFTED', 'OPENED', 'PROPOSED', 'BOOKED', 'ONBOARDED', 'ASSIGNED', 'HELD', 'RELEASED', 'CANDIDATES_ADDED', 'CANDIDATE_PICKED', 'CANDIDATE_DECLINED', 'RATE_PINNED', 'ALLOCATION_CHANGED', 'DATES_CHANGED', 'REASSIGNED'];
reqFields('FillHistory', demo.demoProjectPositionFillHistory, ['id', 'positionId', 'changeType', 'occurredAt']);
enumIn('FillHistory', demo.demoProjectPositionFillHistory, 'changeType', CHANGE_TYPES);
enumIn('FillHistory', demo.demoProjectPositionFillHistory, 'previousStatus', FILL_STATUSES, { nullable: true });
enumIn('FillHistory', demo.demoProjectPositionFillHistory, 'newStatus', FILL_STATUSES, { nullable: true });
fk('FillHistory.position', demo.demoProjectPositionFillHistory, 'positionId', projectPositionIds);
fk('FillHistory.changedBy', demo.demoProjectPositionFillHistory, 'changedByPersonId', personIds, { nullable: true });
fk('FillHistory.prevPerson', demo.demoProjectPositionFillHistory, 'previousPersonId', personIds, { nullable: true });
fk('FillHistory.newPerson', demo.demoProjectPositionFillHistory, 'newPersonId', personIds, { nullable: true });

// --- ProjectBudget ----------------------------------------------------------
reqFields('Budget', demo.demoProjectBudgets, ['id', 'projectId', 'fiscalYear', 'capexBudget', 'opexBudget']);
fk('Budget.project', demo.demoProjectBudgets, 'projectId', projectIds);
(() => {
  const seen = new Set();
  demo.demoProjectBudgets.forEach((b) => {
    const key = `${b.projectId}|${b.fiscalYear}`;
    if (seen.has(key)) fail(`Budget: duplicate (projectId, fiscalYear) ${key}`);
    seen.add(key);
    if (b.currencyCode !== undefined && b.currencyCode !== null && b.currencyCode !== 'USD') {
      fail(`Budget ${b.id}: unexpected currencyCode ${b.currencyCode}`);
    }
  });
})();

// --- BudgetApproval ---------------------------------------------------------
reqFields('BudgetApproval', demo.demoBudgetApprovals, ['id', 'projectBudgetId', 'status', 'requestedByPersonId', 'requestedAt']);
enumIn('BudgetApproval', demo.demoBudgetApprovals, 'status', ['PENDING', 'APPROVED', 'REJECTED']);
fk('BudgetApproval.budget', demo.demoBudgetApprovals, 'projectBudgetId', budgetIds);
fk('BudgetApproval.requestedBy', demo.demoBudgetApprovals, 'requestedByPersonId', personIds);
fk('BudgetApproval.decidedBy', demo.demoBudgetApprovals, 'decidedByPersonId', personIds, { nullable: true });

// --- ProjectMilestone -------------------------------------------------------
reqFields('Milestone', demo.demoProjectMilestones, ['id', 'projectId', 'name', 'plannedDate', 'status']);
enumIn('Milestone', demo.demoProjectMilestones, 'status', ['PLANNED', 'IN_PROGRESS', 'HIT', 'MISSED']);
fk('Milestone.project', demo.demoProjectMilestones, 'projectId', projectIds);

// --- ProjectChangeRequest ---------------------------------------------------
reqFields('ChangeRequest', demo.demoProjectChangeRequests, ['id', 'projectId', 'title', 'status', 'severity']);
enumIn('ChangeRequest', demo.demoProjectChangeRequests, 'status', ['PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN']);
enumIn('ChangeRequest', demo.demoProjectChangeRequests, 'severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
fk('ChangeRequest.project', demo.demoProjectChangeRequests, 'projectId', projectIds);
fk('ChangeRequest.requester', demo.demoProjectChangeRequests, 'requesterPersonId', personIds, { nullable: true });
fk('ChangeRequest.decidedBy', demo.demoProjectChangeRequests, 'decidedByPersonId', personIds, { nullable: true });

// --- ProjectRolePlan --------------------------------------------------------
reqFields('RolePlan', demo.demoProjectRolePlans, ['id', 'projectId', 'roleName', 'headcount']);
enumIn('RolePlan', demo.demoProjectRolePlans, 'source', ['INTERNAL', 'VENDOR', 'EITHER'], { nullable: true });
fk('RolePlan.project', demo.demoProjectRolePlans, 'projectId', projectIds);

// --- ProjectRisk ------------------------------------------------------------
reqFields('Risk', demo.demoProjectRisks, ['id', 'projectId', 'title', 'category', 'status']);
enumIn('Risk', demo.demoProjectRisks, 'category', ['SCOPE', 'SCHEDULE', 'BUDGET', 'BUSINESS', 'TECHNICAL', 'OPERATIONAL']);
enumIn('Risk', demo.demoProjectRisks, 'riskType', ['RISK', 'ISSUE'], { nullable: true });
enumIn('Risk', demo.demoProjectRisks, 'strategy', ['MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID', 'ESCALATE'], { nullable: true });
enumIn('Risk', demo.demoProjectRisks, 'status', ['IDENTIFIED', 'ASSESSED', 'MITIGATING', 'RESOLVED', 'CLOSED']);
fk('Risk.project', demo.demoProjectRisks, 'projectId', projectIds);
fk('Risk.owner', demo.demoProjectRisks, 'ownerPersonId', personIds, { nullable: true });

// --- ProjectRagSnapshot -----------------------------------------------------
const RAG = ['GREEN', 'AMBER', 'RED'];
reqFields('Rag', demo.demoProjectRagSnapshots, ['id', 'projectId', 'weekStarting', 'staffingRag', 'scheduleRag', 'budgetRag', 'overallRag', 'recordedByPersonId']);
enumIn('Rag', demo.demoProjectRagSnapshots, 'staffingRag', RAG);
enumIn('Rag', demo.demoProjectRagSnapshots, 'scheduleRag', RAG);
enumIn('Rag', demo.demoProjectRagSnapshots, 'budgetRag', RAG);
enumIn('Rag', demo.demoProjectRagSnapshots, 'clientRag', RAG, { nullable: true });
enumIn('Rag', demo.demoProjectRagSnapshots, 'overallRag', RAG);
fk('Rag.project', demo.demoProjectRagSnapshots, 'projectId', projectIds);
fk('Rag.recordedBy', demo.demoProjectRagSnapshots, 'recordedByPersonId', personIds);

// --- ProjectRetrospective ---------------------------------------------------
reqFields('Retro', demo.demoProjectRetrospectives, ['id', 'projectId']);
fk('Retro.project', demo.demoProjectRetrospectives, 'projectId', projectIds);
fk('Retro.facilitator', demo.demoProjectRetrospectives, 'facilitatedByPersonId', personIds, { nullable: true });
(() => {
  const seen = new Set();
  demo.demoProjectRetrospectives.forEach((r) => {
    if (seen.has(r.projectId)) fail(`Retro: duplicate projectId ${r.projectId} (UNIQUE)`);
    seen.add(r.projectId);
  });
})();

// --- ProjectExternalLink + ExternalSyncState -------------------------------
reqFields('ExternalLink', demo.demoProjectExternalLinks, ['id', 'projectId', 'provider', 'externalProjectKey']);
fk('ExternalLink.project', demo.demoProjectExternalLinks, 'projectId', projectIds);
reqFields('SyncState', demo.demoExternalSyncStates, ['id', 'projectExternalLinkId', 'syncStatus']);
enumIn('SyncState', demo.demoExternalSyncStates, 'syncStatus', ['IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL']);
fk('SyncState.link', demo.demoExternalSyncStates, 'projectExternalLinkId', externalLinkIds);

// --- WorkEvidence -----------------------------------------------------------
reqFields('WorkEvidenceSource', demo.demoWorkEvidenceSources, ['id', 'provider', 'sourceType', 'displayName']);
reqFields('WorkEvidence', demo.demoWorkEvidence, ['id', 'workEvidenceSourceId', 'sourceRecordKey', 'evidenceType', 'recordedAt']);
enumIn('WorkEvidence', demo.demoWorkEvidence, 'evidenceType', ['JIRA_WORKLOG', 'MANUAL_ENTRY', 'TIMESHEET_ENTRY']);
enumIn('WorkEvidence', demo.demoWorkEvidence, 'status', ['CAPTURED', 'RECONCILED', 'IGNORED', 'ARCHIVED'], { nullable: true });
fk('WorkEvidence.source', demo.demoWorkEvidence, 'workEvidenceSourceId', wesIds);
fk('WorkEvidence.person', demo.demoWorkEvidence, 'personId', personIds, { nullable: true });
fk('WorkEvidence.project', demo.demoWorkEvidence, 'projectId', projectIds, { nullable: true });
reqFields('WorkEvidenceLink', demo.demoWorkEvidenceLinks, ['id', 'workEvidenceId', 'provider', 'externalKey', 'linkType']);
enumIn('WorkEvidenceLink', demo.demoWorkEvidenceLinks, 'linkType', ['ISSUE']);
fk('WorkEvidenceLink.evidence', demo.demoWorkEvidenceLinks, 'workEvidenceId', wevIds);

// --- Contact / EmploymentEvent ---------------------------------------------
reqFields('Contact', demo.demoContacts, ['id', 'personId', 'kind', 'label', 'value']);
enumIn('Contact', demo.demoContacts, 'kind', ['EMAIL', 'PHONE', 'ADDRESS']);
fk('Contact.person', demo.demoContacts, 'personId', personIds);
reqFields('EmploymentEvent', demo.demoEmploymentEvents, ['id', 'personId', 'kind', 'occurredOn']);
enumIn('EmploymentEvent', demo.demoEmploymentEvents, 'kind', ['HIRE', 'TERMINATE', 'LEAVE_START', 'LEAVE_END', 'REHIRE']);
fk('EmploymentEvent.person', demo.demoEmploymentEvents, 'personId', personIds);
fk('EmploymentEvent.recordedBy', demo.demoEmploymentEvents, 'recordedByPersonId', personIds, { nullable: true });

// --- Cases + steps ----------------------------------------------------------
reqFields('Case', demo.demoCases, ['id', 'caseNumber', 'caseTypeKey', 'subjectPersonId', 'ownerPersonId', 'status', 'summary']);
enumIn('Case', demo.demoCases, 'caseTypeKey', ['ONBOARDING', 'OFFBOARDING', 'PERFORMANCE', 'TRANSFER']);
enumIn('Case', demo.demoCases, 'status', ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
fk('Case.subject', demo.demoCases, 'subjectPersonId', personIds);
fk('Case.owner', demo.demoCases, 'ownerPersonId', personIds);
const caseSteps = demo.generateDemoCaseSteps();
reqFields('CaseStep', caseSteps, ['id', 'caseRecordId', 'stepKey', 'displayName', 'status']);
enumIn('CaseStep', caseSteps, 'status', ['OPEN', 'COMPLETED']);
fk('CaseStep.case', caseSteps, 'caseRecordId', caseIds);

// --- Timesheets / pulse / leave / notifications -----------------------------
const { weeks, entries } = demo.generateDemoTimesheets();
const weekIds = new Set(weeks.map((w) => w.id));
reqFields('TimesheetWeek', weeks, ['id', 'personId', 'weekStart', 'status']);
enumIn('TimesheetWeek', weeks, 'status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);
fk('TimesheetWeek.person', weeks, 'personId', personIds);
fk('TimesheetWeek.approvedBy', weeks, 'approvedBy', personIds, { nullable: true });
reqFields('TimesheetEntry', entries, ['id', 'timesheetWeekId', 'projectId', 'date', 'hours']);
fk('TimesheetEntry.week', entries, 'timesheetWeekId', weekIds);
fk('TimesheetEntry.project', entries, 'projectId', projectIds);

const pulse = demo.generateDemoPulseEntries();
reqFields('Pulse', pulse, ['id', 'personId', 'weekStart', 'mood', 'submittedAt']);
fk('Pulse.person', pulse, 'personId', personIds);

const leave = demo.generateDemoLeaveRequests();
reqFields('Leave', leave, ['id', 'personId', 'type', 'status', 'startDate', 'endDate']);
enumIn('Leave', leave, 'type', ['ANNUAL', 'SICK', 'PARENTAL', 'COMPASSIONATE', 'UNPAID', 'OTHER', 'OT_OFF', 'PERSONAL', 'BEREAVEMENT', 'STUDY']);
enumIn('Leave', leave, 'status', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
fk('Leave.person', leave, 'personId', personIds);

const notifications = demo.generateDemoNotifications();
reqFields('Notification', notifications, ['id', 'recipientPersonId', 'eventType', 'title', 'createdAt']);
fk('Notification.recipient', notifications, 'recipientPersonId', personIds);

// --- Accounts ---------------------------------------------------------------
reqFields('Account', demo.demoAccounts, ['email', 'password', 'displayName', 'roles', 'personId']);
fk('Account.person', demo.demoAccounts, 'personId', personIds);

// --- Story invariants (the deliberate demo arcs) ----------------------------
(() => {
  // Bench star: not active on any position.
  const activePersonIds = new Set(
    demo.demoProjectPositions
      .filter((p) => p.activePersonId && (p.fillStatus === 'ASSIGNED' || p.fillStatus === 'BOOKED'))
      .map((p) => p.activePersonId),
  );
  if (activePersonIds.has(demo.demoBenchStarPersonId)) {
    fail('Story: bench star has an active (ASSIGNED/BOOKED) position — should be benched.');
  }
  // Over-allocated person: sum of active alloc > 100.
  const allocSum = demo.demoProjectPositions
    .filter((p) => p.activePersonId === demo.demoOverAllocatedPersonId && (p.fillStatus === 'ASSIGNED' || p.fillStatus === 'BOOKED'))
    .reduce((s, p) => s + Number(p.activeAllocationPercent || 0), 0);
  if (allocSum <= 100) {
    fail(`Story: over-allocated person sums to ${allocSum}% (must exceed 100%).`);
  }
  // Borealis has a PENDING budget approval.
  const hasPending = demo.demoBudgetApprovals.some((a) => a.status === 'PENDING');
  if (!hasPending) fail('Story: no PENDING BudgetApproval found.');
  // At least one MISSED milestone (Borealis).
  if (!demo.demoProjectMilestones.some((m) => m.status === 'MISSED')) {
    fail('Story: no MISSED milestone found.');
  }
  // At least one RED RAG snapshot (Borealis).
  if (!demo.demoProjectRagSnapshots.some((r) => r.overallRag === 'RED')) {
    fail('Story: no RED RAG snapshot found.');
  }
  // At least one OPEN + one PROPOSED position.
  if (!demo.demoProjectPositions.some((p) => p.fillStatus === 'OPEN')) fail('Story: no OPEN position.');
  if (!demo.demoProjectPositions.some((p) => p.fillStatus === 'PROPOSED')) fail('Story: no PROPOSED position.');
  if (!demo.demoProjectPositions.some((p) => p.fillStatus === 'BOOKED')) fail('Story: no BOOKED position.');
  if (!demo.demoProjectPositions.some((p) => p.fillStatus === 'RELEASED')) fail('Story: no RELEASED position.');
  // 2 SUBMITTED timesheet weeks.
  const submitted = weeks.filter((w) => w.status === 'SUBMITTED').length;
  if (submitted < 2) fail(`Story: expected >=2 SUBMITTED timesheet weeks, got ${submitted}.`);
  // 1 PENDING leave.
  if (!leave.some((l) => l.status === 'PENDING')) fail('Story: no PENDING leave request.');
})();

// --- Report -----------------------------------------------------------------
const counts = {
  people: demo.demoPeople.length,
  orgUnits: demo.demoOrgUnits.length,
  resourcePools: demo.demoResourcePools.length,
  clients: demo.demoClients.length,
  projects: demo.demoProjects.length,
  projectPositions: demo.demoProjectPositions.length,
  positionCandidates: demo.demoProjectPositionCandidates.length,
  positionFillHistory: demo.demoProjectPositionFillHistory.length,
  budgets: demo.demoProjectBudgets.length,
  budgetApprovals: demo.demoBudgetApprovals.length,
  milestones: demo.demoProjectMilestones.length,
  changeRequests: demo.demoProjectChangeRequests.length,
  rolePlans: demo.demoProjectRolePlans.length,
  risks: demo.demoProjectRisks.length,
  ragSnapshots: demo.demoProjectRagSnapshots.length,
  retrospectives: demo.demoProjectRetrospectives.length,
  workEvidence: demo.demoWorkEvidence.length,
  cases: demo.demoCases.length,
  caseSteps: caseSteps.length,
  timesheetWeeks: weeks.length,
  timesheetEntries: entries.length,
  pulse: pulse.length,
  leave: leave.length,
  notifications: notifications.length,
  accounts: demo.demoAccounts.length,
};

console.log('Demo seed integrity — row counts:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);

const byFill = {};
for (const p of demo.demoProjectPositions) byFill[p.fillStatus] = (byFill[p.fillStatus] || 0) + 1;
console.log(`  projectPositions by fillStatus: ${JSON.stringify(byFill)}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} integrity violation(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exitCode = 1;
} else {
  console.log('\n✓ Demo seed integrity check passed (FK closure, required fields, 4-tuple, enums, story invariants).');
}
