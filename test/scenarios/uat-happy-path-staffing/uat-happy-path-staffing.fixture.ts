export const uatHappyPathStaffingFixture = {
  actors: {
    admin: {
      personId: '11111111-1111-1111-1111-111111111005',
      role: 'admin',
    },
    hrManager: {
      personId: '11111111-1111-1111-1111-111111111005',
      role: 'hr_manager',
    },
    projectManager: {
      personId: '11111111-1111-1111-1111-111111111006',
      role: 'project_manager',
    },
    resourceManager: {
      personId: '11111111-1111-1111-1111-111111111004',
      role: 'resource_manager',
    },
  },
  employee: {
    email: 'uat.staffing.employee@example.com',
    grade: 'G8',
    name: 'Uat Staffing Employee',
    orgUnitId: '22222222-2222-2222-2222-222222222005',
    role: 'Delivery Consultant',
    skillsets: ['Java', 'Testing'],
    status: 'ACTIVE' as const,
  },
  expectedBusinessAuditActionTypes: [
    'employee.created',
    'reporting_line.changed',
    'project.created',
    'project.activated',
    'assignment.created',
    'assignment.approved',
    'assignment.ended',
    'notification.send_result',
  ],
  expectedNotificationEvents: [
    'project.activated',
    'assignment.created',
    'assignment.approved',
  ],
  project: {
    description: 'Deterministic UAT staffing scenario project.',
    name: 'UAT Staffing Scenario Project',
    plannedEndDate: '2025-09-30T00:00:00.000Z',
    startDate: '2025-06-15T00:00:00.000Z',
  },
  reportingLine: {
    startDate: '2025-06-16T00:00:00.000Z',
    type: 'SOLID' as const,
  },
  timeline: {
    asOfAfterAssignmentEnd: '2025-08-02T00:00:00.000Z',
    asOfDuringAssignment: '2025-07-15T00:00:00.000Z',
  },
  assignment: {
    allocationPercent: 50,
    endDate: '2025-07-31T00:00:00.000Z',
    note: 'UAT happy-path assignment request.',
    staffingRole: 'Delivery Consultant',
    startDate: '2025-07-01T00:00:00.000Z',
  },
  approval: {
    comment: 'Approved during UAT happy-path scenario.',
  },
  assignmentEnd: {
    endDate: '2025-07-31T00:00:00.000Z',
    reason: 'UAT happy-path work completed.',
  },
  workEvidence: {
    effortHours: 6,
    recordedAt: '2025-07-15T00:00:00.000Z',
    sourceRecordKey: 'UAT-STAFFING-EVIDENCE-001',
    sourceType: 'MANUAL' as const,
    summary: 'UAT happy-path work evidence captured for the staffed project.',
  },
} as const;
