import { ApiTestClient } from '../api-test-client.helper';
import { roleHeaders } from '../api/auth-headers';
import { runUatHappyPathStaffingScenario } from './run-uat-happy-path-staffing';
import { runUatStaffingAnomaliesScenario } from './run-uat-staffing-anomalies';
import { uatDashboardsFixture } from '../../scenarios/uat-dashboards/uat-dashboards.fixture';
import { uatStaffingAnomaliesFixture } from '../../scenarios/uat-staffing-anomalies/uat-staffing-anomalies.fixture';

export interface UatDashboardsScenarioResult {
  createdEmployeeId: string;
  exceptionCategories: string[];
  hrHeadcountDelta: number;
  integrationStatuses: string[];
  managedProjectIds: string[];
  notificationEvents: string[];
  teamId: string;
}

export async function runUatDashboardsScenario(
  client: ApiTestClient,
): Promise<UatDashboardsScenarioResult> {
  const baselineHrDashboard = await client
    .get(
      `/dashboard/hr-manager/${uatDashboardsFixture.roles.hrManager.personId}?asOf=${encodeURIComponent(
        uatDashboardsFixture.timeline.roleSnapshotAsOf,
      )}`,
    )
    .expect(200);

  const baselineHeadcount = baselineHrDashboard.body.headcountSummary.totalHeadcount as number;

  const happyPathResult = await runUatHappyPathStaffingScenario(client, {
    skipNotificationChecks: true,
  });
  // Run-only — return value isn't asserted; the scenario's side effects on
  // the test DB are what subsequent assertions depend on.
  await runUatStaffingAnomaliesScenario(client, {
    expectM365Failure: false,
  });

  const projectManagerDashboard = await client
    .get(
      `/dashboard/project-manager/${uatDashboardsFixture.roles.projectManager.personId}?asOf=${encodeURIComponent(
        uatDashboardsFixture.timeline.staffingScenarioAsOf,
      )}`,
    )
    .expect(200);

  expect(projectManagerDashboard.body.person.displayName).toBe('Sophia Kim');
  expect(projectManagerDashboard.body.managedProjects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: happyPathResult.projectId,
        name: 'UAT Staffing Scenario Project',
      }),
    ]),
  );
  expect(projectManagerDashboard.body.projectsWithEvidenceAnomalies).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        projectId: uatDashboardsFixture.expectedProjectManagerSignals.evidenceAnomalyProjectId,
      }),
    ]),
  );
  expect(projectManagerDashboard.body.projectsWithStaffingGaps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        projectId: uatDashboardsFixture.expectedProjectManagerSignals.staffingGapProjectId,
      }),
    ]),
  );

  const resourceManagerDashboard = await client
    .get(
      `/dashboard/resource-manager/${uatDashboardsFixture.roles.resourceManager.personId}?asOf=${encodeURIComponent(
        uatDashboardsFixture.timeline.roleSnapshotAsOf,
      )}`,
    )
    .expect(200);

  expect(resourceManagerDashboard.body.person.displayName).toBe('Olivia Chen');
  expect(resourceManagerDashboard.body.summary.managedTeamCount).toBe(1);
  expect(resourceManagerDashboard.body.teamCapacitySummary).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        teamName: uatDashboardsFixture.expectedResourceManagerSignals.teamName,
      }),
    ]),
  );
  expect(resourceManagerDashboard.body.peopleWithoutAssignments).toEqual(
    expect.arrayContaining(
      uatDashboardsFixture.expectedResourceManagerSignals.unassignedPersonIds.map((personId) =>
        expect.objectContaining({ personId }),
      ),
    ),
  );
  expect(resourceManagerDashboard.body.teamsInMultipleActiveProjects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        teamId: uatDashboardsFixture.expectedResourceManagerSignals.teamsInMultipleActiveProjectsTeamId,
      }),
    ]),
  );

  const hrDashboard = await client
    .get(
      `/dashboard/hr-manager/${uatDashboardsFixture.roles.hrManager.personId}?asOf=${encodeURIComponent(
        uatDashboardsFixture.timeline.adminAsOf,
      )}`,
    )
    .expect(200);

  expect(hrDashboard.body.person.displayName).toBe('Emma Garcia');
  expect(hrDashboard.body.headcountSummary.totalHeadcount).toBe(baselineHeadcount + 3);
  expect(hrDashboard.body.employeesWithoutManager).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ displayName: 'Uat Inactive Employee' }),
      expect.objectContaining({ displayName: 'Uat Active Employee' }),
    ]),
  );

  const teamDashboard = await client
    .get(
      `/teams/${uatDashboardsFixture.roles.teamDelivery.teamId}/dashboard?asOf=${encodeURIComponent(
        uatDashboardsFixture.timeline.roleSnapshotAsOf,
      )}`,
    )
    .expect(200);

  expect(teamDashboard.body.team.name).toBe(uatDashboardsFixture.roles.teamDelivery.teamName);
  expect(teamDashboard.body.teamMemberCount).toBe(
    uatDashboardsFixture.expectedTeamDashboard.teamMemberCount,
  );
  expect(teamDashboard.body.activeAssignmentsCount).toBe(
    uatDashboardsFixture.expectedTeamDashboard.activeAssignmentsCount,
  );
  expect(teamDashboard.body.projectCount).toBe(uatDashboardsFixture.expectedTeamDashboard.projectCount);
  expect(teamDashboard.body.anomalySummary.openExceptionCount).toBe(
    uatDashboardsFixture.expectedTeamDashboard.openExceptionCount,
  );
  expect(teamDashboard.body.peopleWithNoAssignments.length).toBeGreaterThan(0);

  await client
    .post('/notifications/test-send')
    .set(roleHeaders(uatDashboardsFixture.admin.role))
    .send({
      channelKey: 'email',
      payload: {
        assignmentId: 'UAT-DASHBOARD-001',
        projectId: happyPathResult.projectId,
        staffingRole: 'Dashboard Validation',
      },
      recipient: 'ops@example.com',
      templateKey: 'assignment-created-email',
    })
    .expect(201);

  const diagnostics = await client.get('/diagnostics').expect(200);
  expect(diagnostics.body).toEqual(
    expect.objectContaining({
      database: expect.any(Object),
      integrations: expect.any(Object),
      notifications: expect.any(Object),
      service: expect.any(String),
    }),
  );

  const notificationOutcomes = await client
    .get('/notifications/outcomes')
    .set(roleHeaders(uatDashboardsFixture.admin.role))
    .expect(200);
  expect(notificationOutcomes.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        eventName: 'test.assignment-created-email',
        status: 'SUCCEEDED',
      }),
    ]),
  );

  const integrationHistory = await client
    .get('/integrations/history?limit=10')
    .set(roleHeaders(uatDashboardsFixture.admin.role))
    .expect(200);
  expect(integrationHistory.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        integrationType: 'm365',
        status: expect.stringMatching(/^(FAILED|SUCCEEDED)$/),
      }),
    ]),
  );

  const exceptionQueue = await client
    .get(`/exceptions?asOf=${encodeURIComponent(uatStaffingAnomaliesFixture.exceptionAsOf)}`)
    .set(roleHeaders(uatDashboardsFixture.admin.role))
    .expect(200);
  expect(exceptionQueue.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS' }),
      expect.objectContaining({ category: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT' }),
      expect.objectContaining({ category: 'ASSIGNMENT_WITHOUT_EVIDENCE' }),
    ]),
  );

  const auditRecords = await client
    .get('/audit/business?limit=200')
    .set(roleHeaders(uatDashboardsFixture.admin.role))
    .expect(200);
  expect(auditRecords.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ actionType: 'employee.created' }),
      expect.objectContaining({ actionType: 'assignment.approved' }),
      expect.objectContaining({ actionType: 'integration.sync_run' }),
      expect.objectContaining({ actionType: 'notification.send_result' }),
    ]),
  );

  return {
    createdEmployeeId: happyPathResult.createdEmployeeId,
    exceptionCategories: (exceptionQueue.body.items as Array<{ category: string }>).map(
      (item) => item.category,
    ),
    hrHeadcountDelta: (hrDashboard.body.headcountSummary.totalHeadcount as number) - baselineHeadcount,
    integrationStatuses: (integrationHistory.body as Array<{ status: string }>).map(
      (item) => item.status,
    ),
    managedProjectIds: (projectManagerDashboard.body.managedProjects as Array<{ id: string }>).map(
      (item) => item.id,
    ),
    notificationEvents: (notificationOutcomes.body as Array<{ eventName: string }>).map(
      (item) => item.eventName,
    ),
    teamId: teamDashboard.body.team.id as string,
  };
}
