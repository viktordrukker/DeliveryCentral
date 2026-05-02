import * as bcrypt from 'bcrypt';

import { PrismaClient } from '@prisma/client';

// `prisma/seeds/demo-dataset.ts` is intentionally NOT imported here — the
// `demo` seed profile was retired with the DM-R-11 closure, but the file
// itself is still imported by ~26 in-memory test repositories and lives on
// for that purpose only.

import {
  generateItCompanyCaseSteps,
  generateItCompanyLeaveRequests,
  generateItCompanyNotifications,
  generateItCompanyPulseEntries,
  generateItCompanyTimesheets,
  itCompanyAccounts,
  itCompanyAssignmentApprovals,
  itCompanyAssignmentHistory,
  itCompanyAssignments,
  itCompanyCases,
  itCompanyDatasetSummary,
  itCompanyExternalSyncStates,
  itCompanyOrgUnits,
  itCompanyPeople,
  itCompanyPersonOrgMemberships,
  itCompanyPersonSkillAssignments,
  itCompanyPositions,
  itCompanyProjectBudgets,
  itCompanyProjectChangeRequests,
  itCompanyProjectExternalLinks,
  itCompanyProjectMilestones,
  itCompanyProjectRagSnapshots,
  itCompanyProjectRetrospectives,
  itCompanyProjectRisks,
  itCompanyProjectRolePlans,
  itCompanyProjects,
  itCompanyReportingLines,
  itCompanyResourcePoolMemberships,
  itCompanyResourcePools,
  itCompanyStaffingRequestFulfilments,
  itCompanyStaffingRequests,
  itCompanyWorkEvidence,
  itCompanyWorkEvidenceLinks,
  itCompanyWorkEvidenceSources,
} from './seeds/it-company-profile';

const prisma = new PrismaClient();
const prismaSeed = prisma as any;

interface SeedDataset {
  activityEvents?: unknown[];
  assignmentApprovals: unknown[];
  assignmentHistory: unknown[];
  assignments: unknown[];
  externalSyncStates: unknown[];
  orgUnits: Array<Record<string, unknown>>;
  people: unknown[];
  personOrgMemberships: unknown[];
  positions: unknown[];
  projectExternalLinks: unknown[];
  projects: unknown[];
  reportingLines: unknown[];
  resourcePoolMemberships: unknown[];
  resourcePools: unknown[];
  summary: unknown;
  workEvidence: unknown[];
  workEvidenceLinks: unknown[];
  workEvidenceSources: unknown[];
}


// ---------------------------------------------------------------------------
// Metadata Dictionaries + Entries
// ---------------------------------------------------------------------------
async function seedMetadata(): Promise<void> {
  // Resolve a valid org unit for scoped dictionaries — pick the first one that exists
  const firstOrgUnit = await prisma.orgUnit.findFirst({ select: { id: true } });
  const fallbackOrgUnitId = firstOrgUnit?.id ?? null;

  const dictionaries = [
    // From demo-dataset
    {
      id: '42222222-0000-0000-0000-000000000001',
      dictionaryKey: 'project-types',
      displayName: 'Project Types',
      description: 'Classification for internal and delivery project types.',
      entityType: 'Project',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000002',
      dictionaryKey: 'staffing-bands',
      displayName: 'Staffing Bands',
      description: 'Resource banding model for assignment requests in Platform Directorate.',
      entityType: 'ProjectAssignment',
      isSystemManaged: false,
      scopeOrgUnitId: fallbackOrgUnitId,
    },
    {
      id: '42222222-0000-0000-0000-000000000003',
      dictionaryKey: 'case-intake-channel',
      displayName: 'Case Intake Channels',
      description: 'Controlled vocabulary for onboarding case intake source.',
      entityType: 'Case',
      isSystemManaged: true,
    },
    // Person dictionaries from in-memory factory
    {
      id: '42222222-0000-0000-0000-000000000101',
      dictionaryKey: 'grade',
      displayName: 'Employee Grades',
      description: 'Metadata-backed employee grades.',
      entityType: 'Person',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000102',
      dictionaryKey: 'role',
      displayName: 'Employee Roles',
      description: 'Metadata-backed employee roles.',
      entityType: 'Person',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000103',
      dictionaryKey: 'skillset',
      displayName: 'Employee Skillsets',
      description: 'Metadata-backed employee skillsets.',
      entityType: 'Person',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000201',
      dictionaryKey: 'timesheet-rejection-reasons',
      displayName: 'Timesheet Rejection Reasons',
      description: 'Reasons an approver may cite when rejecting a submitted timesheet.',
      entityType: 'TimesheetWeek',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000301',
      dictionaryKey: 'assignment-rejection-reasons',
      displayName: 'Assignment Rejection Reasons',
      description: 'Reason codes a PM/DM/Director can cite when rejecting a proposal slate.',
      entityType: 'ProjectAssignment',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000302',
      dictionaryKey: 'case-kind-assignment-escalation',
      displayName: 'Assignment Escalation Case Kinds',
      description: 'Case kinds offered when escalating an assignment issue (PM-initiated).',
      entityType: 'CaseRecord',
      isSystemManaged: false,
    },
    {
      id: '42222222-0000-0000-0000-000000000401',
      dictionaryKey: 'staffing-roles',
      displayName: 'Staffing Roles',
      description: 'Normalized role taxonomy used on StaffingRequest and ProjectAssignment.staffingRole.',
      entityType: 'StaffingRequest',
      isSystemManaged: false,
    },
  ];

  for (const dict of dictionaries) {
    await prismaSeed.metadataDictionary.upsert({
      where: { id: dict.id },
      create: {
        id: dict.id,
        dictionaryKey: dict.dictionaryKey,
        displayName: dict.displayName,
        description: dict.description ?? null,
        entityType: dict.entityType,
        isSystemManaged: dict.isSystemManaged,
        scopeOrgUnitId: dict.scopeOrgUnitId ?? null,
      },
      update: { displayName: dict.displayName },
    });
  }

  const entries = [
    // Project types
    { id: '43333333-0000-0000-0000-000000000001', metadataDictionaryId: '42222222-0000-0000-0000-000000000001', entryKey: 'internal',        entryValue: 'INTERNAL',        displayName: 'Internal Initiative',    sortOrder: 1, isEnabled: true  },
    { id: '43333333-0000-0000-0000-000000000002', metadataDictionaryId: '42222222-0000-0000-0000-000000000001', entryKey: 'client-delivery',  entryValue: 'CLIENT_DELIVERY',  displayName: 'Client Delivery',        sortOrder: 2, isEnabled: true  },
    { id: '43333333-0000-0000-0000-000000000003', metadataDictionaryId: '42222222-0000-0000-0000-000000000001', entryKey: 'audit-only',       entryValue: 'AUDIT_ONLY',       displayName: 'Audit / Evidence Only',  sortOrder: 3, isEnabled: false },
    // Staffing bands
    { id: '43333333-0000-0000-0000-000000000004', metadataDictionaryId: '42222222-0000-0000-0000-000000000002', entryKey: 'band-3',           entryValue: 'BAND_3',           displayName: 'Band 3',                 sortOrder: 1, isEnabled: true  },
    { id: '43333333-0000-0000-0000-000000000005', metadataDictionaryId: '42222222-0000-0000-0000-000000000002', entryKey: 'band-4',           entryValue: 'BAND_4',           displayName: 'Band 4',                 sortOrder: 2, isEnabled: true  },
    // Case intake channels
    { id: '43333333-0000-0000-0000-000000000006', metadataDictionaryId: '42222222-0000-0000-0000-000000000003', entryKey: 'manager-request',  entryValue: 'MANAGER_REQUEST',  displayName: 'Manager Request',        sortOrder: 1, isEnabled: true  },
    { id: '43333333-0000-0000-0000-000000000007', metadataDictionaryId: '42222222-0000-0000-0000-000000000003', entryKey: 'hr-trigger',       entryValue: 'HR_TRIGGER',       displayName: 'HR Trigger',             sortOrder: 2, isEnabled: true  },
    // Grade entries
    { id: '43333333-0000-0000-0000-000000000101', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g7',  entryValue: 'G7',  displayName: 'G7 — Junior',            sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000102', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g8',  entryValue: 'G8',  displayName: 'G8 — Associate',          sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000103', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g9',  entryValue: 'G9',  displayName: 'G9 — Consultant',         sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000104', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g10', entryValue: 'G10', displayName: 'G10 — Senior Consultant', sortOrder: 4, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000105', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g11', entryValue: 'G11', displayName: 'G11 — Manager',           sortOrder: 5, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000106', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g12', entryValue: 'G12', displayName: 'G12 — Senior Manager',    sortOrder: 6, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000107', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g13', entryValue: 'G13', displayName: 'G13 — Director',          sortOrder: 7, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000108', metadataDictionaryId: '42222222-0000-0000-0000-000000000101', entryKey: 'g14', entryValue: 'G14', displayName: 'G14 — Partner',           sortOrder: 8, isEnabled: true },
    // Role entries
    { id: '43333333-0000-0000-0000-000000000201', metadataDictionaryId: '42222222-0000-0000-0000-000000000102', entryKey: 'engineer',   entryValue: 'ENGINEER',   displayName: 'Engineer',   sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000202', metadataDictionaryId: '42222222-0000-0000-0000-000000000102', entryKey: 'consultant', entryValue: 'CONSULTANT', displayName: 'Consultant', sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000203', metadataDictionaryId: '42222222-0000-0000-0000-000000000102', entryKey: 'manager',    entryValue: 'MANAGER',    displayName: 'Manager',    sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000204', metadataDictionaryId: '42222222-0000-0000-0000-000000000102', entryKey: 'director',   entryValue: 'DIRECTOR',   displayName: 'Director',   sortOrder: 4, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000205', metadataDictionaryId: '42222222-0000-0000-0000-000000000102', entryKey: 'analyst',    entryValue: 'ANALYST',    displayName: 'Analyst',    sortOrder: 5, isEnabled: true },
    // Skillset entries
    { id: '43333333-0000-0000-0000-000000000301', metadataDictionaryId: '42222222-0000-0000-0000-000000000103', entryKey: 'frontend', entryValue: 'FRONTEND', displayName: 'Frontend', sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000302', metadataDictionaryId: '42222222-0000-0000-0000-000000000103', entryKey: 'backend',  entryValue: 'BACKEND',  displayName: 'Backend',  sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000303', metadataDictionaryId: '42222222-0000-0000-0000-000000000103', entryKey: 'data',     entryValue: 'DATA',     displayName: 'Data',     sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000304', metadataDictionaryId: '42222222-0000-0000-0000-000000000103', entryKey: 'devops',   entryValue: 'DEVOPS',   displayName: 'DevOps',   sortOrder: 4, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000305', metadataDictionaryId: '42222222-0000-0000-0000-000000000103', entryKey: 'cloud',    entryValue: 'CLOUD',    displayName: 'Cloud',    sortOrder: 5, isEnabled: true },
    // Timesheet rejection reasons
    { id: '43333333-0000-0000-0000-000000000401', metadataDictionaryId: '42222222-0000-0000-0000-000000000201', entryKey: 'INCORRECT_HOURS', entryValue: 'INCORRECT_HOURS', displayName: 'Incorrect Hours', sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000402', metadataDictionaryId: '42222222-0000-0000-0000-000000000201', entryKey: 'WRONG_PROJECT',   entryValue: 'WRONG_PROJECT',   displayName: 'Wrong Project',   sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000403', metadataDictionaryId: '42222222-0000-0000-0000-000000000201', entryKey: 'MISSING_EVIDENCE', entryValue: 'MISSING_EVIDENCE', displayName: 'Missing Evidence', sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000404', metadataDictionaryId: '42222222-0000-0000-0000-000000000201', entryKey: 'OTHER',           entryValue: 'OTHER',           displayName: 'Other',           sortOrder: 4, isEnabled: true },
    // Assignment rejection reasons (Workflow Overhaul Phase 1)
    { id: '43333333-0000-0000-0000-000000000501', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'SKILL_GAP',       entryValue: 'SKILL_GAP',       displayName: 'Skill Gap',          sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000502', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'AVAILABILITY',    entryValue: 'AVAILABILITY',    displayName: 'Availability',       sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000503', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'GRADE_MISMATCH',  entryValue: 'GRADE_MISMATCH',  displayName: 'Grade Mismatch',     sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000504', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'BUDGET',          entryValue: 'BUDGET',          displayName: 'Budget',             sortOrder: 4, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000505', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'CULTURAL_FIT',    entryValue: 'CULTURAL_FIT',    displayName: 'Cultural Fit',       sortOrder: 5, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000506', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'TIMING',          entryValue: 'TIMING',          displayName: 'Timing',             sortOrder: 6, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000507', metadataDictionaryId: '42222222-0000-0000-0000-000000000301', entryKey: 'OTHER',           entryValue: 'OTHER',           displayName: 'Other',              sortOrder: 7, isEnabled: true },
    // Case kinds for assignment escalation (Workflow Overhaul Phase 1)
    { id: '43333333-0000-0000-0000-000000000601', metadataDictionaryId: '42222222-0000-0000-0000-000000000302', entryKey: 'PERFORMANCE',           entryValue: 'PERFORMANCE',           displayName: 'Performance',             sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000602', metadataDictionaryId: '42222222-0000-0000-0000-000000000302', entryKey: 'TIME_MISMATCH',         entryValue: 'TIME_MISMATCH',         displayName: 'Time Mismatch',           sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000603', metadataDictionaryId: '42222222-0000-0000-0000-000000000302', entryKey: 'SKILL_GAP_DISCOVERED',  entryValue: 'SKILL_GAP_DISCOVERED',  displayName: 'Skill Gap Discovered',    sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000604', metadataDictionaryId: '42222222-0000-0000-0000-000000000302', entryKey: 'BEHAVIORAL',            entryValue: 'BEHAVIORAL',            displayName: 'Behavioral',              sortOrder: 4, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000605', metadataDictionaryId: '42222222-0000-0000-0000-000000000302', entryKey: 'OTHER',                 entryValue: 'OTHER',                 displayName: 'Other',                   sortOrder: 5, isEnabled: true },
    // Staffing roles (StaffingRequest)
    { id: '43333333-0000-0000-0000-000000000701', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SOFTWARE_ENGINEER',          entryValue: 'Software Engineer',          displayName: 'Software Engineer',          sortOrder: 1, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000702', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SENIOR_SOFTWARE_ENGINEER',   entryValue: 'Senior Software Engineer',   displayName: 'Senior Software Engineer',   sortOrder: 2, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000703', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'LEAD_ENGINEER',              entryValue: 'Lead Engineer',              displayName: 'Lead Engineer',              sortOrder: 3, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000704', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'STAFF_ENGINEER',             entryValue: 'Staff Engineer',             displayName: 'Staff Engineer',             sortOrder: 4, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000705', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'PRINCIPAL_ENGINEER',         entryValue: 'Principal Engineer',         displayName: 'Principal Engineer',         sortOrder: 5, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000706', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'FRONTEND_ENGINEER',          entryValue: 'Frontend Engineer',          displayName: 'Frontend Engineer',          sortOrder: 6, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000707', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'BACKEND_ENGINEER',           entryValue: 'Backend Engineer',           displayName: 'Backend Engineer',           sortOrder: 7, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000708', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'FULL_STACK_ENGINEER',        entryValue: 'Full-Stack Engineer',        displayName: 'Full-Stack Engineer',        sortOrder: 8, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000709', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'MOBILE_ENGINEER',            entryValue: 'Mobile Engineer',            displayName: 'Mobile Engineer',            sortOrder: 9, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000710', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'DEVOPS_ENGINEER',            entryValue: 'DevOps Engineer',            displayName: 'DevOps Engineer',            sortOrder: 10, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000711', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SRE_ENGINEER',               entryValue: 'SRE Engineer',               displayName: 'SRE Engineer',               sortOrder: 11, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000712', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'PLATFORM_ENGINEER',          entryValue: 'Platform Engineer',          displayName: 'Platform Engineer',          sortOrder: 12, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000713', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'DATA_ENGINEER',              entryValue: 'Data Engineer',              displayName: 'Data Engineer',              sortOrder: 13, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000714', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'ML_ENGINEER',                entryValue: 'ML Engineer',                displayName: 'ML Engineer',                sortOrder: 14, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000715', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'QA_ENGINEER',                entryValue: 'QA Engineer',                displayName: 'QA Engineer',                sortOrder: 15, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000716', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SDET',                       entryValue: 'SDET',                       displayName: 'SDET',                       sortOrder: 16, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000717', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'AUTOMATION_ENGINEER',        entryValue: 'Automation Engineer',        displayName: 'Automation Engineer',        sortOrder: 17, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000718', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SECURITY_ENGINEER',          entryValue: 'Security Engineer',          displayName: 'Security Engineer',          sortOrder: 18, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000719', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'CLOUD_ARCHITECT',            entryValue: 'Cloud Architect',            displayName: 'Cloud Architect',            sortOrder: 19, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000720', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SOLUTIONS_ARCHITECT',        entryValue: 'Solutions Architect',        displayName: 'Solutions Architect',        sortOrder: 20, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000721', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'TECHNICAL_ARCHITECT',        entryValue: 'Technical Architect',        displayName: 'Technical Architect',        sortOrder: 21, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000722', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'ENGINEERING_MANAGER',        entryValue: 'Engineering Manager',        displayName: 'Engineering Manager',        sortOrder: 22, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000723', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'TECH_LEAD',                  entryValue: 'Tech Lead',                  displayName: 'Tech Lead',                  sortOrder: 23, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000724', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'TEAM_LEAD',                  entryValue: 'Team Lead',                  displayName: 'Team Lead',                  sortOrder: 24, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000725', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SCRUM_MASTER',               entryValue: 'Scrum Master',               displayName: 'Scrum Master',               sortOrder: 25, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000726', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'AGILE_COACH',                entryValue: 'Agile Coach',                displayName: 'Agile Coach',                sortOrder: 26, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000727', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'PROJECT_MANAGER',            entryValue: 'Project Manager',            displayName: 'Project Manager',            sortOrder: 27, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000728', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'DELIVERY_MANAGER',           entryValue: 'Delivery Manager',           displayName: 'Delivery Manager',           sortOrder: 28, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000729', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'PRODUCT_OWNER',              entryValue: 'Product Owner',              displayName: 'Product Owner',              sortOrder: 29, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000730', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'PRODUCT_MANAGER',            entryValue: 'Product Manager',            displayName: 'Product Manager',            sortOrder: 30, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000731', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'BUSINESS_ANALYST',           entryValue: 'Business Analyst',           displayName: 'Business Analyst',           sortOrder: 31, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000732', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SYSTEMS_ANALYST',            entryValue: 'Systems Analyst',            displayName: 'Systems Analyst',            sortOrder: 32, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000733', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'UX_DESIGNER',                entryValue: 'UX Designer',                displayName: 'UX Designer',                sortOrder: 33, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000734', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'UI_DESIGNER',                entryValue: 'UI Designer',                displayName: 'UI Designer',                sortOrder: 34, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000735', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'UX_RESEARCHER',              entryValue: 'UX Researcher',              displayName: 'UX Researcher',              sortOrder: 35, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000736', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'TECHNICAL_WRITER',           entryValue: 'Technical Writer',           displayName: 'Technical Writer',           sortOrder: 36, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000737', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'RELEASE_MANAGER',            entryValue: 'Release Manager',            displayName: 'Release Manager',            sortOrder: 37, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000738', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'DATABASE_ADMINISTRATOR',     entryValue: 'Database Administrator',     displayName: 'Database Administrator',     sortOrder: 38, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000739', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'SUPPORT_ENGINEER',           entryValue: 'Support Engineer',           displayName: 'Support Engineer',           sortOrder: 39, isEnabled: true },
    { id: '43333333-0000-0000-0000-000000000740', metadataDictionaryId: '42222222-0000-0000-0000-000000000401', entryKey: 'INTEGRATION_SPECIALIST',     entryValue: 'Integration Specialist',     displayName: 'Integration Specialist',     sortOrder: 40, isEnabled: true },
  ];

  for (const entry of entries) {
    await prismaSeed.metadataEntry.upsert({
      where: { id: entry.id },
      create: entry,
      update: { displayName: entry.displayName },
    });
  }

   
  console.log(`Seeded ${dictionaries.length} metadata dictionaries, ${entries.length} entries.`);
}

// ---------------------------------------------------------------------------
// Notification Channels + All Templates (full set from in-memory factories)
// ---------------------------------------------------------------------------
async function seedFullNotificationInfrastructure(): Promise<void> {
  // 3 channels: email, teams webhook, generic
  const emailChannel = await prisma.notificationChannel.upsert({
    where: { channelKey: 'email' },
    create: {
      id: '71111111-1111-1111-1111-111111111001',
      channelKey: 'email',
      displayName: 'Email',
      kind: 'EMAIL',
      isEnabled: true,
      config: { fromAddress: 'noreply@deliverycentral.local' },
    },
    update: {},
  });

  const teamsChannel = await prisma.notificationChannel.upsert({
    where: { channelKey: 'ms_teams_webhook' },
    create: {
      id: '71111111-1111-1111-1111-111111111002',
      channelKey: 'ms_teams_webhook',
      displayName: 'Microsoft Teams Webhook',
      kind: 'WEBHOOK',
      isEnabled: true,
      config: { themeColor: '2F6FEB', titlePrefix: '[DeliveryCentral]' },
    },
    update: {},
  });

  await prisma.notificationChannel.upsert({
    where: { channelKey: 'generic' },
    create: {
      id: '71111111-1111-1111-1111-111111111003',
      channelKey: 'generic',
      displayName: 'Generic Channel',
      kind: 'GENERIC',
      isEnabled: true,
    },
    update: {},
  });

  // All templates from in-memory factories + staffing templates
  const templates = [
    // Staffing templates
    { id: '72222222-2222-2222-2222-000000000001', templateKey: 'staffing-request-submitted-email',  eventName: 'staffingRequest.submitted', displayName: 'Staffing Request Submitted',  channelId: emailChannel.id, subjectTemplate: 'New staffing request: {{role}}',            bodyTemplate: 'A new staffing request for role "{{role}}" has been submitted for project {{projectId}}. Request ID: {{requestId}}.' },
    { id: '72222222-2222-2222-2222-000000000002', templateKey: 'staffing-request-in-review-email',  eventName: 'staffingRequest.inReview',  displayName: 'Staffing Request In Review',  channelId: emailChannel.id, subjectTemplate: 'Your staffing request is under review',      bodyTemplate: 'Your staffing request ({{requestId}}) is now under review by the resource management team.' },
    { id: '72222222-2222-2222-2222-000000000003', templateKey: 'staffing-request-fulfilled-email',  eventName: 'staffingRequest.fulfilled', displayName: 'Staffing Request Fulfilled',  channelId: emailChannel.id, subjectTemplate: 'Staffing request fulfilled',                 bodyTemplate: 'Staffing request {{requestId}} has been fulfilled. All required headcount has been assigned.' },
    { id: '72222222-2222-2222-2222-000000000004', templateKey: 'staffing-request-cancelled-email',  eventName: 'staffingRequest.cancelled', displayName: 'Staffing Request Cancelled',  channelId: emailChannel.id, subjectTemplate: 'Staffing request cancelled',                 bodyTemplate: 'Staffing request {{requestId}} has been cancelled.' },
    // Assignment templates
    { id: '72222222-2222-2222-2222-222222222001', templateKey: 'assignment-created-email',   eventName: 'assignment.created',   displayName: 'Assignment Created Email',   channelId: emailChannel.id, subjectTemplate: 'Assignment created: {{assignmentId}}',   bodyTemplate: 'Assignment {{assignmentId}} was created for project {{projectId}} with role {{staffingRole}}.' },
    { id: '72222222-2222-2222-2222-222222222002', templateKey: 'assignment-approved-email',  eventName: 'assignment.approved',  displayName: 'Assignment Approved Email',  channelId: emailChannel.id, subjectTemplate: 'Assignment approved: {{assignmentId}}',  bodyTemplate: 'Assignment {{assignmentId}} was approved.' },
    { id: '72222222-2222-2222-2222-222222222003', templateKey: 'assignment-rejected-email',  eventName: 'assignment.rejected',  displayName: 'Assignment Rejected Email',  channelId: emailChannel.id, subjectTemplate: 'Assignment rejected: {{assignmentId}}',  bodyTemplate: 'Assignment {{assignmentId}} was rejected. Reason: {{reason}}' },
    { id: '72222222-2222-2222-2222-222222222010', templateKey: 'assignment-ended-email',     eventName: 'assignment.ended',     displayName: 'Assignment Ended Email',     channelId: emailChannel.id, subjectTemplate: 'Assignment ended: {{assignmentId}}',     bodyTemplate: 'Assignment {{assignmentId}} has been ended.' },
    // Project templates
    { id: '72222222-2222-2222-2222-222222222004', templateKey: 'project-activated-email',    eventName: 'project.activated',    displayName: 'Project Activated Email',    channelId: emailChannel.id, subjectTemplate: 'Project activated: {{projectName}}',     bodyTemplate: 'Project {{projectId}} was activated.' },
    { id: '72222222-2222-2222-2222-222222222005', templateKey: 'project-closed-email',       eventName: 'project.closed',       displayName: 'Project Closed Email',       channelId: emailChannel.id, subjectTemplate: 'Project closed: {{projectName}}',        bodyTemplate: 'Project {{projectId}} was closed with {{totalMandays}} mandays recorded.' },
    // Integration templates (Teams channel)
    { id: '72222222-2222-2222-2222-222222222006', templateKey: 'integration-sync-failed-teams', eventName: 'integration.sync_failed', displayName: 'Integration Sync Failed Teams', channelId: teamsChannel.id, subjectTemplate: 'Integration sync failed',              bodyTemplate: 'Integration sync failed for {{provider}} {{resourceType}}. Error: {{errorMessage}}' },
    // Case templates
    { id: '72222222-2222-2222-2222-222222222007', templateKey: 'case-created-email',         eventName: 'case.created',         displayName: 'Case Created Email',         channelId: emailChannel.id, subjectTemplate: 'Case created: {{caseId}}',               bodyTemplate: 'Case {{caseId}} ({{caseType}}) was created for {{subjectPersonId}} and assigned to {{ownerPersonId}}.' },
    { id: '72222222-2222-2222-2222-222222222008', templateKey: 'case-step-completed-email',  eventName: 'case.step_completed',  displayName: 'Case Step Completed Email',  channelId: emailChannel.id, subjectTemplate: 'Case step completed: {{caseId}}',        bodyTemplate: 'A step in case {{caseId}} was completed.' },
    { id: '72222222-2222-2222-2222-222222222009', templateKey: 'case-closed-email',          eventName: 'case.closed',          displayName: 'Case Closed Email',          channelId: emailChannel.id, subjectTemplate: 'Case closed: {{caseId}}',                bodyTemplate: 'Case {{caseId}} has been closed.' },
    // Employee terminated (Teams channel)
    { id: '72222222-2222-2222-2222-222222222011', templateKey: 'employee-terminated-teams',   eventName: 'employee.terminated',  displayName: 'Employee Terminated Teams',  channelId: teamsChannel.id, subjectTemplate: 'Employee terminated',                    bodyTemplate: 'Employee {{personId}} has been terminated.' },
    // Workflow Overhaul Phase WO-3 — proposal slate + SLA + escalation
    { id: '72222222-2222-2222-2222-222222222020', templateKey: 'assignment-proposal-submitted-email',          eventName: 'assignment.proposal_submitted',           displayName: 'Proposal Slate Submitted',          channelId: emailChannel.id, subjectTemplate: 'New proposal slate for assignment {{assignmentId}}', bodyTemplate: 'A proposal slate of {{candidateCount}} candidate(s) has been submitted for assignment {{assignmentId}}. Review on the assignment page.' },
    { id: '72222222-2222-2222-2222-222222222021', templateKey: 'assignment-proposal-acknowledged-email',       eventName: 'assignment.proposal_acknowledged',        displayName: 'Proposal Acknowledged',             channelId: emailChannel.id, subjectTemplate: 'Reviewer engaged with your proposal',                bodyTemplate: 'The reviewer has acknowledged the proposal slate for assignment {{assignmentId}} and started review.' },
    { id: '72222222-2222-2222-2222-222222222022', templateKey: 'assignment-proposal-director-approval-email',  eventName: 'assignment.proposal_director_approval_requested', displayName: 'Director Approval Requested', channelId: emailChannel.id, subjectTemplate: 'Director approval needed for assignment {{assignmentId}}', bodyTemplate: 'Assignment {{assignmentId}} has crossed the configured threshold and requires Director sign-off before onboarding.' },
    { id: '72222222-2222-2222-2222-222222222023', templateKey: 'assignment-onboarding-scheduled-email',        eventName: 'assignment.onboarding_scheduled',         displayName: 'Onboarding Scheduled',              channelId: emailChannel.id, subjectTemplate: 'Onboarding scheduled for assignment {{assignmentId}}',  bodyTemplate: 'Onboarding for assignment {{assignmentId}} is scheduled on {{onboardingDate}}.' },
    { id: '72222222-2222-2222-2222-222222222024', templateKey: 'assignment-sla-breached-email',                eventName: 'assignment.sla_breached',                 displayName: 'Assignment SLA Breached',           channelId: emailChannel.id, subjectTemplate: '⚠️ SLA breach: assignment {{assignmentId}} (stage {{slaStage}})', bodyTemplate: 'Assignment {{assignmentId}} has breached the SLA at stage {{slaStage}}. Please act on the approval queue.' },
    { id: '72222222-2222-2222-2222-222222222025', templateKey: 'assignment-escalated-to-case-email',           eventName: 'assignment.escalated_to_case',            displayName: 'Assignment Escalated to Case',      channelId: emailChannel.id, subjectTemplate: 'Assignment {{assignmentId}} escalated to case {{caseId}}',  bodyTemplate: 'A case ({{caseId}}) has been opened to track an issue on assignment {{assignmentId}}.' },
  ];

  for (const tmpl of templates) {
    await prisma.notificationTemplate.upsert({
      where: { templateKey: tmpl.templateKey },
      create: { ...tmpl, isSystemManaged: true },
      update: {},
    });
  }

   
  console.log(`Notification infrastructure seeded (3 channels + ${templates.length} templates).`);
}

// ---------------------------------------------------------------------------
// Platform Settings (seed defaults into DB so admin UI has data)
// ---------------------------------------------------------------------------
async function seedPlatformSettings(): Promise<void> {
  const defaults: Record<string, unknown> = {
    'general.platformName': 'DeliveryCentral',
    'general.timezone': 'UTC',
    'general.fiscalYearStart': 1,
    'general.dateFormat': 'YYYY-MM-DD',
    'general.currency': 'AUD',
    'timesheets.enabled': true,
    'timesheets.standardHoursPerWeek': 40,
    'timesheets.maxHoursPerDay': 12,
    'timesheets.weekStartDay': 1,
    'timesheets.autoPopulate': false,
    'timesheets.approvalRequired': true,
    'timesheets.lockAfterDays': 14,
    'capitalisation.enabled': true,
    'capitalisation.defaultClassification': 'OPEX',
    'capitalisation.reconciliationAlerts': true,
    'pulse.enabled': true,
    'pulse.frequency': 'weekly',
    'pulse.anonymousMode': false,
    'pulse.alertThreshold': 2,
    'notifications.emailEnabled': true,
    'notifications.inAppEnabled': true,
    'notifications.digestFrequency': 'daily',
    'security.sessionTimeoutMinutes': 480,
    'security.maxLoginAttempts': 5,
    'security.passwordMinLength': 8,
    'security.mfaEnabled': false,
    'sso.enabled': false,
    'sso.providerName': '',
    'sso.issuerUrl': '',
    'sso.clientId': '',
    'sso.clientSecret': '',
    'sso.scopes': 'openid profile email',
    'sso.callbackUrl': '/auth/oidc/callback',
    'sso.autoProvisionUsers': false,
    'sso.defaultRole': 'employee',
    'onboarding.tourEnabled': true,
    'onboarding.tooltipsEnabled': true,
    'onboarding.showOnFirstLogin': true,
    'onboarding.welcomeMessage': 'Welcome to DeliveryCentral! Let us show you around.',
    'dashboard.staffingGapDaysThreshold': 28,
    'dashboard.evidenceInactiveDaysThreshold': 14,
    'dashboard.nearingClosureDaysThreshold': 30,
    'budgetSimulation.enabled': true,
    // Workflow Overhaul Phase 1 — §J configurable assignment workflow defaults
    'assignment.timeToFillTargetDays': 30,
    'assignment.sla.proposalDays': 2,
    'assignment.sla.reviewDays': 1,
    'assignment.sla.approvalDays': 2,
    'assignment.sla.rmFinalizeDays': 1,
    'assignment.sla.warningPercents': [50, 75],
    'assignment.sla.postBreachPercents': [],
    'assignment.sla.sweepIntervalMinutes': 15,
    'assignment.directorApproval.allocationPercentMin': 80,
    'assignment.directorApproval.durationMonthsMin': 12,
    'assignment.approvalQueue.defaultWindowDays': 30,
    'assignment.slate.minCandidates': 1,
    'assignment.slate.maxCandidates': 5,
    'assignment.slo.approvalP50Hours': 24,
    'assignment.slo.approvalP95Hours': 72,
    'assignment.slo.breachRateMaxPercent': 5,
    'assignment.matching.weights.skill': 25,
    'assignment.matching.weights.proficiency': 15,
    'assignment.matching.weights.importance': 15,
    'assignment.matching.weights.availability': 15,
    'assignment.matching.weights.recency': 5,
    'assignment.matching.weights.grade': 10,
    'assignment.matching.weights.domain': 5,
    'assignment.matching.weights.language': 3,
    'assignment.matching.weights.tz': 2,
    'assignment.matching.weights.cert': 5,
    'assignment.nudge.cooldownHours': 24,
    // ─── Setup wizard sentinels ────────────────────────────────────────
    // Written by the wizard's `complete` step. `setup.completedAt = null`
    // means a fresh install or a Reset, which causes the SetupGuard to
    // gate the app behind /setup.
    'setup.completedAt': null,
    'setup.profile': null,         // 'demo' | 'preset' | 'clean'
    'setup.tenantId': null,        // populated after the tenant step
    // ─── Monitoring forwarder configs (collected in wizard step 6) ────
    // The actual exporter wiring is out-of-scope; the wizard captures
    // endpoints + tokens so the operator's external pipeline can pick
    // them up and so /api/setup/monitoring/snippet?target=… can render
    // copy-pasteable shipper configs.
    'monitoring.otlp.enabled': false,
    'monitoring.otlp.endpoint': '',
    'monitoring.otlp.headers': '',
    'monitoring.splunk.enabled': false,
    'monitoring.splunk.hecUrl': '',
    'monitoring.splunk.token': '',
    'monitoring.datadog.enabled': false,
    'monitoring.datadog.apiKey': '',
    'monitoring.datadog.region': 'US1',
    'monitoring.syslog.enabled': false,
    'monitoring.syslog.host': '',
    'monitoring.syslog.port': 514,
    // ─── Database ownership credentials ───────────────────────────────
    // Generated + persisted by the wizard's EMPTY_POSTGRES branch when
    // it issues `CREATE ROLE prod_user`. Only readable to superuser
    // sessions (the wizard re-uses it on subsequent boots to verify
    // the role still works). NEVER printed to logs.
    'db.prodUserPassword': null,
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prismaSeed.platformSetting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: {},
    });
  }

   
  console.log(`Seeded ${Object.keys(defaults).length} platform settings.`);
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
async function seedSkills(): Promise<void> {
  const skills = [
    { id: '55555555-5c00-0000-0000-000000000001', name: 'TypeScript',   category: 'Languages' },
    { id: '55555555-5c00-0000-0000-000000000002', name: 'JavaScript',   category: 'Languages' },
    { id: '55555555-5c00-0000-0000-000000000003', name: 'Python',       category: 'Languages' },
    { id: '55555555-5c00-0000-0000-000000000004', name: 'Java',         category: 'Languages' },
    { id: '55555555-5c00-0000-0000-000000000005', name: 'C#',           category: 'Languages' },
    { id: '55555555-5c00-0000-0000-000000000006', name: 'Go',           category: 'Languages' },
    { id: '55555555-5c00-0000-0000-000000000007', name: 'React',        category: 'Frontend' },
    { id: '55555555-5c00-0000-0000-000000000008', name: 'Angular',      category: 'Frontend' },
    { id: '55555555-5c00-0000-0000-000000000009', name: 'Vue.js',       category: 'Frontend' },
    { id: '55555555-5c00-0000-0000-000000000010', name: 'NestJS',       category: 'Backend' },
    { id: '55555555-5c00-0000-0000-000000000011', name: 'Spring Boot',  category: 'Backend' },
    { id: '55555555-5c00-0000-0000-000000000012', name: 'PostgreSQL',   category: 'Databases' },
    { id: '55555555-5c00-0000-0000-000000000013', name: 'MongoDB',      category: 'Databases' },
    { id: '55555555-5c00-0000-0000-000000000014', name: 'Redis',        category: 'Databases' },
    { id: '55555555-5c00-0000-0000-000000000015', name: 'AWS',          category: 'Cloud' },
    { id: '55555555-5c00-0000-0000-000000000016', name: 'Azure',        category: 'Cloud' },
    { id: '55555555-5c00-0000-0000-000000000017', name: 'GCP',          category: 'Cloud' },
    { id: '55555555-5c00-0000-0000-000000000018', name: 'Docker',       category: 'DevOps' },
    { id: '55555555-5c00-0000-0000-000000000019', name: 'Kubernetes',   category: 'DevOps' },
    { id: '55555555-5c00-0000-0000-000000000020', name: 'Terraform',    category: 'DevOps' },
    { id: '55555555-5c00-0000-0000-000000000021', name: 'CI/CD',        category: 'DevOps' },
    { id: '55555555-5c00-0000-0000-000000000022', name: 'Agile/Scrum',  category: 'Methodology' },
    { id: '55555555-5c00-0000-0000-000000000023', name: 'Project Management', category: 'Methodology' },
    { id: '55555555-5c00-0000-0000-000000000024', name: 'Data Engineering',   category: 'Data' },
    { id: '55555555-5c00-0000-0000-000000000025', name: 'Machine Learning',   category: 'Data' },
  ];

  for (const skill of skills) {
    // Migration history bit-rot (DM-R-11): live DB has `(tenantId, name)` unique
    // composite instead of `name @unique` declared in schema. Upserting by `id`
    // (the primary key) sidesteps the drift until the schema is aligned.
    await prismaSeed.skill.upsert({
      where: { id: skill.id },
      create: skill,
      update: { name: skill.name, category: skill.category },
    });
  }

  // Assign some skills to key people
  const personSkills = [
    // Ethan Brooks — Senior Software Engineer
    { id: '55555555-b500-0000-0000-000000000001', personId: '11111111-1111-1111-1111-111111111008', skillId: '55555555-5c00-0000-0000-000000000001', proficiency: 5 },
    { id: '55555555-b500-0000-0000-000000000002', personId: '11111111-1111-1111-1111-111111111008', skillId: '55555555-5c00-0000-0000-000000000007', proficiency: 5 },
    { id: '55555555-b500-0000-0000-000000000003', personId: '11111111-1111-1111-1111-111111111008', skillId: '55555555-5c00-0000-0000-000000000010', proficiency: 4 },
    { id: '55555555-b500-0000-0000-000000000004', personId: '11111111-1111-1111-1111-111111111008', skillId: '55555555-5c00-0000-0000-000000000012', proficiency: 4 },
    { id: '55555555-b500-0000-0000-000000000005', personId: '11111111-1111-1111-1111-111111111008', skillId: '55555555-5c00-0000-0000-000000000018', proficiency: 3 },
    // Lucas Reed — Program Manager
    { id: '55555555-b500-0000-0000-000000000006', personId: '11111111-1111-1111-1111-111111111010', skillId: '55555555-5c00-0000-0000-000000000022', proficiency: 5 },
    { id: '55555555-b500-0000-0000-000000000007', personId: '11111111-1111-1111-1111-111111111010', skillId: '55555555-5c00-0000-0000-000000000023', proficiency: 5 },
    { id: '55555555-b500-0000-0000-000000000008', personId: '11111111-1111-1111-1111-111111111010', skillId: '55555555-5c00-0000-0000-000000000001', proficiency: 3 },
    // Sophia Kim — Resource Manager
    { id: '55555555-b500-0000-0000-000000000009', personId: '11111111-1111-1111-1111-111111111006', skillId: '55555555-5c00-0000-0000-000000000022', proficiency: 4 },
    { id: '55555555-b500-0000-0000-000000000010', personId: '11111111-1111-1111-1111-111111111006', skillId: '55555555-5c00-0000-0000-000000000023', proficiency: 4 },
  ];

  for (const ps of personSkills) {
    // PersonSkill rows reference phase2 personIds. For non-phase2 profiles,
    // those persons do not exist — skip silently rather than abort the seed.
    try {
      await prismaSeed.personSkill.upsert({
        where: { personId_skillId: { personId: ps.personId, skillId: ps.skillId } },
        create: ps,
        update: { proficiency: ps.proficiency },
      });
    } catch {
      // person does not exist in this profile — fine.
    }
  }

   
  console.log(`Seeded ${skills.length} skills, ${personSkills.length} person-skill assignments.`);
}

// ---------------------------------------------------------------------------
// Timesheets — seed 4 weeks for Ethan Brooks + Lucas Reed
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Pulse Entries — 12 weeks of mood data for 3 people
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Case Steps — initialize steps for 3 phase2 cases
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// In-App Notifications — demo notifications for key accounts
// ---------------------------------------------------------------------------

async function clearExistingData(): Promise<void> {
  // Wrap the entire wipe in one transaction so `SET LOCAL` actually applies
  // to every deleteMany. DM-R-23's mass-mutation guard rejects DELETEs that
  // affect >1000 rows unless `public.allow_bulk` is true; without this the
  // seed's own rollback path fails the second a profile inserts more than
  // 1000 rows of any aggregate before erroring (see commit f096b04 trail).
  // DM-R-31c honeypot canary rows must be preserved — every DELETE on the
  // 3 sentinel rows trips a tripwire that aborts the transaction.
  const HONEYPOT_PERSON_ID            = '00000000-dead-beef-0000-000000000001';
  const HONEYPOT_PROJECT_ID           = '00000000-dead-beef-0000-000000000002';
  const HONEYPOT_PROJECT_ASSIGNMENT_ID = '00000000-dead-beef-0000-000000000003';
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL public.allow_bulk = 'true'`);
      const t = tx as any;

      // In-app notifications, pulse, timesheets, skills, platform settings
      await t.inAppNotification.deleteMany();
      await t.pulseEntry.deleteMany();
      await t.timesheetEntry.deleteMany();
      await t.timesheetWeek.deleteMany();
      await t.personSkill.deleteMany();
      await t.skill.deleteMany();
      await t.platformSetting.deleteMany();
      // Metadata
      await t.metadataEntry.deleteMany();
      await t.metadataDictionary.deleteMany();
      // Notification infrastructure
      await t.notificationDelivery.deleteMany();
      await t.notificationRequest.deleteMany();
      await t.notificationTemplate.deleteMany();
      await t.notificationChannel.deleteMany();
      // Core domain
      await t.employeeActivityEvent.deleteMany();
      await t.workEvidenceLink.deleteMany();
      await t.workEvidence.deleteMany();
      await t.workEvidenceSource.deleteMany();
      await t.assignmentHistory.deleteMany({ where: { assignmentId: { not: HONEYPOT_PROJECT_ASSIGNMENT_ID } } });
      await t.assignmentApproval.deleteMany({ where: { assignmentId: { not: HONEYPOT_PROJECT_ASSIGNMENT_ID } } });
      await t.projectAssignment.deleteMany({ where: { id: { not: HONEYPOT_PROJECT_ASSIGNMENT_ID } } });
      await t.externalSyncState.deleteMany();
      await t.projectExternalLink.deleteMany();
      await t.staffingRequestFulfilment.deleteMany();
      await t.staffingRequest.deleteMany();
      await t.projectRadiatorOverride.deleteMany();
      await t.projectRisk.deleteMany();
      await t.projectRolePlan.deleteMany();
      await t.projectRagSnapshot.deleteMany();
      await t.projectVendorEngagement.deleteMany();
      await t.projectBudget.deleteMany();
      await t.projectMilestone.deleteMany();
      await t.projectChangeRequest.deleteMany();
      await t.radiatorThresholdConfig.deleteMany();
      await t.project.deleteMany({ where: { id: { not: HONEYPOT_PROJECT_ID } } });
      await t.personResourcePoolMembership.deleteMany();
      await t.resourcePool.deleteMany();
      await t.reportingLine.deleteMany();
      await t.personOrgMembership.deleteMany();
      await t.position.deleteMany();
      await t.orgUnit.deleteMany();
      await t.caseParticipant.deleteMany();
      await t.caseStep.deleteMany();
      await t.caseRecord.deleteMany();
      await t.caseType.deleteMany();
      await t.leaveRequest.deleteMany();
      await t.leaveBalance.deleteMany();
      await t.overtimeException.deleteMany();
      await t.overtimePolicy.deleteMany();
      await t.personCostRate.deleteMany();
      await t.person.deleteMany({ where: { id: { not: HONEYPOT_PERSON_ID } } });
      await t.passwordResetToken.deleteMany();
      await t.refreshToken.deleteMany();
      await t.localAccount.deleteMany();
    },
    { timeout: 120000, maxWait: 10000 },
  );
}

async function seedCaseTypes(): Promise<void> {
  const types = [
    { key: 'ONBOARDING',  displayName: 'Onboarding',  description: 'New employee onboarding workflow.' },
    { key: 'OFFBOARDING', displayName: 'Offboarding', description: 'Employee offboarding workflow.' },
    { key: 'PERFORMANCE', displayName: 'Performance Review', description: 'Performance review and improvement plan.' },
    { key: 'TRANSFER',    displayName: 'Transfer',    description: 'Internal department transfer workflow.' },
  ];

  for (const t of types) {
    await prismaSeed.caseType.upsert({
      where: { key: t.key },
      create: t,
      update: { displayName: t.displayName },
    });
  }
}







async function seedRadiatorThresholds(): Promise<void> {
  // updatedByPersonId references a phase2 admin. For non-phase2 profiles
  // that person doesn't exist; fall back to whatever Person row exists or
  // skip the FK link entirely.
  const fallbackUpdater = await prisma.person.findFirst({ where: { primaryEmail: 'noah.bennett@example.com' } })
    ?? await prisma.person.findFirst({ where: { primaryEmail: 'noah.bennett@itco.local' } })
    ?? await prisma.person.findFirst({ select: { id: true } });
  const updatedByPersonId = fallbackUpdater?.id ?? null;

  const thresholds = [
    { subDimensionKey: 'costPerformanceIndex', thresholdScore4: 0.98, thresholdScore3: 0.95, thresholdScore2: 0.9, thresholdScore1: 0.8, direction: 'HIGHER_IS_BETTER' as const, updatedByPersonId },
    { subDimensionKey: 'teamMood',             thresholdScore4: 4.2,  thresholdScore3: 3.7,  thresholdScore2: 3.2, thresholdScore1: 2.8, direction: 'HIGHER_IS_BETTER' as const, updatedByPersonId },
  ];

  for (const t of thresholds) {
    await prisma.radiatorThresholdConfig.upsert({
      where: { subDimensionKey: t.subDimensionKey },
      update: { ...t, updatedAt: new Date() },
      create: { ...t, updatedAt: new Date() },
    });
  }


  console.log(`Seeded ${thresholds.length} custom radiator threshold configs.`);
}



async function seedSuperadmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@deliverycentral.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'DeliveryCentral@Admin1';
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME ?? 'System Administrator';

  const existing = await prisma.localAccount.findUnique({ where: { email } });

  if (existing) {
     
    console.log(`Superadmin account already exists: ${email}`);
    return;
  }

  const adminPersonId = '00000000-0000-0000-0000-000000000001';

  // Create a Person record for the admin so they have a personId
  await prisma.person.upsert({
    where: { id: adminPersonId },
    create: {
      id: adminPersonId,
      givenName: 'System',
      familyName: 'Administrator',
      displayName: 'System Administrator',
      primaryEmail: email,
      employmentStatus: 'ACTIVE',
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.localAccount.create({
    data: {
      email,
      displayName,
      passwordHash,
      personId: adminPersonId,
      roles: ['admin'],
      source: 'local',
      twoFactorEnabled: false,
      backupCodesHash: [],
      mustChangePw: false,
    },
  });

   
  console.log(`Superadmin seeded: ${email}`);
}

// ---------------------------------------------------------------------------
// Realistic profile helpers
// ---------------------------------------------------------------------------

async function seedItCompanyAccounts(): Promise<void> {
  const adminPersonId = '00000000-0000-0000-0000-000000000001';

  // Admin person mirrors the realistic helper so the standard
  // admin@deliverycentral.local login keeps working across profiles.
  await prisma.person.upsert({
    where: { id: adminPersonId },
    create: {
      id: adminPersonId,
      givenName: 'System',
      familyName: 'Administrator',
      displayName: 'System Administrator',
      primaryEmail: 'admin@deliverycentral.local',
      employmentStatus: 'ACTIVE',
    },
    update: {},
  });

  for (const account of itCompanyAccounts) {
    const existing = await prisma.localAccount.findUnique({ where: { email: account.email } });
    if (existing) {

      console.log(`  Account already exists, skipping: ${account.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(account.password, 12);
    await prisma.localAccount.create({
      data: {
        email: account.email,
        displayName: account.displayName,
        passwordHash,
        roles: account.roles,
        source: 'local',
        personId: account.personId,
        twoFactorEnabled: false,
        backupCodesHash: [],
        mustChangePw: false,
      },
    });


    console.log(`  Account seeded: ${account.email} [${account.roles.join(', ')}]`);
  }
}

async function seedItCompanyPersonSkills(): Promise<void> {
  // Skills are stored with explicit IDs by seedSkills(). Match on the
  // catalog `name` so the generator can use display names ("TypeScript")
  // instead of internal keys.
  const allSkills = await prismaSeed.skill.findMany({ select: { id: true, name: true } }) as Array<{ id: string; name: string }>;
  const skillIdByLowerName = new Map<string, string>();
  for (const s of allSkills) {
    skillIdByLowerName.set(s.name.toLowerCase(), s.id);
  }

  let count = 0;
  for (const a of itCompanyPersonSkillAssignments) {
    const skillId = skillIdByLowerName.get(a.skillName.toLowerCase());
    if (!skillId) continue;
    count += 1;
    try {
      await prismaSeed.personSkill.create({
        data: {
          id: `cccc0004-bp00-0000-${String(count).padStart(4, '0')}-000000000000`,
          personId: a.personId,
          skillId,
          proficiency: a.proficiency,
        },
      });
    } catch {
      // Skip duplicates (composite unique on personId+skillId)
    }
  }

  console.log(`  Person skills: ${count} assignments`);
}

async function createManyInChunks(table: string, data: unknown[], chunkSize = 1000): Promise<void> {
  for (let index = 0; index < data.length; index += chunkSize) {
    await prismaSeed[table].createMany({
      data: data.slice(index, index + chunkSize),
    });
  }
}

/**
 * Wipes "operating data" only — Person/Project/Assignment/WorkEvidence and
 * everything that references them — but PRESERVES:
 *   - the admin Person + LocalAccount (so the wizard-created admin survives)
 *   - Tenant rows (the wizard's tenant step already populated this)
 *   - infrastructure layer: skills, dictionaries, notification templates,
 *     radiator thresholds, platform_settings (already populated by the
 *     wizard's infrastructure runner before this step)
 *   - DM-R-31c honeypot canaries (deleting them trips the tripwire)
 *
 * Used by the wizard's `demo` profile when the DB is non-empty: a re-run
 * needs the dataset to land fresh-and-complete, not a half-overwritten
 * mix of old rows missing newly-added columns and new rows with the
 * latest schema. The seed-time CLI keeps using the wider clearExistingData
 * which also wipes the infra layer.
 */
async function clearOperatingData(): Promise<void> {
  const HONEYPOT_PERSON_ID             = '00000000-dead-beef-0000-000000000001';
  const HONEYPOT_PROJECT_ID            = '00000000-dead-beef-0000-000000000002';
  const HONEYPOT_PROJECT_ASSIGNMENT_ID = '00000000-dead-beef-0000-000000000003';
  const ADMIN_PERSON_ID                = '00000000-0000-0000-0000-000000000001';

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL public.allow_bulk = 'true'`);
      const t = tx as any;

      // Operating data — everything the demo dataset writes.
      await t.employeeActivityEvent.deleteMany();
      await t.workEvidenceLink.deleteMany();
      await t.workEvidence.deleteMany();
      await t.workEvidenceSource.deleteMany();
      await t.assignmentHistory.deleteMany({ where: { assignmentId: { not: HONEYPOT_PROJECT_ASSIGNMENT_ID } } });
      await t.assignmentApproval.deleteMany({ where: { assignmentId: { not: HONEYPOT_PROJECT_ASSIGNMENT_ID } } });
      await t.projectAssignment.deleteMany({ where: { id: { not: HONEYPOT_PROJECT_ASSIGNMENT_ID } } });
      await t.externalSyncState.deleteMany();
      await t.projectExternalLink.deleteMany();
      await t.staffingRequestFulfilment.deleteMany();
      await t.staffingRequest.deleteMany();
      await t.projectRadiatorOverride.deleteMany();
      await t.projectRisk.deleteMany();
      await t.projectRolePlan.deleteMany();
      await t.projectRagSnapshot.deleteMany();
      await t.projectVendorEngagement.deleteMany();
      await t.projectBudget.deleteMany();
      await t.projectMilestone.deleteMany();
      await t.projectChangeRequest.deleteMany();
      await t.project.deleteMany({ where: { id: { not: HONEYPOT_PROJECT_ID } } });
      await t.personResourcePoolMembership.deleteMany();
      await t.resourcePool.deleteMany();
      await t.reportingLine.deleteMany();
      await t.personOrgMembership.deleteMany();
      await t.position.deleteMany();
      await t.orgUnit.deleteMany();
      await t.personSkill.deleteMany();
      await t.personCostRate.deleteMany();
      await t.timesheetEntry.deleteMany();
      await t.timesheetWeek.deleteMany();
      await t.pulseEntry.deleteMany();
      await t.inAppNotification.deleteMany();
      await t.leaveRequest.deleteMany();
      await t.leaveBalance.deleteMany();
      await t.overtimeException.deleteMany();
      await t.caseParticipant.deleteMany();
      await t.caseStep.deleteMany();
      await t.caseRecord.deleteMany();
      // LocalAccounts referencing non-admin people would orphan, so wipe
      // every account except the wizard-created admin (its personId is the
      // canonical 0000-...-0001).
      await t.localAccount.deleteMany({ where: { personId: { not: ADMIN_PERSON_ID } } });
      // Person last — every operating table above had to be cleared first
      // because of FK references.
      await t.person.deleteMany({
        where: { AND: [{ id: { not: HONEYPOT_PERSON_ID } }, { id: { not: ADMIN_PERSON_ID } }] },
      });
    },
    { timeout: 120000, maxWait: 10000 },
  );
}

async function seedDataset(dataset: SeedDataset): Promise<void> {
  await createManyInChunks('person', dataset.people);
  await createManyInChunks(
    'orgUnit',
    dataset.orgUnits.map(({ kind: _kind, ...orgUnit }) => orgUnit),
  );
  await createManyInChunks('position', dataset.positions);
  await createManyInChunks('personOrgMembership', dataset.personOrgMemberships);
  await createManyInChunks('reportingLine', dataset.reportingLines);
  await createManyInChunks('resourcePool', dataset.resourcePools);
  await createManyInChunks('personResourcePoolMembership', dataset.resourcePoolMemberships);
  await createManyInChunks('project', dataset.projects);
  await createManyInChunks('projectExternalLink', dataset.projectExternalLinks);
  await createManyInChunks('externalSyncState', dataset.externalSyncStates);
  await createManyInChunks('projectAssignment', dataset.assignments);
  await createManyInChunks('assignmentApproval', dataset.assignmentApprovals);
  await createManyInChunks('assignmentHistory', dataset.assignmentHistory);
  await createManyInChunks('workEvidenceSource', dataset.workEvidenceSources);
  await createManyInChunks('workEvidence', dataset.workEvidence);
  await createManyInChunks('workEvidenceLink', dataset.workEvidenceLinks);
  if (dataset.activityEvents) {
    await createManyInChunks('employeeActivityEvent', dataset.activityEvents);
  }
}

function parseSeedProfile(argv: string[]): string {
  const profileFlagIndex = argv.findIndex((value) => value === '--profile');
  if (profileFlagIndex >= 0 && argv[profileFlagIndex + 1]) {
    return argv[profileFlagIndex + 1];
  }

  return process.env.SEED_PROFILE ?? 'it-company';
}

async function main(): Promise<void> {
  const profile = parseSeedProfile(process.argv.slice(2));

  // After the DM-R-11 cleanup the only supported profile is `it-company`.
  // Legacy profiles (`demo`, `phase2`, `life-demo`, `investor-demo`,
  // `realistic`/`enterprise`) were retired because their datasets
  // pre-dated several schema additions (engagementModel, priority,
  // tenantId backfill, …) and would have produced rows missing fields
  // the runtime now requires. The dispatch workflows accept a `profile`
  // input for forward-compat with future profiles.
  if (profile !== 'it-company') {
    throw new Error(
      `Unsupported seed profile "${profile}". Only "it-company" is currently wired up.`,
    );
  }

  await clearExistingData();

  if (profile === 'it-company') {
    await seedDataset({
      assignmentApprovals: itCompanyAssignmentApprovals,
      assignmentHistory: itCompanyAssignmentHistory,
      assignments: itCompanyAssignments,
      externalSyncStates: itCompanyExternalSyncStates,
      orgUnits: itCompanyOrgUnits,
      people: itCompanyPeople,
      personOrgMemberships: itCompanyPersonOrgMemberships,
      positions: itCompanyPositions,
      projectExternalLinks: itCompanyProjectExternalLinks,
      projects: itCompanyProjects,
      reportingLines: itCompanyReportingLines,
      resourcePoolMemberships: itCompanyResourcePoolMemberships,
      resourcePools: itCompanyResourcePools,
      summary: itCompanyDatasetSummary,
      workEvidence: itCompanyWorkEvidence,
      workEvidenceLinks: itCompanyWorkEvidenceLinks,
      workEvidenceSources: itCompanyWorkEvidenceSources,
    });

    // Staffing requests + fulfilments
    await createManyInChunks('staffingRequest', itCompanyStaffingRequests);
    await createManyInChunks('staffingRequestFulfilment', itCompanyStaffingRequestFulfilments);

    // Per-project context: milestones, change requests, RAG snapshots,
    // budgets, role plans, risks, retrospectives, vendor engagements.
    await createManyInChunks('projectMilestone', itCompanyProjectMilestones);
    await createManyInChunks('projectChangeRequest', itCompanyProjectChangeRequests);
    await createManyInChunks('projectRagSnapshot', itCompanyProjectRagSnapshots);
    await createManyInChunks('projectBudget', itCompanyProjectBudgets);
    await createManyInChunks('projectRolePlan', itCompanyProjectRolePlans);
    await createManyInChunks('projectRisk', itCompanyProjectRisks);
    await createManyInChunks('projectRetrospective', itCompanyProjectRetrospectives);

    // Timesheets — last 12 weeks for everyone, +8 weeks history for actives.
    const { weeks: itWeeks, entries: itEntries } = generateItCompanyTimesheets();
    await createManyInChunks('timesheetWeek', itWeeks);
    await createManyInChunks('timesheetEntry', itEntries);

    // Pulse — 12 weeks for ICs.
    const itPulse = generateItCompanyPulseEntries();
    await createManyInChunks('pulseEntry', itPulse);

    // Leave — historical + 1 PENDING + 1 REJECTED for queue testing.
    const itLeave = generateItCompanyLeaveRequests();
    await createManyInChunks('leaveRequest', itLeave);

    // Cases — 12 records across ONBOARDING / OFFBOARDING / PERFORMANCE / TRANSFER.
    await seedCaseTypes();
    const onboardingType = await prismaSeed.caseType.findFirst({ where: { key: 'ONBOARDING' } }) as { id: string } | null;
    const performanceType = await prismaSeed.caseType.findFirst({ where: { key: 'PERFORMANCE' } }) as { id: string } | null;
    const offboardingType = await prismaSeed.caseType.findFirst({ where: { key: 'OFFBOARDING' } }) as { id: string } | null;
    const transferType = await prismaSeed.caseType.findFirst({ where: { key: 'TRANSFER' } }) as { id: string } | null;

    const itCaseTypeMap: Record<string, string> = {
      ONBOARDING: onboardingType?.id ?? '',
      PERFORMANCE: performanceType?.id ?? '',
      OFFBOARDING: offboardingType?.id ?? '',
      TRANSFER: transferType?.id ?? '',
    };

    for (const c of itCompanyCases) {
      await prismaSeed.caseRecord.create({
        data: {
          id: c.id,
          caseNumber: c.caseNumber,
          caseTypeId: itCaseTypeMap[c.caseTypeKey],
          subjectPersonId: c.subjectPersonId,
          ownerPersonId: c.ownerPersonId,
          status: c.status,
          summary: c.summary,
        },
      });
    }

    const itCaseSteps = generateItCompanyCaseSteps();
    await createManyInChunks('caseStep', itCaseSteps);

    // In-app notifications for every role-test account.
    const itNotifications = generateItCompanyNotifications();
    await createManyInChunks('inAppNotification', itNotifications);

    // Profile-agnostic infrastructure (idempotent upserts).
    await seedMetadata();
    await seedPlatformSettings();
    await seedSkills();
    await seedRadiatorThresholds();
    await seedFullNotificationInfrastructure();

    await seedItCompanyPersonSkills();


    console.log('IT-Company dataset seeded.', itCompanyDatasetSummary);
    console.log(`  Timesheets: ${itWeeks.length} weeks, ${itEntries.length} entries`);
    console.log(`  Pulse entries: ${itPulse.length}`);
    console.log(`  Leave requests: ${itLeave.length}`);
    console.log(`  Case steps: ${itCaseSteps.length}`);
    console.log(`  Notifications: ${itNotifications.length}`);

    await seedSuperadmin();
    await seedItCompanyAccounts();
    return;
  }
}

// DM-R-10 — atomic-like seed guarantee.
//
// We do not wrap main() in a single prisma.$transaction — the it-company
// profile inserts ~23k rows across 24 tables and Postgres'
// `idle_in_transaction_session_timeout` budget is not forgiving enough
// for a multi-minute, multi-table seed inside a single tx.
//
// Instead: on failure, rewind to an empty-DB state by calling
// clearExistingData() again. The guarantee is "no partial seeded state
// survives a failed seed", which is the property the original
// transaction wrap was intended to provide.
// Only auto-invoke main() when this file is the entry point (e.g. via
// `ts-node prisma/seed.ts`). When the in-app SetupModule imports the
// helpers below at runtime, we DO NOT want main() to fire.
if (require.main === module) {
  main()
    .catch(async (error: unknown) => {
      console.error('Seed failed — rolling back to empty state via clearExistingData().', error);
      try {
        await clearExistingData();
        console.error('DM-R-10: rollback complete. DB is empty.');
      } catch (rollbackError) {
        console.error('DM-R-10: rollback ALSO failed; DB may be partially seeded.', rollbackError);
      }
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

// Helpers exported for the in-app SetupModule (src/modules/setup/). The
// wizard re-runs these against the runtime backend's DB to support the
// `clean` / `preset` / `demo` install profiles without shelling out.
// Dataset arrays live in `prisma/seeds/it-company-profile.ts` — setup
// runners import them directly from there.
export {
  clearExistingData,
  clearOperatingData,
  seedSuperadmin,
  seedMetadata,
  seedSkills,
  seedRadiatorThresholds,
  seedFullNotificationInfrastructure,
  seedPlatformSettings,
  seedItCompanyAccounts,
  seedItCompanyPersonSkills,
  seedDataset,
};
