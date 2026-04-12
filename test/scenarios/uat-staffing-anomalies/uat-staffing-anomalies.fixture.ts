export const uatStaffingAnomaliesFixture = {
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
  inactiveEmployee: {
    email: 'uat.anomaly.inactive.employee@example.com',
    name: 'Uat Inactive Employee',
    orgUnitId: '22222222-2222-2222-2222-222222222005',
    status: 'INACTIVE' as const,
  },
  activeScenarioEmployee: {
    email: 'uat.anomaly.active.employee@example.com',
    name: 'Uat Active Employee',
    orgUnitId: '22222222-2222-2222-2222-222222222005',
    status: 'ACTIVE' as const,
  },
  projects: {
    anomalyProject: {
      description: 'Scenario project used to surface staffing and closure anomalies.',
      name: 'UAT Anomaly Scenario Project',
      plannedEndDate: '2025-09-30T00:00:00.000Z',
      startDate: '2025-06-01T00:00:00.000Z',
    },
    bulkProject: {
      description: 'Scenario project used for bulk partial-failure validation.',
      name: 'UAT Bulk Partial Failure Project',
      plannedEndDate: '2025-10-31T00:00:00.000Z',
      startDate: '2025-06-10T00:00:00.000Z',
    },
  },
  assignment: {
    allocationPercent: 60,
    endDate: '2025-08-31T00:00:00.000Z',
    staffingRole: 'Delivery Consultant',
    startDate: '2025-07-01T00:00:00.000Z',
  },
  bulkAssignment: {
    allocationPercent: 40,
    staffingRole: 'Analyst',
    startDate: '2025-07-10T00:00:00.000Z',
  },
  evidenceWithoutAssignment: {
    effortHours: 5,
    personId: '11111111-1111-1111-1111-111111111011',
    recordedAt: '2025-07-12T00:00:00.000Z',
    sourceRecordKey: 'UAT-ANOM-EVIDENCE-001',
    sourceType: 'MANUAL' as const,
    summary: 'Observed delivery work with no formal staffing record.',
  },
  futureManagerChange: {
    beforeAsOf: '2025-06-30T00:00:00.000Z',
    personId: '11111111-1111-1111-1111-111111111012',
    previousManagerId: '11111111-1111-1111-1111-111111111004',
    nextManagerId: '11111111-1111-1111-1111-111111111006',
    startDate: '2025-07-01T00:00:00.000Z',
    afterAsOf: '2025-07-15T00:00:00.000Z',
    type: 'SOLID' as const,
  },
  exceptionAsOf: '2025-08-01T00:00:00.000Z',
  plannedVsActualAsOf: '2025-07-20T00:00:00.000Z',
} as const;
