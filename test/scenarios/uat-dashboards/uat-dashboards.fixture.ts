export const uatDashboardsFixture = {
  admin: {
    role: 'admin',
  },
  roles: {
    hrManager: {
      personId: '11111111-1111-1111-1111-111111111005',
      route: '/dashboard/hr',
    },
    projectManager: {
      personId: '11111111-1111-1111-1111-111111111006',
      route: '/dashboard/project-manager',
    },
    resourceManager: {
      personId: '11111111-1111-1111-1111-111111111003',
      route: '/dashboard/resource-manager',
    },
    teamDelivery: {
      route: '/teams/26666666-0000-0000-0000-000000000001/dashboard',
      teamId: '26666666-0000-0000-0000-000000000001',
      teamName: 'Engineering Pool',
    },
  },
  timeline: {
    adminAsOf: '2025-08-01T00:00:00.000Z',
    roleSnapshotAsOf: '2025-03-15T00:00:00.000Z',
    staffingScenarioAsOf: '2025-07-15T00:00:00.000Z',
  },
  expectedProjectManagerSignals: {
    evidenceAnomalyProjectId: '33333333-3333-3333-3333-333333333005',
    staffingGapProjectId: '33333333-3333-3333-3333-333333333004',
  },
  expectedResourceManagerSignals: {
    teamName: 'Engineering Pool',
    teamsInMultipleActiveProjectsTeamId: '26666666-0000-0000-0000-000000000001',
    unassignedPersonIds: [
      '11111111-1111-1111-1111-111111111006',
      '11111111-1111-1111-1111-111111111007',
    ],
  },
  expectedTeamDashboard: {
    activeAssignmentsCount: 2,
    openExceptionCount: 1,
    projectCount: 2,
    teamMemberCount: 4,
  },
} as const;
