export const uatHappyPathStaffingFixture = {
  actors: {
    admin: '11111111-1111-1111-1111-111111111005',
    hrManager: '11111111-1111-1111-1111-111111111005',
    lineManager: '11111111-1111-1111-1111-111111111006',
    projectManager: '11111111-1111-1111-1111-111111111006',
    resourceManager: '11111111-1111-1111-1111-111111111004',
  },
  dates: {
    assignmentEnd: '2025-05-31T00:00:00.000Z',
    assignmentStart: '2025-05-06T00:00:00.000Z',
    employeeDashboardAsOfActive: '2025-05-20T00:00:00.000Z',
    employeeDashboardAsOfEnded: '2025-06-10T00:00:00.000Z',
    evidenceRecordedAt: '2025-05-15T09:00:00.000Z',
    managerScopeAsOf: '2025-05-20T00:00:00.000Z',
    projectPlannedEnd: '2025-06-30T00:00:00.000Z',
    projectStart: '2025-05-05T00:00:00.000Z',
    reportingLineStart: '2025-05-01T00:00:00.000Z',
  },
  employee: {
    email: 'uat.staffing.analyst@example.com',
    grade: 'G8',
    name: 'Uat Staffing Analyst',
    orgUnitId: '22222222-2222-2222-2222-222222222005',
    role: 'Business Analyst',
    skillsets: ['Delivery', 'Analysis'],
    status: 'ACTIVE' as const,
  },
  expectations: {
    auditActionTypes: [
      'employee.created',
      'reporting_line.changed',
      'project.created',
      'project.activated',
      'assignment.created',
      'assignment.approved',
      'assignment.ended',
      'notification.send_result',
    ],
    notificationEvents: ['project.activated', 'assignment.created', 'assignment.approved'],
  },
  project: {
    description: 'Deterministic UAT project for the core staffing happy path.',
    name: 'UAT Staffing Happy Path Project',
    projectCode: 'PRJ-UAT-STAFF-001',
  },
  scenarioKey: 'uat-happy-path-staffing-v1',
  workEvidence: {
    effortHours: 6.5,
    sourceRecordKey: 'UAT-HAPPY-STAFFING-001',
    sourceType: 'MANUAL',
    summary: 'Deterministic manual work evidence for the UAT staffing happy path.',
  },
  assignment: {
    allocationPercent: 50,
    note: 'UAT staffing happy path assignment.',
    staffingRole: 'Business Analyst',
  },
} as const;

export type UatHappyPathStaffingFixture = typeof uatHappyPathStaffingFixture;
