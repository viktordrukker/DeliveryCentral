import * as bcrypt from 'bcrypt';

import { Prisma, PrismaClient } from '@prisma/client';

import {
  demoAssignmentApprovals,
  demoAssignmentHistory,
  demoAssignments,
  demoDatasetSummary,
  demoExternalSyncStates,
  demoOrgUnits,
  demoPeople,
  demoPersonOrgMemberships,
  demoPositions,
  demoProjectExternalLinks,
  demoProjects,
  demoReportingLines,
  demoResourcePoolMemberships,
  demoResourcePools,
  demoWorkEvidence,
  demoWorkEvidenceLinks,
  demoWorkEvidenceSources,
} from './seeds/demo-dataset';

import {
  allPhase2AssignmentApprovals,
  phase2AssignmentHistory,
  phase2Assignments,
  phase2DatasetSummary,
  phase2ExternalSyncStates,
  phase2OrgUnits,
  phase2People,
  phase2PersonOrgMemberships,
  phase2Positions,
  phase2ProjectExternalLinks,
  phase2Projects,
  phase2ReportingLines,
  phase2ResourcePoolMemberships,
  phase2ResourcePools,
  phase2StaffingRequestFulfilments,
  phase2StaffingRequests,
  phase2WorkEvidence,
  phase2WorkEvidenceLinks,
  phase2WorkEvidenceSources,
} from './seeds/phase2-dataset';

import {
  lifeDemoAssignmentApprovals,
  lifeDemoAssignmentHistory,
  lifeDemoAssignments,
  lifeDemoDatasetSummary,
  lifeDemoExternalSyncStates,
  lifeDemoOrgUnits,
  lifeDemoPeople,
  lifeDemoPersonOrgMemberships,
  lifeDemoPositions,
  lifeDemoProjectExternalLinks,
  lifeDemoProjects,
  lifeDemoReportingLines,
  lifeDemoResourcePoolMemberships,
  lifeDemoResourcePools,
  lifeDemoWorkEvidence,
  lifeDemoWorkEvidenceLinks,
  lifeDemoWorkEvidenceSources,
} from './seeds/life-demo-dataset';

import {
  idAssignmentApprovals,
  idAssignmentHistory,
  idAssignments,
  idDatasetSummary,
  idExternalSyncStates,
  idOrgUnits,
  idPeople,
  idPersonOrgMemberships,
  idPositions,
  idProjectExternalLinks,
  idProjects,
  idReportingLines,
  idResourcePoolMemberships,
  idResourcePools,
  idStaffingRequestFulfilments,
  idStaffingRequests,
  idWorkEvidence,
  idWorkEvidenceLinks,
  idWorkEvidenceSources,
} from './seeds/investor-demo-dataset';

import {
  generateNotifications,
  generatePulseEntries,
  generateTimesheets,
  realisticAccounts,
  realisticAssignmentApprovals,
  realisticAssignmentHistory,
  realisticAssignments,
  realisticCases,
  realisticDatasetSummary,
  realisticExternalSyncStates,
  realisticOrgUnits,
  realisticPeople,
  realisticPersonOrgMemberships,
  realisticPositions,
  realisticProjectExternalLinks,
  realisticProjects,
  realisticReportingLines,
  realisticResourcePoolMemberships,
  realisticResourcePools,
  realisticActivityEvents,
  realisticStaffingRequestFulfilments,
  realisticStaffingRequests,
  realisticWorkEvidence,
  realisticWorkEvidenceLinks,
  realisticWorkEvidenceSources,
} from './seeds/realistic-dataset';

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

async function seedNotificationInfrastructure(): Promise<void> {
  const emailChannel = await prisma.notificationChannel.upsert({
    where: { channelKey: 'email' },
    create: {
      channelKey: 'email',
      displayName: 'Email',
      kind: 'EMAIL',
      isEnabled: true,
      config: { fromAddress: 'noreply@deliverycentral.local' },
    },
    update: {},
  });

  const staffingTemplates = [
    {
      templateKey: 'staffing-request-submitted-email',
      eventName: 'staffingRequest.submitted',
      displayName: 'Staffing Request Submitted',
      subjectTemplate: 'New staffing request: {{role}}',
      bodyTemplate: 'A new staffing request for role "{{role}}" has been submitted for project {{projectId}}. Request ID: {{requestId}}.',
    },
    {
      templateKey: 'staffing-request-in-review-email',
      eventName: 'staffingRequest.inReview',
      displayName: 'Staffing Request In Review',
      subjectTemplate: 'Your staffing request is under review',
      bodyTemplate: 'Your staffing request ({{requestId}}) is now under review by the resource management team.',
    },
    {
      templateKey: 'staffing-request-fulfilled-email',
      eventName: 'staffingRequest.fulfilled',
      displayName: 'Staffing Request Fulfilled',
      subjectTemplate: 'Staffing request fulfilled',
      bodyTemplate: 'Staffing request {{requestId}} has been fulfilled. All required headcount has been assigned.',
    },
    {
      templateKey: 'staffing-request-cancelled-email',
      eventName: 'staffingRequest.cancelled',
      displayName: 'Staffing Request Cancelled',
      subjectTemplate: 'Staffing request cancelled',
      bodyTemplate: 'Staffing request {{requestId}} has been cancelled.',
    },
  ];

  for (const tmpl of staffingTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { templateKey: tmpl.templateKey },
      create: { ...tmpl, channelId: emailChannel.id },
      update: {},
    });
  }

   
  console.log('Notification infrastructure seeded (email channel + staffing templates).');
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
    await prismaSeed.skill.upsert({
      where: { name: skill.name },
      create: skill,
      update: { category: skill.category },
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
    await prismaSeed.personSkill.upsert({
      where: { personId_skillId: { personId: ps.personId, skillId: ps.skillId } },
      create: ps,
      update: { proficiency: ps.proficiency },
    });
  }

   
  console.log(`Seeded ${skills.length} skills, ${personSkills.length} person-skill assignments.`);
}

// ---------------------------------------------------------------------------
// Timesheets — seed 4 weeks for Ethan Brooks + Lucas Reed
// ---------------------------------------------------------------------------
async function seedTimesheets(): Promise<void> {
  const ethanId = '11111111-1111-1111-1111-111111111008';
  const lucasId = '11111111-1111-1111-1111-111111111010';
  const prj101 = '33333333-3333-3333-3333-333333333002'; // Delivery Central
  const prj102 = '33333333-3333-3333-3333-333333333003'; // Atlas

  // Generate Monday dates for the last 4 weeks
  const now = new Date();
  const mondays: Date[] = [];
  for (let w = 4; w >= 1; w--) {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + 1 - (w * 7));
    d.setHours(0, 0, 0, 0);
    mondays.push(d);
  }

  let weekIdx = 0;
  for (const monday of mondays) {
    weekIdx++;

    // Ethan: APPROVED for weeks 1-2, SUBMITTED for week 3, DRAFT for week 4
    const ethanStatus = weekIdx <= 2 ? 'APPROVED' : weekIdx === 3 ? 'SUBMITTED' : 'DRAFT';
    // ID format must be valid hex (ParseUUIDPipe rejects non-hex chars).
    // `1500` keeps the human-readable mnemonic that `ts00` originally provided.
    const ethanWeekId = `66666666-1500-0000-0001-00000000000${weekIdx}`;
    await prismaSeed.timesheetWeek.upsert({
      where: { personId_weekStart: { personId: ethanId, weekStart: monday } },
      create: {
        id: ethanWeekId,
        personId: ethanId,
        weekStart: monday,
        status: ethanStatus,
        submittedAt: ethanStatus !== 'DRAFT' ? new Date() : null,
        approvedBy: ethanStatus === 'APPROVED' ? '11111111-1111-1111-1111-111111111002' : null,
        approvedAt: ethanStatus === 'APPROVED' ? new Date() : null,
      },
      update: {},
    });

    // Ethan entries: Mon-Fri 6h PRJ-101, 2h PRJ-102
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const entryDate = new Date(monday);
      entryDate.setDate(monday.getDate() + dayOffset);

      await prismaSeed.timesheetEntry.upsert({
        where: { timesheetWeekId_projectId_benchCategory_workLabel_date: { timesheetWeekId: ethanWeekId, projectId: prj101, benchCategory: '', workLabel: '', date: entryDate } },
        create: {
          id: `66666666-ae00-0001-${String(weekIdx).padStart(4, '0')}-${String(dayOffset + 1).padStart(12, '0')}`,
          timesheetWeekId: ethanWeekId,
          projectId: prj101,
          date: entryDate,
          hours: 6,
          description: 'Platform development',
        },
        update: {},
      });

      await prismaSeed.timesheetEntry.upsert({
        where: { timesheetWeekId_projectId_benchCategory_workLabel_date: { timesheetWeekId: ethanWeekId, projectId: prj102, benchCategory: '', workLabel: '', date: entryDate } },
        create: {
          id: `66666666-ae00-0002-${String(weekIdx).padStart(4, '0')}-${String(dayOffset + 1).padStart(12, '0')}`,
          timesheetWeekId: ethanWeekId,
          projectId: prj102,
          date: entryDate,
          hours: 2,
          description: 'Atlas integration support',
        },
        update: {},
      });
    }

    // Lucas: 1 week APPROVED, rest SUBMITTED
    const lucasStatus = weekIdx === 1 ? 'APPROVED' : 'SUBMITTED';
    const lucasWeekId = `66666666-1500-0000-0002-00000000000${weekIdx}`;
    await prismaSeed.timesheetWeek.upsert({
      where: { personId_weekStart: { personId: lucasId, weekStart: monday } },
      create: {
        id: lucasWeekId,
        personId: lucasId,
        weekStart: monday,
        status: lucasStatus,
        submittedAt: new Date(),
        approvedBy: lucasStatus === 'APPROVED' ? '11111111-1111-1111-1111-111111111002' : null,
        approvedAt: lucasStatus === 'APPROVED' ? new Date() : null,
      },
      update: {},
    });

    // Lucas entries: Mon-Fri 8h PRJ-101
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const entryDate = new Date(monday);
      entryDate.setDate(monday.getDate() + dayOffset);

      await prismaSeed.timesheetEntry.upsert({
        where: { timesheetWeekId_projectId_benchCategory_workLabel_date: { timesheetWeekId: lucasWeekId, projectId: prj101, benchCategory: '', workLabel: '', date: entryDate } },
        create: {
          id: `66666666-ae00-0003-${String(weekIdx).padStart(4, '0')}-${String(dayOffset + 1).padStart(12, '0')}`,
          timesheetWeekId: lucasWeekId,
          projectId: prj101,
          date: entryDate,
          hours: 8,
          description: 'Program management',
        },
        update: {},
      });
    }
  }

   
  console.log(`Seeded ${mondays.length} timesheet weeks each for Ethan Brooks and Lucas Reed.`);
}

// ---------------------------------------------------------------------------
// Pulse Entries — 12 weeks of mood data for 3 people
// ---------------------------------------------------------------------------
async function seedPulseEntries(): Promise<void> {
  const people = [
    { personId: '11111111-1111-1111-1111-111111111008', name: 'Ethan Brooks',  baseMood: 4 },  // generally happy
    { personId: '11111111-1111-1111-1111-111111111010', name: 'Lucas Reed',    baseMood: 3 },  // neutral trending
    { personId: '11111111-1111-1111-1111-111111111006', name: 'Sophia Kim',    baseMood: 4 },  // happy with dip
  ];

  const now = new Date();
  let count = 0;

  for (const person of people) {
    for (let w = 12; w >= 1; w--) {
      const monday = new Date(now);
      monday.setDate(monday.getDate() - monday.getDay() + 1 - (w * 7));
      monday.setHours(0, 0, 0, 0);

      // Vary mood: base +/- 1 with a dip around week 6-7
      let mood = person.baseMood;
      if (w >= 6 && w <= 7) mood = Math.max(1, person.baseMood - 1);
      if (w <= 2) mood = Math.min(5, person.baseMood + 1);
      // Add slight deterministic variation
      if (w % 3 === 0) mood = Math.max(1, mood - 1);

      const id = `77777777-pu00-0000-${String(count + 1).padStart(4, '0')}-000000000000`;
      count++;

      await prismaSeed.pulseEntry.upsert({
        where: { personId_weekStart: { personId: person.personId, weekStart: monday } },
        create: {
          id,
          personId: person.personId,
          weekStart: monday,
          mood,
          note: w === 6 ? 'Feeling overwhelmed with workload' : (w === 1 ? 'Great week, wrapped up the sprint!' : null),
          submittedAt: monday,
        },
        update: {},
      });
    }
  }

   
  console.log(`Seeded ${count} pulse entries for ${people.length} people.`);
}

// ---------------------------------------------------------------------------
// Case Steps — initialize steps for 3 phase2 cases
// ---------------------------------------------------------------------------
async function seedCaseSteps(): Promise<void> {
  const STEP_TEMPLATES: Record<string, Array<{ displayName: string; stepKey: string }>> = {
    ONBOARDING: [
      { displayName: 'Provision System Access', stepKey: 'provision-access' },
      { displayName: 'Complete Paperwork', stepKey: 'complete-paperwork' },
      { displayName: 'Meet Your Manager', stepKey: 'meet-manager' },
      { displayName: 'First Day Check-in', stepKey: 'first-day-checkin' },
    ],
    OFFBOARDING: [
      { displayName: 'Exit Interview', stepKey: 'exit-interview' },
      { displayName: 'Revoke System Access', stepKey: 'revoke-access' },
      { displayName: 'Return Equipment', stepKey: 'return-equipment' },
      { displayName: 'Knowledge Transfer', stepKey: 'knowledge-transfer' },
      { displayName: 'Final Payroll Confirmation', stepKey: 'payroll-confirmation' },
    ],
    PERFORMANCE: [
      { displayName: 'Schedule Review Meeting', stepKey: 'schedule-meeting' },
      { displayName: 'Complete Self-Assessment', stepKey: 'self-assessment' },
      { displayName: 'Manager Assessment', stepKey: 'manager-assessment' },
      { displayName: 'Define Improvement Goals', stepKey: 'define-goals' },
      { displayName: 'Follow-up Check-in', stepKey: 'followup-checkin' },
    ],
  };

  const cases = [
    { caseId: '33333333-ca5e-0000-0000-000000000001', typeKey: 'ONBOARDING' },
    { caseId: '33333333-ca5e-0000-0000-000000000002', typeKey: 'PERFORMANCE' },
    { caseId: '33333333-ca5e-0000-0000-000000000003', typeKey: 'OFFBOARDING' },
  ];

  let count = 0;
  for (const c of cases) {
    const steps = STEP_TEMPLATES[c.typeKey] ?? [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // First step of each case is COMPLETED for realistic demo
      const isCompleted = i === 0;
      count++;
      const id = `88888888-c500-0000-${String(count).padStart(4, '0')}-000000000000`;

      await prismaSeed.caseStep.upsert({
        where: { caseRecordId_stepKey: { caseRecordId: c.caseId, stepKey: step.stepKey } },
        create: {
          id,
          caseRecordId: c.caseId,
          stepKey: step.stepKey,
          displayName: step.displayName,
          status: isCompleted ? 'COMPLETED' : 'OPEN',
          completedAt: isCompleted ? new Date() : null,
        },
        update: {},
      });
    }
  }

   
  console.log(`Seeded ${count} case steps for ${cases.length} cases.`);
}

// ---------------------------------------------------------------------------
// In-App Notifications — demo notifications for key accounts
// ---------------------------------------------------------------------------
async function seedInAppNotifications(): Promise<void> {
  const now = new Date();
  const notifications = [
    // Ethan Brooks
    { id: '99999999-1a00-0000-0000-000000000001', recipientPersonId: '11111111-1111-1111-1111-111111111008', eventType: 'assignment.created',    title: 'New assignment on Delivery Central',          body: 'You have been assigned as Lead Engineer on PRJ-101.',         link: '/projects/33333333-3333-3333-3333-333333333002', readAt: null,                                   createdAt: new Date(now.getTime() - 2 * 86400000) },
    { id: '99999999-1a00-0000-0000-000000000002', recipientPersonId: '11111111-1111-1111-1111-111111111008', eventType: 'case.created',          title: 'Onboarding case opened for you',              body: 'HR has opened an onboarding case (CASE-0001).',              link: '/cases/33333333-ca5e-0000-0000-000000000001',    readAt: new Date(now.getTime() - 86400000),     createdAt: new Date(now.getTime() - 3 * 86400000) },
    { id: '99999999-1a00-0000-0000-000000000003', recipientPersonId: '11111111-1111-1111-1111-111111111008', eventType: 'pulse.reminder',        title: 'Weekly pulse check-in',                       body: 'How are you feeling this week? Submit your pulse.',           link: '/pulse',                                          readAt: null,                                   createdAt: new Date(now.getTime() - 1 * 86400000) },
    // Diana Walsh (HR)
    { id: '99999999-1a00-0000-0000-000000000004', recipientPersonId: '11111111-1111-1111-2222-000000000001', eventType: 'case.step_completed',   title: 'Case step completed on CASE-0001',            body: 'The "Provision System Access" step has been completed.',      link: '/cases/33333333-ca5e-0000-0000-000000000001',    readAt: null,                                   createdAt: new Date(now.getTime() - 1 * 86400000) },
    { id: '99999999-1a00-0000-0000-000000000005', recipientPersonId: '11111111-1111-1111-2222-000000000001', eventType: 'staffingRequest.submitted', title: 'New staffing request received',            body: 'A staffing request for Lead Engineer has been submitted.',    link: '/staffing',                                       readAt: new Date(now.getTime() - 2 * 86400000), createdAt: new Date(now.getTime() - 4 * 86400000) },
    // Lucas Reed (PM)
    { id: '99999999-1a00-0000-0000-000000000006', recipientPersonId: '11111111-1111-1111-1111-111111111010', eventType: 'assignment.approved',   title: 'Assignment approved for Ethan Brooks',        body: 'Ethan Brooks has been approved for Delivery Central.',        link: '/projects/33333333-3333-3333-3333-333333333002', readAt: null,                                   createdAt: new Date(now.getTime() - 5 * 86400000) },
    { id: '99999999-1a00-0000-0000-000000000007', recipientPersonId: '11111111-1111-1111-1111-111111111010', eventType: 'project.activated',     title: 'Project Mercury is now in draft',             body: 'Mercury Infrastructure project has been created.',            link: '/projects/33333333-3333-3333-2222-000000000001', readAt: new Date(now.getTime() - 3 * 86400000), createdAt: new Date(now.getTime() - 6 * 86400000) },
    // Sophia Kim (RM)
    { id: '99999999-1a00-0000-0000-000000000008', recipientPersonId: '11111111-1111-1111-1111-111111111006', eventType: 'staffingRequest.fulfilled', title: 'Staffing request fulfilled',               body: 'All headcount for the Lead Engineer request has been filled.', link: '/staffing',                                      readAt: null,                                   createdAt: new Date(now.getTime() - 2 * 86400000) },
  ];

  for (const notif of notifications) {
    await prismaSeed.inAppNotification.upsert({
      where: { id: notif.id },
      create: notif,
      update: {},
    });
  }

   
  console.log(`Seeded ${notifications.length} in-app notifications.`);
}

async function clearExistingData(): Promise<void> {
  // Wrap the entire wipe in one transaction so `SET LOCAL` actually applies
  // to every deleteMany. DM-R-23's mass-mutation guard rejects DELETEs that
  // affect >1000 rows unless `public.allow_bulk` is true; without this the
  // seed's own rollback path fails the second a profile inserts more than
  // 1000 rows of any aggregate before erroring (see commit f096b04 trail).
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
      await t.assignmentHistory.deleteMany();
      await t.assignmentApproval.deleteMany();
      await t.projectAssignment.deleteMany();
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
      await t.project.deleteMany();
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
      await t.person.deleteMany();
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

async function seedPlannerData(): Promise<void> {
  // Skill ID shortcuts
  const SK = {
    TS: '55555555-5c00-0000-0000-000000000001',      // TypeScript
    JS: '55555555-5c00-0000-0000-000000000002',      // JavaScript
    PY: '55555555-5c00-0000-0000-000000000003',      // Python
    JAVA: '55555555-5c00-0000-0000-000000000004',    // Java
    REACT: '55555555-5c00-0000-0000-000000000007',   // React
    NESTJS: '55555555-5c00-0000-0000-000000000010',  // NestJS
    SPRING: '55555555-5c00-0000-0000-000000000011',  // Spring Boot
    PG: '55555555-5c00-0000-0000-000000000012',      // PostgreSQL
    AWS: '55555555-5c00-0000-0000-000000000015',     // AWS
    DOCKER: '55555555-5c00-0000-0000-000000000018',  // Docker
    K8S: '55555555-5c00-0000-0000-000000000019',     // Kubernetes
    TERRAFORM: '55555555-5c00-0000-0000-000000000020', // Terraform
    CICD: '55555555-5c00-0000-0000-000000000021',    // CI/CD
    AGILE: '55555555-5c00-0000-0000-000000000022',   // Agile/Scrum
    PM: '55555555-5c00-0000-0000-000000000023',      // Project Management
  };

  // ProjectRolePlan — defines staffing requirements per project WITH skill IDs
  const rolePlans = [
    // Delivery Central Platform (PRJ-101) — needs 3 roles
    { id: 'aaaa0001-0001-0001-0001-000000000001', projectId: '33333333-3333-3333-3333-333333333002', roleName: 'Lead Engineer', seniorityLevel: 'Senior', headcount: 2, allocationPercent: 100, plannedStartDate: new Date('2025-01-15'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.TS, SK.REACT, SK.NESTJS, SK.PG], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000002', projectId: '33333333-3333-3333-3333-333333333002', roleName: 'Backend Developer', seniorityLevel: 'Mid', headcount: 3, allocationPercent: 100, plannedStartDate: new Date('2025-02-01'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.TS, SK.NESTJS, SK.PG], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000003', projectId: '33333333-3333-3333-3333-333333333002', roleName: 'QA Engineer', seniorityLevel: 'Mid', headcount: 1, allocationPercent: 80, plannedStartDate: new Date('2025-03-01'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.TS, SK.JS], source: 'INTERNAL' },
    // Atlas ERP Rollout (PRJ-102) — closing soon
    { id: 'aaaa0001-0001-0001-0001-000000000004', projectId: '33333333-3333-3333-3333-333333333003', roleName: 'Business Analyst', seniorityLevel: 'Senior', headcount: 1, allocationPercent: 80, plannedStartDate: new Date('2025-02-01'), plannedEndDate: new Date('2026-04-30'), requiredSkillIds: [SK.AGILE, SK.PM], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000005', projectId: '33333333-3333-3333-3333-333333333003', roleName: 'Project Coordinator', seniorityLevel: 'Mid', headcount: 2, allocationPercent: 100, plannedStartDate: new Date('2025-02-01'), plannedEndDate: new Date('2026-04-30'), requiredSkillIds: [SK.PM, SK.AGILE], source: 'INTERNAL' },
    // Mercury Infrastructure (PRJ-106) — DRAFT project
    { id: 'aaaa0001-0001-0001-0001-000000000006', projectId: '33333333-3333-3333-2222-000000000001', roleName: 'DevOps Engineer', seniorityLevel: 'Senior', headcount: 2, allocationPercent: 100, plannedStartDate: new Date('2026-05-01'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.AWS, SK.DOCKER, SK.K8S, SK.TERRAFORM], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000007', projectId: '33333333-3333-3333-2222-000000000001', roleName: 'Cloud Architect', seniorityLevel: 'Senior', headcount: 1, allocationPercent: 100, plannedStartDate: new Date('2026-05-01'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.AWS, SK.TERRAFORM, SK.K8S], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000008', projectId: '33333333-3333-3333-2222-000000000001', roleName: 'Backend Developer', seniorityLevel: 'Mid', headcount: 3, allocationPercent: 100, plannedStartDate: new Date('2026-06-01'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.JAVA, SK.SPRING, SK.PG], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000009', projectId: '33333333-3333-3333-2222-000000000001', roleName: 'QA Engineer', seniorityLevel: 'Mid', headcount: 2, allocationPercent: 80, plannedStartDate: new Date('2026-07-01'), plannedEndDate: new Date('2026-12-31'), requiredSkillIds: [SK.JS, SK.TS], source: 'INTERNAL' },
    // Jupiter Client Portal (PRJ-107) — understaffed
    { id: 'aaaa0001-0001-0001-0001-000000000010', projectId: '33333333-3333-3333-2222-000000000002', roleName: 'Frontend Engineer', seniorityLevel: 'Senior', headcount: 2, allocationPercent: 80, plannedStartDate: new Date('2026-01-15'), plannedEndDate: new Date('2026-10-31'), requiredSkillIds: [SK.REACT, SK.TS, SK.JS], source: 'INTERNAL' },
    { id: 'aaaa0001-0001-0001-0001-000000000011', projectId: '33333333-3333-3333-2222-000000000002', roleName: 'Backend Developer', seniorityLevel: 'Mid', headcount: 2, allocationPercent: 100, plannedStartDate: new Date('2026-01-15'), plannedEndDate: new Date('2026-10-31'), requiredSkillIds: [SK.NESTJS, SK.TS, SK.PG], source: 'INTERNAL' },
    // Polaris Security Hardening (PRJ-105)
    { id: 'aaaa0001-0001-0001-0001-000000000012', projectId: '33333333-3333-3333-3333-333333333006', roleName: 'Security Analyst', seniorityLevel: 'Senior', headcount: 2, allocationPercent: 60, plannedStartDate: new Date('2025-03-01'), plannedEndDate: new Date('2026-09-30'), requiredSkillIds: [SK.AWS, SK.DOCKER, SK.K8S], source: 'INTERNAL' },
  ];
  await createManyInChunks('projectRolePlan', rolePlans);

  // PersonCostRate — hourly cost rates for all phase2 people
  const costRates = [
    { id: 'bbbb0001-0001-0001-0001-000000000001', personId: '11111111-1111-1111-1111-111111111001', effectiveFrom: new Date('2025-01-01'), hourlyRate: 65,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000002', personId: '11111111-1111-1111-1111-111111111002', effectiveFrom: new Date('2025-01-01'), hourlyRate: 145, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000003', personId: '11111111-1111-1111-1111-111111111003', effectiveFrom: new Date('2025-01-01'), hourlyRate: 140, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000004', personId: '11111111-1111-1111-1111-111111111004', effectiveFrom: new Date('2025-01-01'), hourlyRate: 125, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000005', personId: '11111111-1111-1111-1111-111111111005', effectiveFrom: new Date('2025-01-01'), hourlyRate: 110, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000006', personId: '11111111-1111-1111-1111-111111111006', effectiveFrom: new Date('2025-01-01'), hourlyRate: 105, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000007', personId: '11111111-1111-1111-1111-111111111007', effectiveFrom: new Date('2025-01-01'), hourlyRate: 100, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000008', personId: '11111111-1111-1111-1111-111111111008', effectiveFrom: new Date('2025-01-01'), hourlyRate: 95,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000009', personId: '11111111-1111-1111-1111-111111111009', effectiveFrom: new Date('2025-01-01'), hourlyRate: 90,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000010', personId: '11111111-1111-1111-1111-111111111010', effectiveFrom: new Date('2025-01-01'), hourlyRate: 115, rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000011', personId: '11111111-1111-1111-1111-111111111011', effectiveFrom: new Date('2025-01-01'), hourlyRate: 85,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000012', personId: '11111111-1111-1111-1111-111111111012', effectiveFrom: new Date('2025-01-01'), hourlyRate: 80,  rateType: 'INTERNAL' },
    // Phase2 extended people
    { id: 'bbbb0001-0001-0001-0001-000000000013', personId: '11111111-1111-1111-2222-000000000004', effectiveFrom: new Date('2025-01-01'), hourlyRate: 75,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000014', personId: '11111111-1111-1111-2222-000000000005', effectiveFrom: new Date('2025-01-01'), hourlyRate: 70,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000015', personId: '11111111-1111-1111-2222-000000000006', effectiveFrom: new Date('2025-01-01'), hourlyRate: 65,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000016', personId: '11111111-1111-1111-2222-000000000007', effectiveFrom: new Date('2025-01-01'), hourlyRate: 90,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000017', personId: '11111111-1111-1111-2222-000000000009', effectiveFrom: new Date('2025-01-01'), hourlyRate: 85,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000018', personId: '11111111-1111-1111-2222-000000000010', effectiveFrom: new Date('2025-01-01'), hourlyRate: 78,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000019', personId: '11111111-1111-1111-2222-000000000011', effectiveFrom: new Date('2025-01-01'), hourlyRate: 72,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000020', personId: '11111111-1111-1111-2222-000000000013', effectiveFrom: new Date('2025-01-01'), hourlyRate: 68,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000021', personId: '11111111-1111-1111-2222-000000000014', effectiveFrom: new Date('2025-01-01'), hourlyRate: 82,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000022', personId: '11111111-1111-1111-2222-000000000015', effectiveFrom: new Date('2025-01-01'), hourlyRate: 88,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000023', personId: '11111111-1111-1111-2222-000000000016', effectiveFrom: new Date('2025-01-01'), hourlyRate: 76,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000024', personId: '11111111-1111-1111-2222-000000000017', effectiveFrom: new Date('2025-01-01'), hourlyRate: 92,  rateType: 'INTERNAL' },
    { id: 'bbbb0001-0001-0001-0001-000000000025', personId: '11111111-1111-1111-2222-000000000018', effectiveFrom: new Date('2025-01-01'), hourlyRate: 74,  rateType: 'INTERNAL' },
  ];
  await createManyInChunks('personCostRate', costRates);

  // ProjectBudget — CAPEX/OPEX per fiscal year
  const budgets = [
    { id: 'cccc0001-0001-0001-0001-000000000001', projectId: '33333333-3333-3333-3333-333333333002', fiscalYear: 2026, capexBudget: 480000, opexBudget: 120000 },
    { id: 'cccc0001-0001-0001-0001-000000000002', projectId: '33333333-3333-3333-3333-333333333003', fiscalYear: 2026, capexBudget: 250000, opexBudget: 80000 },
    { id: 'cccc0001-0001-0001-0001-000000000003', projectId: '33333333-3333-3333-3333-333333333004', fiscalYear: 2026, capexBudget: 320000, opexBudget: 95000 },
    { id: 'cccc0001-0001-0001-0001-000000000004', projectId: '33333333-3333-3333-3333-333333333006', fiscalYear: 2026, capexBudget: 180000, opexBudget: 60000 },
    { id: 'cccc0001-0001-0001-0001-000000000005', projectId: '33333333-3333-3333-2222-000000000001', fiscalYear: 2026, capexBudget: 600000, opexBudget: 150000 },
    { id: 'cccc0001-0001-0001-0001-000000000006', projectId: '33333333-3333-3333-2222-000000000002', fiscalYear: 2026, capexBudget: 350000, opexBudget: 100000 },
  ];
  await createManyInChunks('projectBudget', budgets);

   
  console.log(`Seeded planner data: ${rolePlans.length} role plans, ${costRates.length} cost rates, ${budgets.length} budgets.`);
}

async function seedProjectRisks(): Promise<void> {
  const now = new Date();
  const risks = [
    // Delivery Central Platform (PRJ-101)
    { id: 'dd000001-0001-0001-0001-000000000001', projectId: '33333333-3333-3333-3333-333333333002', title: 'Key developer departure risk', description: 'Lead engineer may leave due to competing offer. Knowledge concentration in one person.', category: 'SCOPE' as const, riskType: 'RISK' as const, probability: 3, impact: 4, strategy: 'MITIGATE' as const, strategyDescription: 'Cross-train second engineer, document architecture decisions.', damageControlPlan: 'Engage contractor via vendor for 3-month backfill if departure confirmed.', status: 'ASSESSED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111010', raisedAt: new Date(now.getTime() - 14 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000002', projectId: '33333333-3333-3333-3333-333333333002', title: 'Scope creep from stakeholder requests', description: 'Multiple unplanned feature requests arriving weekly from business stakeholders.', category: 'SCOPE' as const, riskType: 'ISSUE' as const, probability: 5, impact: 3, strategy: 'MITIGATE' as const, strategyDescription: 'Implement formal change request process. Weekly prioritization meeting with steering committee.', status: 'MITIGATING' as const, ownerPersonId: '11111111-1111-1111-1111-111111111010', assigneePersonId: '11111111-1111-1111-1111-111111111010', raisedAt: new Date(now.getTime() - 21 * 86400000), dueDate: new Date(now.getTime() + 7 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000003', projectId: '33333333-3333-3333-3333-333333333002', title: 'Database performance degradation', description: 'Query response times increasing as data volume grows beyond initial estimates.', category: 'TECHNICAL' as const, riskType: 'RISK' as const, probability: 4, impact: 4, strategy: 'MITIGATE' as const, strategyDescription: 'Plan index optimization sprint and evaluate read replica setup.', status: 'IDENTIFIED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111008', raisedAt: new Date(now.getTime() - 7 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000004', projectId: '33333333-3333-3333-3333-333333333002', title: 'Budget overrun on cloud infrastructure', description: 'AWS costs 18% above forecast due to unoptimized container orchestration.', category: 'BUDGET' as const, riskType: 'RISK' as const, probability: 3, impact: 3, strategy: 'ACCEPT' as const, strategyDescription: 'Monitor monthly. Acceptable variance within contingency reserve.', status: 'ASSESSED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111010', raisedAt: new Date(now.getTime() - 10 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000005', projectId: '33333333-3333-3333-3333-333333333002', title: 'Client satisfaction declining', description: 'Latest CSAT survey shows drop from 4.2 to 3.6 due to delayed deliverables.', category: 'BUSINESS' as const, riskType: 'ISSUE' as const, probability: 4, impact: 5, strategy: 'ESCALATE' as const, strategyDescription: 'Schedule executive review with client. Prepare recovery plan with accelerated timeline.', damageControlPlan: 'If CSAT drops below 3.0, escalate to director for intervention.', status: 'MITIGATING' as const, ownerPersonId: '11111111-1111-1111-1111-111111111010', assigneePersonId: '11111111-1111-1111-1111-111111111006', raisedAt: new Date(now.getTime() - 5 * 86400000), dueDate: new Date(now.getTime() + 3 * 86400000) },

    // Atlas ERP Rollout (PRJ-102)
    { id: 'dd000001-0001-0001-0001-000000000006', projectId: '33333333-3333-3333-3333-333333333003', title: 'Vendor delivery delay', description: 'ERP vendor behind schedule on API integration module by 3 weeks.', category: 'SCHEDULE' as const, riskType: 'ISSUE' as const, probability: 5, impact: 4, strategy: 'TRANSFER' as const, strategyDescription: 'Invoke contractual SLA penalties. Request vendor acceleration team.', damageControlPlan: 'Parallel development of workaround adapter if vendor misses revised deadline.', status: 'MITIGATING' as const, ownerPersonId: '11111111-1111-1111-1111-111111111006', assigneePersonId: '11111111-1111-1111-1111-111111111006', raisedAt: new Date(now.getTime() - 18 * 86400000), dueDate: new Date(now.getTime() - 2 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000007', projectId: '33333333-3333-3333-3333-333333333003', title: 'Data migration quality risk', description: 'Legacy data has 12% records with validation errors that may block go-live.', category: 'SCOPE' as const, riskType: 'RISK' as const, probability: 4, impact: 5, strategy: 'MITIGATE' as const, strategyDescription: 'Dedicated data cleansing sprint with business SME validation.', status: 'ASSESSED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111006', raisedAt: new Date(now.getTime() - 12 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000008', projectId: '33333333-3333-3333-3333-333333333003', title: 'Regulatory compliance gap', description: 'New GDPR requirements may affect data retention module design.', category: 'BUSINESS' as const, riskType: 'RISK' as const, probability: 2, impact: 5, strategy: 'AVOID' as const, strategyDescription: 'Engage legal counsel before architecture finalization. Design for compliance from day one.', status: 'IDENTIFIED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111006', raisedAt: new Date(now.getTime() - 3 * 86400000) },

    // Beacon Mobile Revamp (PRJ-103)
    { id: 'dd000001-0001-0001-0001-000000000009', projectId: '33333333-3333-3333-3333-333333333004', title: 'Mobile platform fragmentation', description: 'Supporting both iOS 14+ and Android 10+ increases QA effort by 40%.', category: 'TECHNICAL' as const, riskType: 'RISK' as const, probability: 3, impact: 3, strategy: 'ACCEPT' as const, strategyDescription: 'Accepted. Using React Native cross-platform framework to minimize divergence.', status: 'ASSESSED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111006', raisedAt: new Date(now.getTime() - 25 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000010', projectId: '33333333-3333-3333-3333-333333333004', title: 'App store review delays', description: 'Apple review process taking 7-14 days per submission, blocking release cadence.', category: 'SCHEDULE' as const, riskType: 'RISK' as const, probability: 4, impact: 2, strategy: 'MITIGATE' as const, strategyDescription: 'Submit releases 2 weeks before target date. Use TestFlight for internal distribution.', status: 'RESOLVED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111006', raisedAt: new Date(now.getTime() - 30 * 86400000), resolvedAt: new Date(now.getTime() - 5 * 86400000) },

    // Internal Bench Planning (PRJ-100)
    { id: 'dd000001-0001-0001-0001-000000000011', projectId: '33333333-3333-3333-3333-333333333001', title: 'Bench utilization below target', description: 'Current bench rate at 22% vs 15% target. Need to accelerate placement velocity.', category: 'OPERATIONAL' as const, riskType: 'ISSUE' as const, probability: 5, impact: 3, strategy: 'MITIGATE' as const, strategyDescription: 'Weekly pipeline review with all delivery managers. Proactive skill matching initiative.', status: 'MITIGATING' as const, ownerPersonId: '11111111-1111-1111-1111-111111111005', assigneePersonId: '11111111-1111-1111-1111-111111111005', raisedAt: new Date(now.getTime() - 20 * 86400000) },
    { id: 'dd000001-0001-0001-0001-000000000012', projectId: '33333333-3333-3333-3333-333333333001', title: 'Skill gap in cloud engineering', description: 'Only 3 of 12 bench engineers have AWS/Azure certifications needed by incoming projects.', category: 'SCOPE' as const, riskType: 'RISK' as const, probability: 4, impact: 3, strategy: 'MITIGATE' as const, strategyDescription: 'Launch cloud certification program. Partner with training vendor.', status: 'ASSESSED' as const, ownerPersonId: '11111111-1111-1111-1111-111111111005', raisedAt: new Date(now.getTime() - 15 * 86400000) },
  ];

  for (const risk of risks) {
    await prisma.projectRisk.upsert({
      where: { id: risk.id },
      update: {},
      create: { ...risk, updatedAt: new Date() },
    });
  }

   
  console.log(`Seeded ${risks.length} project risks.`);
}

async function seedRagSnapshots(): Promise<void> {
  const now = new Date();
  const snapshots = [];

  // Generate 12 weeks of snapshots for key projects
  const projects = [
    { projectId: '33333333-3333-3333-3333-333333333002', recordedByPersonId: '11111111-1111-1111-1111-111111111010', pattern: 'stable' },   // Delivery Central
    { projectId: '33333333-3333-3333-3333-333333333003', recordedByPersonId: '11111111-1111-1111-1111-111111111006', pattern: 'declining' }, // Atlas ERP
    { projectId: '33333333-3333-3333-3333-333333333001', recordedByPersonId: '11111111-1111-1111-1111-111111111005', pattern: 'improving' }, // Bench Planning
  ];

  for (const proj of projects) {
    for (let week = 11; week >= 0; week--) {
      const weekStart = new Date(now.getTime() - week * 7 * 86400000);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekStr = weekStart.toISOString().slice(0, 10);

      let scopeRag: 'GREEN' | 'AMBER' | 'RED';
      let scheduleRag: 'GREEN' | 'AMBER' | 'RED';
      let budgetRag: 'GREEN' | 'AMBER' | 'RED';
      let peopleRag: 'GREEN' | 'AMBER' | 'RED';

      if (proj.pattern === 'stable') {
        scopeRag = week > 8 ? 'AMBER' : 'GREEN';
        scheduleRag = 'GREEN';
        budgetRag = week > 6 ? 'GREEN' : week > 3 ? 'AMBER' : 'GREEN';
        peopleRag = 'GREEN';
      } else if (proj.pattern === 'declining') {
        scopeRag = week > 6 ? 'GREEN' : week > 3 ? 'AMBER' : 'RED';
        scheduleRag = week > 8 ? 'GREEN' : week > 4 ? 'AMBER' : 'RED';
        budgetRag = week > 5 ? 'GREEN' : 'AMBER';
        peopleRag = week > 7 ? 'GREEN' : week > 2 ? 'AMBER' : 'RED';
      } else {
        scopeRag = week > 8 ? 'RED' : week > 4 ? 'AMBER' : 'GREEN';
        scheduleRag = week > 7 ? 'AMBER' : 'GREEN';
        budgetRag = week > 9 ? 'RED' : week > 5 ? 'AMBER' : 'GREEN';
        peopleRag = week > 6 ? 'AMBER' : 'GREEN';
      }

      const dims = [scopeRag, scheduleRag, budgetRag, peopleRag];
      const overallRag: 'GREEN' | 'AMBER' | 'RED' = dims.includes('RED') ? 'RED' : dims.includes('AMBER') ? 'AMBER' : 'GREEN';

      // Map RAG → 0-25 quadrant score (numeric representation of the band midpoint)
      const ragToScore = (r: 'GREEN' | 'AMBER' | 'RED'): number => r === 'GREEN' ? 22 : r === 'AMBER' ? 14 : 6;
      const scopeScore = ragToScore(scopeRag);
      const scheduleScore = ragToScore(scheduleRag);
      const budgetScore = ragToScore(budgetRag);
      const peopleScore = ragToScore(peopleRag);
      const overallScoreValue = scopeScore + scheduleScore + budgetScore + peopleScore;

      const narrative = week === 0
        ? (proj.pattern === 'stable' ? 'On track. Minor scope adjustments handled through change board.'
          : proj.pattern === 'declining' ? 'Critical path at risk. Vendor delay compounding schedule issues. Escalation in progress.'
          : 'Improving steadily. Cloud certification program showing results. Bench utilization trending down.')
        : null;

      snapshots.push({
        id: `ee000001-${String(proj.projectId.slice(-4))}-0001-0001-${String(week).padStart(12, '0')}`,
        projectId: proj.projectId,
        weekStarting: new Date(weekStr),
        staffingRag: scopeRag,
        scheduleRag,
        budgetRag,
        clientRag: peopleRag,
        scopeRag,
        peopleRag,
        overallRag,
        scopeScore,
        scheduleScore,
        budgetScore,
        peopleScore,
        overallScore: overallScoreValue,
        narrative,
        accomplishments: week === 0 ? 'Completed sprint deliverables. Resolved 3 blockers.' : null,
        nextSteps: week === 0 ? 'Focus on critical path items. Review vendor SLA compliance.' : null,
        recordedByPersonId: proj.recordedByPersonId,
        dimensionDetails: week === 0 ? {
          scope: { staffingFill: { rating: 4, auto: true }, requirementsStability: { rating: 3 }, scopeCreep: { rating: 2, note: 'Multiple change requests' }, deliverableAcceptance: { rating: 4 } },
          schedule: { milestoneAdherence: { rating: proj.pattern === 'declining' ? 2 : 4 }, velocity: { rating: 3 }, timelineDeviation: { rating: proj.pattern === 'declining' ? 1 : 4, auto: true } },
          budget: { spendRate: { rating: 3, auto: true }, forecastAccuracy: { rating: 4 }, capexCompliance: { rating: 4, auto: true } },
          people: { clientSatisfaction: { rating: proj.pattern === 'declining' ? 2 : 4 }, stakeholderEngagement: { rating: 3 }, teamMood: { rating: 4, auto: true } },
        } : Prisma.JsonNull,
        riskSummary: week === 0 ? '2 open risks, 1 critical issue under mitigation' : null,
      });
    }
  }

  for (const snap of snapshots) {
    await prisma.projectRagSnapshot.upsert({
      where: {
        projectId_weekStarting: {
          projectId: snap.projectId,
          weekStarting: snap.weekStarting,
        },
      },
      update: {},
      create: { ...snap, updatedAt: new Date() },
    });
  }

   
  console.log(`Seeded ${snapshots.length} RAG snapshots.`);
}

async function seedProjectMilestones(): Promise<void> {
  const now = new Date();
  const day = 86400000;
  const milestones = [
    // Delivery Central (PRJ-101)
    { id: 'f1000001-0001-0001-0001-000000000001', projectId: '33333333-3333-3333-3333-333333333002', name: 'Phase 1: Architecture sign-off',    plannedDate: new Date(now.getTime() - 120 * day), actualDate: new Date(now.getTime() - 122 * day), status: 'HIT' as const,         description: 'Architecture document reviewed and signed by CTO.' },
    { id: 'f1000001-0001-0001-0001-000000000002', projectId: '33333333-3333-3333-3333-333333333002', name: 'Phase 2: MVP delivery',             plannedDate: new Date(now.getTime() - 60 * day),  actualDate: new Date(now.getTime() - 55 * day),  status: 'HIT' as const,         description: 'Core platform MVP released for stakeholder review.' },
    { id: 'f1000001-0001-0001-0001-000000000003', projectId: '33333333-3333-3333-3333-333333333002', name: 'Phase 3: Beta launch',              plannedDate: new Date(now.getTime() + 14 * day),  actualDate: null, status: 'IN_PROGRESS' as const, description: 'Internal beta rollout to pilot teams.' },
    { id: 'f1000001-0001-0001-0001-000000000004', projectId: '33333333-3333-3333-3333-333333333002', name: 'Phase 4: GA release',               plannedDate: new Date(now.getTime() + 90 * day),  actualDate: null, status: 'PLANNED' as const,     description: 'General availability release to all users.' },
    // Atlas ERP (PRJ-102) — declining
    { id: 'f1000001-0001-0001-0001-000000000005', projectId: '33333333-3333-3333-3333-333333333003', name: 'Data migration sign-off',           plannedDate: new Date(now.getTime() - 30 * day),  actualDate: null, status: 'MISSED' as const,      description: 'Legacy data cleansing and migration — missed due to data quality issues.' },
    { id: 'f1000001-0001-0001-0001-000000000006', projectId: '33333333-3333-3333-3333-333333333003', name: 'Integration testing complete',      plannedDate: new Date(now.getTime() - 10 * day),  actualDate: null, status: 'IN_PROGRESS' as const, description: 'End-to-end testing across ERP modules.' },
    { id: 'f1000001-0001-0001-0001-000000000007', projectId: '33333333-3333-3333-3333-333333333003', name: 'UAT sign-off',                      plannedDate: new Date(now.getTime() + 20 * day),  actualDate: null, status: 'PLANNED' as const,     description: 'User acceptance testing with business stakeholders.' },
    { id: 'f1000001-0001-0001-0001-000000000008', projectId: '33333333-3333-3333-3333-333333333003', name: 'Go-live',                           plannedDate: new Date(now.getTime() + 60 * day),  actualDate: null, status: 'PLANNED' as const,     description: 'Production cutover.' },
    // Beacon Mobile (PRJ-103)
    { id: 'f1000001-0001-0001-0001-000000000009', projectId: '33333333-3333-3333-3333-333333333004', name: 'UI/UX review complete',             plannedDate: new Date(now.getTime() - 45 * day),  actualDate: new Date(now.getTime() - 40 * day),  status: 'HIT' as const,         description: 'Design review with product team.' },
    { id: 'f1000001-0001-0001-0001-00000000000a', projectId: '33333333-3333-3333-3333-333333333004', name: 'Alpha release',                     plannedDate: new Date(now.getTime() + 7 * day),   actualDate: null, status: 'IN_PROGRESS' as const, description: 'Internal alpha on TestFlight.' },
    { id: 'f1000001-0001-0001-0001-00000000000b', projectId: '33333333-3333-3333-3333-333333333004', name: 'App Store submission',              plannedDate: new Date(now.getTime() + 45 * day),  actualDate: null, status: 'PLANNED' as const,     description: 'Apple App Store submission.' },
    // Bench Planning (PRJ-100)
    { id: 'f1000001-0001-0001-0001-00000000000c', projectId: '33333333-3333-3333-3333-333333333001', name: 'Q1 bench review',                   plannedDate: new Date(now.getTime() - 20 * day),  actualDate: new Date(now.getTime() - 18 * day),  status: 'HIT' as const,         description: 'Quarterly bench utilization review.' },
    { id: 'f1000001-0001-0001-0001-00000000000d', projectId: '33333333-3333-3333-3333-333333333001', name: 'Skills matrix refresh',             plannedDate: new Date(now.getTime() + 10 * day),  actualDate: null, status: 'PLANNED' as const,     description: 'Annual skills matrix update.' },
  ];

  for (const m of milestones) {
    await prisma.projectMilestone.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, updatedAt: new Date() },
    });
  }

   
  console.log(`Seeded ${milestones.length} project milestones.`);
}

async function seedProjectChangeRequests(): Promise<void> {
  const now = new Date();
  const day = 86400000;
  const crs = [
    // Delivery Central (PRJ-101) — stable, some CRs
    { id: 'f2000001-0001-0001-0001-000000000001', projectId: '33333333-3333-3333-3333-333333333002', title: 'Add SSO integration',                  description: 'Enterprise customers require SSO via Okta.', status: 'APPROVED' as const,   severity: 'HIGH' as const,     outOfBaseline: false, impactScope: 'New authentication module', impactSchedule: '+2 weeks', impactBudget: '+$40k',  requesterPersonId: '11111111-1111-1111-1111-111111111010', decidedByPersonId: '11111111-1111-1111-1111-111111111004', decidedAt: new Date(now.getTime() - 10 * day), createdAt: new Date(now.getTime() - 14 * day) },
    { id: 'f2000001-0001-0001-0001-000000000002', projectId: '33333333-3333-3333-3333-333333333002', title: 'Support mobile push notifications',    description: 'Out-of-scope but business-critical.',        status: 'APPROVED' as const,   severity: 'MEDIUM' as const,   outOfBaseline: true,  impactScope: 'New notification service', impactSchedule: '+3 weeks', impactBudget: '+$55k', requesterPersonId: '11111111-1111-1111-1111-111111111010', decidedByPersonId: '11111111-1111-1111-1111-111111111004', decidedAt: new Date(now.getTime() - 5 * day),  createdAt: new Date(now.getTime() - 8 * day) },
    { id: 'f2000001-0001-0001-0001-000000000003', projectId: '33333333-3333-3333-3333-333333333002', title: 'Dark mode UI',                         description: 'User-requested feature.',                    status: 'PROPOSED' as const,   severity: 'LOW' as const,      outOfBaseline: true,  impactScope: 'Theme system', impactSchedule: '+1 week', impactBudget: '+$12k', requesterPersonId: '11111111-1111-1111-1111-111111111010', decidedByPersonId: null, decidedAt: null, createdAt: new Date(now.getTime() - 3 * day) },
    { id: 'f2000001-0001-0001-0001-000000000004', projectId: '33333333-3333-3333-3333-333333333002', title: 'Webhook retry logic',                  description: 'Current retry exponential backoff too aggressive.', status: 'REJECTED' as const, severity: 'LOW' as const, outOfBaseline: false, impactScope: 'Minor refactor', impactSchedule: '+2 days', impactBudget: null,   requesterPersonId: '11111111-1111-1111-1111-111111111010', decidedByPersonId: '11111111-1111-1111-1111-111111111004', decidedAt: new Date(now.getTime() - 7 * day), createdAt: new Date(now.getTime() - 9 * day) },
    // Atlas ERP (PRJ-102) — declining, many CRs
    { id: 'f2000001-0001-0001-0001-000000000005', projectId: '33333333-3333-3333-3333-333333333003', title: 'Multi-currency support',               description: 'Global rollout requires EUR/GBP/JPY.',       status: 'APPROVED' as const,   severity: 'CRITICAL' as const, outOfBaseline: true,  impactScope: 'Currency module rewrite', impactSchedule: '+6 weeks', impactBudget: '+$120k', requesterPersonId: '11111111-1111-1111-1111-111111111006', decidedByPersonId: '11111111-1111-1111-1111-111111111004', decidedAt: new Date(now.getTime() - 15 * day), createdAt: new Date(now.getTime() - 20 * day) },
    { id: 'f2000001-0001-0001-0001-000000000006', projectId: '33333333-3333-3333-3333-333333333003', title: 'Tax compliance updates',               description: 'New VAT rules for EU.',                      status: 'APPROVED' as const,   severity: 'HIGH' as const,     outOfBaseline: true,  impactScope: 'Tax engine',   impactSchedule: '+4 weeks', impactBudget: '+$80k',  requesterPersonId: '11111111-1111-1111-1111-111111111006', decidedByPersonId: '11111111-1111-1111-1111-111111111004', decidedAt: new Date(now.getTime() - 8 * day),  createdAt: new Date(now.getTime() - 12 * day) },
    { id: 'f2000001-0001-0001-0001-000000000007', projectId: '33333333-3333-3333-3333-333333333003', title: 'Custom reporting engine',              description: 'Client wants ad-hoc report builder.',        status: 'PROPOSED' as const,   severity: 'HIGH' as const,     outOfBaseline: true,  impactScope: 'New reports module', impactSchedule: '+8 weeks', impactBudget: '+$180k', requesterPersonId: '11111111-1111-1111-1111-111111111006', decidedByPersonId: null, decidedAt: null, createdAt: new Date(now.getTime() - 2 * day) },
    { id: 'f2000001-0001-0001-0001-000000000008', projectId: '33333333-3333-3333-3333-333333333003', title: 'Additional audit fields',              description: 'Compliance auditor request.',                status: 'PROPOSED' as const,   severity: 'MEDIUM' as const,   outOfBaseline: true,  impactScope: 'DB schema',    impactSchedule: '+1 week',  impactBudget: '+$15k',  requesterPersonId: '11111111-1111-1111-1111-111111111006', decidedByPersonId: null, decidedAt: null, createdAt: new Date(now.getTime() - 1 * day) },
    // Bench Planning (PRJ-100) — few CRs
    { id: 'f2000001-0001-0001-0001-000000000009', projectId: '33333333-3333-3333-3333-333333333001', title: 'Include part-time contractors',        description: 'Expand bench analysis scope.',               status: 'APPROVED' as const,   severity: 'LOW' as const,      outOfBaseline: false, impactScope: 'Query expansion', impactSchedule: '+3 days', impactBudget: null,  requesterPersonId: '11111111-1111-1111-1111-111111111005', decidedByPersonId: '11111111-1111-1111-1111-111111111004', decidedAt: new Date(now.getTime() - 25 * day), createdAt: new Date(now.getTime() - 28 * day) },
  ];

  for (const cr of crs) {
    await prisma.projectChangeRequest.upsert({
      where: { id: cr.id },
      update: {},
      create: { ...cr, updatedAt: new Date() },
    });
  }

   
  console.log(`Seeded ${crs.length} change requests.`);
}

async function seedBudgetEvmData(): Promise<void> {
  // Update existing ProjectBudget rows with realistic EVM values
  // Patterns: healthy CPI (0.97), declining (0.82), critical (0.68)
  const evm = [
    // PRJ-101 Delivery Central (healthy)
    { projectId: '33333333-3333-3333-3333-333333333002', fiscalYear: 2026, earnedValue: 485000, actualCost: 500000,  plannedToDate: 500000, eac: 980000,  capexCorrectPct: 0.96 },
    // PRJ-102 Atlas ERP (declining)
    { projectId: '33333333-3333-3333-3333-333333333003', fiscalYear: 2026, earnedValue: 410000, actualCost: 500000,  plannedToDate: 450000, eac: 1100000, capexCorrectPct: 0.87 },
    // PRJ-100 Bench Planning (improving)
    { projectId: '33333333-3333-3333-3333-333333333001', fiscalYear: 2026, earnedValue: 68000,  actualCost: 100000,  plannedToDate: 90000,  eac: 205000,  capexCorrectPct: 0.92 },
    // PRJ-103 Beacon Mobile (stable)
    { projectId: '33333333-3333-3333-3333-333333333004', fiscalYear: 2026, earnedValue: 220000, actualCost: 235000,  plannedToDate: 240000, eac: 475000,  capexCorrectPct: 0.98 },
  ];

  for (const e of evm) {
    await prisma.projectBudget.updateMany({
      where: { projectId: e.projectId, fiscalYear: e.fiscalYear },
      data: {
        earnedValue: e.earnedValue,
        actualCost: e.actualCost,
        plannedToDate: e.plannedToDate,
        eac: e.eac,
        capexCorrectPct: e.capexCorrectPct,
      },
    });
  }

  // Also backfill Project.baselineEndsOn / forecastEndsOn / criticalPathFloatDays / baselineRequirements
  const projectUpdates = [
    { id: '33333333-3333-3333-3333-333333333001', baselineRequirements: 80,  criticalPathFloatDays: 7,  forecastEndsOn: null },
    { id: '33333333-3333-3333-3333-333333333002', baselineRequirements: 150, criticalPathFloatDays: 12, forecastEndsOn: null },
    { id: '33333333-3333-3333-3333-333333333003', baselineRequirements: 200, criticalPathFloatDays: 1,  forecastEndsOn: new Date(Date.now() + 90 * 86400000) },
    { id: '33333333-3333-3333-3333-333333333004', baselineRequirements: 100, criticalPathFloatDays: 5,  forecastEndsOn: null },
    { id: '33333333-3333-3333-3333-333333333005', baselineRequirements: 120, criticalPathFloatDays: 8,  forecastEndsOn: null },
    { id: '33333333-3333-3333-3333-333333333006', baselineRequirements: 90,  criticalPathFloatDays: 15, forecastEndsOn: null },
  ];

  for (const p of projectUpdates) {
    await prisma.project.update({
      where: { id: p.id },
      data: {
        baselineRequirements: p.baselineRequirements,
        criticalPathFloatDays: p.criticalPathFloatDays,
        forecastEndsOn: p.forecastEndsOn,
      },
    });
  }

   
  console.log(`Seeded EVM data for ${evm.length} budgets and radiator fields for ${projectUpdates.length} projects.`);
}

async function seedRadiatorThresholds(): Promise<void> {
  // Demonstrate customized thresholds — tighter CPI for fixed-price projects
  const thresholds = [
    { subDimensionKey: 'costPerformanceIndex', thresholdScore4: 0.98, thresholdScore3: 0.95, thresholdScore2: 0.9, thresholdScore1: 0.8, direction: 'HIGHER_IS_BETTER' as const, updatedByPersonId: '11111111-1111-1111-1111-111111111004' },
    { subDimensionKey: 'teamMood',             thresholdScore4: 4.2,  thresholdScore3: 3.7,  thresholdScore2: 3.2, thresholdScore1: 2.8, direction: 'HIGHER_IS_BETTER' as const, updatedByPersonId: '11111111-1111-1111-1111-111111111004' },
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

async function seedRadiatorOverrides(): Promise<void> {
  // Find a current-week snapshot and attach an override for demo
  const latestSnapshots = await prisma.projectRagSnapshot.findMany({
    where: { projectId: { in: ['33333333-3333-3333-3333-333333333003'] } },
    orderBy: { weekStarting: 'desc' },
    take: 1,
  });

  if (latestSnapshots.length === 0) {
     
    console.log('No snapshot found for override seeding; skipping.');
    return;
  }

  const snap = latestSnapshots[0];
  const override = {
    id: 'f3000001-0001-0001-0001-000000000001',
    snapshotId: snap.id,
    subDimensionKey: 'teamMood',
    autoScore: 3,
    overrideScore: 1,
    reason: 'Team is burning out due to vendor escalation pressure. PM manual assessment lower than pulse data suggests.',
    overriddenByPersonId: '11111111-1111-1111-1111-111111111006',
  };

  await prisma.projectRadiatorOverride.upsert({
    where: { id: override.id },
    update: {},
    create: override,
  });

   
  console.log('Seeded 1 radiator override.');
}

async function seedPhase2Cases(): Promise<void> {
  await seedCaseTypes();

  const onboardingType = await prismaSeed.caseType.findFirst({ where: { key: 'ONBOARDING' } }) as { id: string } | null;
  const performanceType = await prismaSeed.caseType.findFirst({ where: { key: 'PERFORMANCE' } }) as { id: string } | null;
  const offboardingType = await prismaSeed.caseType.findFirst({ where: { key: 'OFFBOARDING' } }) as { id: string } | null;

  if (!onboardingType || !performanceType || !offboardingType) {
    throw new Error('Case types not found after seeding.');
  }

  const cases = [
    {
      id: '33333333-ca5e-0000-0000-000000000001',
      caseNumber: 'CASE-0001',
      caseTypeId: onboardingType.id,
      subjectPersonId: '11111111-1111-1111-1111-111111111008', // Ethan Brooks
      ownerPersonId: '11111111-1111-1111-2222-000000000001',  // Diana Walsh (HR)
      status: 'OPEN',
      summary: 'Onboarding for new engineer hire.',
    },
    {
      id: '33333333-ca5e-0000-0000-000000000002',
      caseNumber: 'CASE-0002',
      caseTypeId: performanceType.id,
      subjectPersonId: '11111111-1111-1111-1111-111111111006', // Sophia Kim
      ownerPersonId: '11111111-1111-1111-2222-000000000001',  // Diana Walsh (HR)
      status: 'OPEN',
      summary: 'Mid-year performance review cycle.',
    },
    {
      id: '33333333-ca5e-0000-0000-000000000003',
      caseNumber: 'CASE-0003',
      caseTypeId: offboardingType.id,
      subjectPersonId: '11111111-1111-1111-1111-111111111003', // Zoe Turner (terminated)
      ownerPersonId: '11111111-1111-1111-2222-000000000001',  // Diana Walsh (HR)
      status: 'OPEN',
      summary: 'Offboarding checklist for departing employee.',
    },
  ];

  for (const c of cases) {
    await prismaSeed.caseRecord.upsert({
      where: { id: c.id },
      create: c,
      update: { status: c.status, summary: c.summary },
    });
  }

   
  console.log(`Seeded ${cases.length} phase2 cases.`);
}

async function seedPhase2Accounts(): Promise<void> {
  // One test account per platform role.
  // Passwords follow pattern <RoleName>Pass1! for easy demo access.
  const accounts = [
    { email: 'noah.bennett@example.com',   password: 'DirectorPass1!',         displayName: 'Noah Bennett',   roles: ['director'],                        personId: '11111111-1111-1111-1111-111111111002' },
    { email: 'diana.walsh@example.com',    password: 'HrManagerPass1!',        displayName: 'Diana Walsh',    roles: ['hr_manager'],                       personId: '11111111-1111-1111-2222-000000000001' },
    { email: 'sophia.kim@example.com',     password: 'ResourceMgrPass1!',      displayName: 'Sophia Kim',     roles: ['resource_manager'],                 personId: '11111111-1111-1111-1111-111111111006' },
    { email: 'lucas.reed@example.com',     password: 'ProjectMgrPass1!',       displayName: 'Lucas Reed',     roles: ['project_manager'],                  personId: '11111111-1111-1111-1111-111111111010' },
    { email: 'carlos.vega@example.com',    password: 'DeliveryMgrPass1!',      displayName: 'Carlos Vega',    roles: ['delivery_manager'],                 personId: '11111111-1111-1111-2222-000000000003' },
    { email: 'ethan.brooks@example.com',   password: 'EmployeePass1!',         displayName: 'Ethan Brooks',   roles: ['employee'],                         personId: '11111111-1111-1111-1111-111111111008' },
    { email: 'emma.garcia@example.com',    password: 'DualRolePass1!',         displayName: 'Emma Garcia',    roles: ['resource_manager', 'hr_manager'],   personId: '11111111-1111-1111-1111-111111111005' },
  ];

  for (const account of accounts) {
    const existing = await prisma.localAccount.findUnique({ where: { email: account.email } });
    if (existing) {
       
      console.log(`Account already exists, skipping: ${account.email}`);
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

     
    console.log(`Phase 2 account seeded: ${account.email} [${account.roles.join(', ')}]`);
  }
}

async function seedLifeDemoAccounts(): Promise<void> {
  // Reuse the same 7 phase2 accounts (same person IDs, same passwords)
  await seedPhase2Accounts();

  // Additional life-demo-only personas
  const extraAccounts = [
    { email: 'jordan.kim@apexdigital.demo',  password: 'EmployeePass1!', displayName: 'Jordan Kim',  roles: ['employee'], personId: '22222222-0000-0000-0000-000000000001' },
    { email: 'alex.torres@apexdigital.demo', password: 'EmployeePass1!', displayName: 'Alex Torres', roles: ['employee'], personId: '22222222-0000-0000-0000-000000000002' },
  ];

  for (const account of extraAccounts) {
    const existing = await prisma.localAccount.findUnique({ where: { email: account.email } });
    if (existing) {
       
      console.log(`Account already exists, skipping: ${account.email}`);
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

     
    console.log(`Life demo account seeded: ${account.email} [${account.roles.join(', ')}]`);
  }
}

async function seedInvestorDemoAccounts(): Promise<void> {
  // One account per platform role, each linked to a real investor-demo person.
  // All share password InvestorDemo1! for easy walkthrough access.
  const accounts = [
    { email: 'catherine.monroe@apexdigital.demo', password: 'InvestorDemo1!', displayName: 'Catherine Monroe', roles: ['director'],          personId: 'id000001-pe00-0000-0000-000000000000' },
    { email: 'laura.petrov@apexdigital.demo',     password: 'InvestorDemo1!', displayName: 'Laura Petrov',     roles: ['hr_manager'],         personId: 'id000007-pe00-0000-0000-000000000000' },
    { email: 'ethan.grant@apexdigital.demo',      password: 'InvestorDemo1!', displayName: 'Ethan Grant',      roles: ['resource_manager'],   personId: 'id000008-pe00-0000-0000-000000000000' },
    { email: 'rafael.moreno@apexdigital.demo',    password: 'InvestorDemo1!', displayName: 'Rafael Moreno',   roles: ['project_manager'],    personId: 'id000028-pe00-0000-0000-000000000000' },
    { email: 'amara.diallo@apexdigital.demo',     password: 'InvestorDemo1!', displayName: 'Amara Diallo',     roles: ['delivery_manager'],   personId: 'id000009-pe00-0000-0000-000000000000' },
    { email: 'aisha.patel@apexdigital.demo',      password: 'InvestorDemo1!', displayName: 'Aisha Patel',      roles: ['employee'],           personId: 'id000013-pe00-0000-0000-000000000000' },
  ];

  for (const account of accounts) {
    const existing = await prisma.localAccount.findUnique({ where: { email: account.email } });
    if (existing) {
       
      console.log(`Account already exists, skipping: ${account.email}`);
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

     
    console.log(`Investor demo account seeded: ${account.email} [${account.roles.join(', ')}]`);
  }
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
async function seedCaseStepsForRealistic(): Promise<void> {
  const STEP_TEMPLATES: Record<string, Array<{ displayName: string; stepKey: string }>> = {
    ONBOARDING: [
      { displayName: 'Provision System Access', stepKey: 'provision-access' },
      { displayName: 'Complete Paperwork', stepKey: 'complete-paperwork' },
      { displayName: 'Meet Your Manager', stepKey: 'meet-manager' },
      { displayName: 'First Day Check-in', stepKey: 'first-day-checkin' },
    ],
    OFFBOARDING: [
      { displayName: 'Exit Interview', stepKey: 'exit-interview' },
      { displayName: 'Revoke System Access', stepKey: 'revoke-access' },
      { displayName: 'Return Equipment', stepKey: 'return-equipment' },
      { displayName: 'Knowledge Transfer', stepKey: 'knowledge-transfer' },
      { displayName: 'Final Payroll Confirmation', stepKey: 'payroll-confirmation' },
    ],
    PERFORMANCE: [
      { displayName: 'Schedule Review Meeting', stepKey: 'schedule-meeting' },
      { displayName: 'Complete Self-Assessment', stepKey: 'self-assessment' },
      { displayName: 'Manager Assessment', stepKey: 'manager-assessment' },
      { displayName: 'Define Improvement Goals', stepKey: 'define-goals' },
    ],
    TRANSFER: [
      { displayName: 'Transfer Request Approved', stepKey: 'transfer-approved' },
      { displayName: 'Knowledge Handover', stepKey: 'knowledge-handover' },
      { displayName: 'New Team Onboarding', stepKey: 'new-team-onboarding' },
    ],
  };

  let count = 0;
  for (const c of realisticCases) {
    const steps = STEP_TEMPLATES[c.caseTypeKey] ?? [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isCompleted = i === 0;
      count++;
      await prismaSeed.caseStep.create({
        data: {
          id: `cccc0002-c500-0000-${String(count).padStart(4, '0')}-000000000000`,
          caseRecordId: c.id,
          stepKey: step.stepKey,
          displayName: step.displayName,
          status: isCompleted ? 'COMPLETED' : 'OPEN',
          completedAt: isCompleted ? new Date() : null,
        },
      });
    }
  }
   
  console.log(`  Case steps: ${count} steps for ${realisticCases.length} cases`);
}

async function seedRealisticPersonSkills(): Promise<void> {
  // Map skills to people based on their defined skillsets
  const skillMap: Record<string, string> = {
    TYPESCRIPT: '55555555-5c00-0000-0000-000000000001',
    JAVASCRIPT: '55555555-5c00-0000-0000-000000000002',
    PYTHON: '55555555-5c00-0000-0000-000000000003',
    JAVA: '55555555-5c00-0000-0000-000000000004',
    GO: '55555555-5c00-0000-0000-000000000006',
    REACT: '55555555-5c00-0000-0000-000000000007',
    ANGULAR: '55555555-5c00-0000-0000-000000000008',
    NESTJS: '55555555-5c00-0000-0000-000000000010',
    SPRING: '55555555-5c00-0000-0000-000000000011',
    POSTGRESQL: '55555555-5c00-0000-0000-000000000012',
    SQL: '55555555-5c00-0000-0000-000000000012',
    DOCKER: '55555555-5c00-0000-0000-000000000018',
    KUBERNETES: '55555555-5c00-0000-0000-000000000019',
    TERRAFORM: '55555555-5c00-0000-0000-000000000020',
    AWS: '55555555-5c00-0000-0000-000000000015',
    AGILE: '55555555-5c00-0000-0000-000000000022',
    PMO: '55555555-5c00-0000-0000-000000000023',
    DATA: '55555555-5c00-0000-0000-000000000024',
    SPARK: '55555555-5c00-0000-0000-000000000024',
    SNOWFLAKE: '55555555-5c00-0000-0000-000000000024',
    NODE: '55555555-5c00-0000-0000-000000000010',
    TENSORFLOW: '55555555-5c00-0000-0000-000000000025',
    AIRFLOW: '55555555-5c00-0000-0000-000000000024',
  };

  let count = 0;
  for (const person of realisticPeople) {
    const seenSkills = new Set<string>();
    for (const skillKey of (person.skillsets ?? [])) {
      const skillId = skillMap[skillKey];
      if (!skillId || seenSkills.has(skillId)) continue;
      seenSkills.add(skillId);
      count++;
      try {
        await prismaSeed.personSkill.create({
          data: {
            id: `cccc0003-ps00-0000-${String(count).padStart(4, '0')}-000000000000`,
            personId: person.id,
            skillId,
            proficiency: person.grade === 'G10' || person.grade === 'G11' ? 5 : (person.grade === 'G9' ? 4 : 3),
          },
        });
      } catch {
        // Skip duplicates
      }
    }
  }
   
  console.log(`  Person skills: ${count} assignments`);
}

async function seedRealisticAccounts(): Promise<void> {
  const adminPersonId = '00000000-0000-0000-0000-000000000001';

  // Create admin person if not exists
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

  for (const account of realisticAccounts) {
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
        personId: account.email === 'admin@deliverycentral.local' ? adminPersonId : account.personId,
        twoFactorEnabled: false,
        backupCodesHash: [],
        mustChangePw: false,
      },
    });

     
    console.log(`  Account seeded: ${account.email} [${account.roles.join(', ')}]`);
  }
}

async function createManyInChunks(table: string, data: unknown[], chunkSize = 1000): Promise<void> {
  for (let index = 0; index < data.length; index += chunkSize) {
    await prismaSeed[table].createMany({
      data: data.slice(index, index + chunkSize),
    });
  }
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

  return process.env.SEED_PROFILE ?? 'enterprise';
}

async function main(): Promise<void> {
  const profile = parseSeedProfile(process.argv.slice(2));
  await clearExistingData();

  if (profile === 'demo') {
    await seedDataset({
      assignmentApprovals: demoAssignmentApprovals,
      assignmentHistory: demoAssignmentHistory,
      assignments: demoAssignments,
      externalSyncStates: demoExternalSyncStates,
      orgUnits: demoOrgUnits,
      people: demoPeople,
      personOrgMemberships: demoPersonOrgMemberships,
      positions: demoPositions,
      projectExternalLinks: demoProjectExternalLinks,
      projects: demoProjects,
      reportingLines: demoReportingLines,
      resourcePoolMemberships: demoResourcePoolMemberships,
      resourcePools: demoResourcePools,
      summary: demoDatasetSummary,
      workEvidence: demoWorkEvidence,
      workEvidenceLinks: demoWorkEvidenceLinks,
      workEvidenceSources: demoWorkEvidenceSources,
    });

     
    console.log('Demo dataset seeded.', demoDatasetSummary);
    await seedSuperadmin();
    await seedNotificationInfrastructure();
    return;
  }

  if (profile === 'bank-scale') {
    const { bankScaleDataset, bankScaleProfileSummary } = await import('./seeds/bank-scale-profile');
    await seedDataset({
      assignmentApprovals: bankScaleDataset.assignmentApprovals,
      assignmentHistory: bankScaleDataset.assignmentHistory,
      assignments: bankScaleDataset.assignments,
      externalSyncStates: bankScaleDataset.externalSyncStates,
      orgUnits: bankScaleDataset.orgUnits,
      people: bankScaleDataset.people,
      personOrgMemberships: bankScaleDataset.personOrgMemberships,
      positions: bankScaleDataset.positions,
      projectExternalLinks: bankScaleDataset.projectExternalLinks,
      projects: bankScaleDataset.projects,
      reportingLines: bankScaleDataset.reportingLines,
      resourcePoolMemberships: bankScaleDataset.resourcePoolMemberships,
      resourcePools: bankScaleDataset.resourcePools,
      summary: bankScaleDataset.summary,
      workEvidence: bankScaleDataset.workEvidence,
      workEvidenceLinks: bankScaleDataset.workEvidenceLinks,
      workEvidenceSources: bankScaleDataset.workEvidenceSources,
    });

    // Global-config seeds (profile-agnostic — query-driven, no hardcoded
    // phase2 UUIDs). Cover the new schema's metadata-driven entities:
    // dictionaries (incl. assignment-rejection-reasons / case-kind-assignment-
    // escalation / staffing-roles from Workflow Overhaul Phase 1), skill
    // catalog, case types, radiator thresholds, platform settings, and the
    // full notification channel/template/request graph. Per-project entities
    // (BudgetApproval, ProjectMilestones, ProjectChangeRequests at scale)
    // remain to be added with bank-scale-flavored generators.
    await seedMetadata();
    await seedPlatformSettings();
    await seedSkills();
    await seedCaseTypes();
    await seedRadiatorThresholds();

    console.log('Bank-scale dataset seeded.', bankScaleProfileSummary);
    await seedSuperadmin();
    await seedFullNotificationInfrastructure();
    return;
  }

  if (profile === 'phase2') {
    await seedDataset({
      assignmentApprovals: allPhase2AssignmentApprovals,
      assignmentHistory: phase2AssignmentHistory,
      assignments: phase2Assignments,
      externalSyncStates: phase2ExternalSyncStates,
      orgUnits: phase2OrgUnits,
      people: phase2People,
      personOrgMemberships: phase2PersonOrgMemberships,
      positions: phase2Positions,
      projectExternalLinks: phase2ProjectExternalLinks,
      projects: phase2Projects,
      reportingLines: phase2ReportingLines,
      resourcePoolMemberships: phase2ResourcePoolMemberships,
      resourcePools: phase2ResourcePools,
      summary: phase2DatasetSummary,
      workEvidence: phase2WorkEvidence,
      workEvidenceLinks: phase2WorkEvidenceLinks,
      workEvidenceSources: phase2WorkEvidenceSources,
    });

    await createManyInChunks('staffingRequest', phase2StaffingRequests);
    await createManyInChunks('staffingRequestFulfilment', phase2StaffingRequestFulfilments);

    await seedPlannerData();

    await seedPhase2Cases();
    await seedCaseSteps();
    await seedMetadata();
    await seedPlatformSettings();
    await seedSkills();
    await seedTimesheets();
    await seedPulseEntries();
    await seedInAppNotifications();
    await seedProjectRisks();
    await seedProjectMilestones();
    await seedProjectChangeRequests();
    await seedBudgetEvmData();
    await seedRadiatorThresholds();
    await seedRagSnapshots();
    await seedRadiatorOverrides();

     
    console.log('Phase 2 dataset seeded.', phase2DatasetSummary);
    await seedSuperadmin();
    await seedPhase2Accounts();
    await seedFullNotificationInfrastructure();
    return;
  }

  if (profile === 'life-demo') {
    await seedDataset({
      assignmentApprovals: lifeDemoAssignmentApprovals,
      assignmentHistory: lifeDemoAssignmentHistory,
      assignments: lifeDemoAssignments,
      externalSyncStates: lifeDemoExternalSyncStates,
      orgUnits: lifeDemoOrgUnits,
      people: lifeDemoPeople,
      personOrgMemberships: lifeDemoPersonOrgMemberships,
      positions: lifeDemoPositions,
      projectExternalLinks: lifeDemoProjectExternalLinks,
      projects: lifeDemoProjects,
      reportingLines: lifeDemoReportingLines,
      resourcePoolMemberships: lifeDemoResourcePoolMemberships,
      resourcePools: lifeDemoResourcePools,
      summary: lifeDemoDatasetSummary,
      workEvidence: lifeDemoWorkEvidence,
      workEvidenceLinks: lifeDemoWorkEvidenceLinks,
      workEvidenceSources: lifeDemoWorkEvidenceSources,
    });

    await seedCaseTypes();

     
    console.log('Life demo dataset seeded.', lifeDemoDatasetSummary);
    await seedSuperadmin();
    await seedLifeDemoAccounts();
    await seedNotificationInfrastructure();
    return;
  }

  if (profile === 'investor-demo') {
    await seedDataset({
      assignmentApprovals: idAssignmentApprovals,
      assignmentHistory: idAssignmentHistory,
      assignments: idAssignments,
      externalSyncStates: idExternalSyncStates,
      orgUnits: idOrgUnits,
      people: idPeople,
      personOrgMemberships: idPersonOrgMemberships,
      positions: idPositions,
      projectExternalLinks: idProjectExternalLinks,
      projects: idProjects,
      reportingLines: idReportingLines,
      resourcePoolMemberships: idResourcePoolMemberships,
      resourcePools: idResourcePools,
      summary: idDatasetSummary,
      workEvidence: idWorkEvidence,
      workEvidenceLinks: idWorkEvidenceLinks,
      workEvidenceSources: idWorkEvidenceSources,
    });

    await createManyInChunks('staffingRequest', idStaffingRequests);
    await createManyInChunks('staffingRequestFulfilment', idStaffingRequestFulfilments);

    await seedCaseTypes();
    await seedMetadata();
    await seedPlatformSettings();
    await seedSkills();

     
    console.log('Investor demo dataset seeded.', idDatasetSummary);
    await seedSuperadmin();
    await seedInvestorDemoAccounts();
    await seedFullNotificationInfrastructure();
    return;
  }

  if (profile === 'realistic' || profile === 'enterprise') {
    await seedDataset({
      activityEvents: realisticActivityEvents,
      assignmentApprovals: realisticAssignmentApprovals,
      assignmentHistory: realisticAssignmentHistory,
      assignments: realisticAssignments,
      externalSyncStates: realisticExternalSyncStates,
      orgUnits: realisticOrgUnits,
      people: realisticPeople,
      personOrgMemberships: realisticPersonOrgMemberships,
      positions: realisticPositions,
      projectExternalLinks: realisticProjectExternalLinks,
      projects: realisticProjects,
      reportingLines: realisticReportingLines,
      resourcePoolMemberships: realisticResourcePoolMemberships,
      resourcePools: realisticResourcePools,
      summary: realisticDatasetSummary,
      workEvidence: realisticWorkEvidence,
      workEvidenceLinks: realisticWorkEvidenceLinks,
      workEvidenceSources: realisticWorkEvidenceSources,
    });

    await createManyInChunks('staffingRequest', realisticStaffingRequests);
    await createManyInChunks('staffingRequestFulfilment', realisticStaffingRequestFulfilments);

    // Timesheets — 24 weeks for all assigned people
    const { weeks, entries } = generateTimesheets();
    await createManyInChunks('timesheetWeek', weeks);
    await createManyInChunks('timesheetEntry', entries);

    // Pulse entries — 24 weeks for all ICs
    const pulseEntries = generatePulseEntries();
    await createManyInChunks('pulseEntry', pulseEntries);

    // Cases
    await seedCaseTypes();
    const onboardingType = await prismaSeed.caseType.findFirst({ where: { key: 'ONBOARDING' } }) as { id: string } | null;
    const performanceType = await prismaSeed.caseType.findFirst({ where: { key: 'PERFORMANCE' } }) as { id: string } | null;
    const offboardingType = await prismaSeed.caseType.findFirst({ where: { key: 'OFFBOARDING' } }) as { id: string } | null;
    const transferType = await prismaSeed.caseType.findFirst({ where: { key: 'TRANSFER' } }) as { id: string } | null;

    const caseTypeMap: Record<string, string> = {
      ONBOARDING: onboardingType?.id ?? '',
      PERFORMANCE: performanceType?.id ?? '',
      OFFBOARDING: offboardingType?.id ?? '',
      TRANSFER: transferType?.id ?? '',
    };

    for (const c of realisticCases) {
      await prismaSeed.caseRecord.create({
        data: {
          id: c.id,
          caseNumber: c.caseNumber,
          caseTypeId: caseTypeMap[c.caseTypeKey],
          subjectPersonId: c.subjectPersonId,
          ownerPersonId: c.ownerPersonId,
          status: c.status,
          summary: c.summary,
        },
      });
    }

    // Case steps for each case
    await seedCaseStepsForRealistic();

    // In-app notifications
    const notifications = generateNotifications();
    await createManyInChunks('inAppNotification', notifications);

    // Infrastructure
    await seedMetadata();
    await seedPlatformSettings();
    await seedSkills();
    await seedFullNotificationInfrastructure();

    // Assign skills to key people
    await seedRealisticPersonSkills();

     
    console.log(`${profile === 'enterprise' ? 'Enterprise' : 'Realistic'} dataset seeded.`, realisticDatasetSummary);
    console.log(`  Timesheets: ${weeks.length} weeks, ${entries.length} entries`);
    console.log(`  Pulse entries: ${pulseEntries.length}`);
    console.log(`  Notifications: ${notifications.length}`);

    // Accounts
    await seedRealisticAccounts();
    return;
  }

  throw new Error(`Unsupported seed profile "${profile}".`);
}

// DM-R-10 — atomic-like seed guarantee.
//
// We do not wrap main() in a single prisma.$transaction — the bank-scale
// profile would OOM Postgres and the `idle_in_transaction_session_timeout`
// budget is not forgiving enough across a 2k-line, multi-minute seed run.
//
// Instead: on failure, rewind to an empty-DB state by calling
// clearExistingData() again. The guarantee is "no partial seeded state
// survives a failed seed", which is the property the original
// transaction wrap was intended to provide.
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
