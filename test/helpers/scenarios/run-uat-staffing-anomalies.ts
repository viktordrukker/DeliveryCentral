import { ApiTestClient } from '../api-test-client.helper';
import { roleHeaders } from '../api/auth-headers';
import { expectErrorResponseShape, expectSafeErrorResponseShape } from '../api/api-response-assertions';
import { uatStaffingAnomaliesFixture } from '../../scenarios/uat-staffing-anomalies/uat-staffing-anomalies.fixture';

export interface UatStaffingAnomaliesResult {
  activeEmployeeId: string;
  anomalyProjectId: string;
  bulkProjectId: string;
  closureConflictExceptionId: string;
  plannedVsActualAnomalyTypes: string[];
}

export interface RunUatStaffingAnomaliesScenarioOptions {
  expectM365Failure?: boolean;
}

export async function runUatStaffingAnomaliesScenario(
  client: ApiTestClient,
  options: RunUatStaffingAnomaliesScenarioOptions = {},
): Promise<UatStaffingAnomaliesResult> {
  const peopleBefore = await client.get('/org/people?page=1&pageSize=100').expect(200);
  const initialPeopleTotal = peopleBefore.body.total as number;

  const inactiveEmployee = await client
    .post('/org/people')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.hrManager.role))
    .send({
      email: uatStaffingAnomaliesFixture.inactiveEmployee.email,
      name: uatStaffingAnomaliesFixture.inactiveEmployee.name,
      orgUnitId: uatStaffingAnomaliesFixture.inactiveEmployee.orgUnitId,
      status: uatStaffingAnomaliesFixture.inactiveEmployee.status,
    })
    .expect(201);

  const activeEmployee = await client
    .post('/org/people')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.hrManager.role))
    .send({
      email: uatStaffingAnomaliesFixture.activeScenarioEmployee.email,
      name: uatStaffingAnomaliesFixture.activeScenarioEmployee.name,
      orgUnitId: uatStaffingAnomaliesFixture.activeScenarioEmployee.orgUnitId,
      status: uatStaffingAnomaliesFixture.activeScenarioEmployee.status,
    })
    .expect(201);

  const activeEmployeeId = activeEmployee.body.id as string;
  const inactiveEmployeeId = inactiveEmployee.body.id as string;

  const anomalyProject = await client
    .post('/projects')
    .send({
      description: uatStaffingAnomaliesFixture.projects.anomalyProject.description,
      name: uatStaffingAnomaliesFixture.projects.anomalyProject.name,
      plannedEndDate: uatStaffingAnomaliesFixture.projects.anomalyProject.plannedEndDate,
      projectManagerId: uatStaffingAnomaliesFixture.actors.projectManager.personId,
      startDate: uatStaffingAnomaliesFixture.projects.anomalyProject.startDate,
    })
    .expect(201);

  await client.post(`/projects/${anomalyProject.body.id}/activate`).expect(200);
  const anomalyProjectId = anomalyProject.body.id as string;

  const inactiveAssignmentAttempt = await client
    .post('/assignments')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.resourceManager.role))
    .send({
      actorId: uatStaffingAnomaliesFixture.actors.resourceManager.personId,
      allocationPercent: uatStaffingAnomaliesFixture.assignment.allocationPercent,
      personId: inactiveEmployeeId,
      projectId: anomalyProjectId,
      staffingRole: uatStaffingAnomaliesFixture.assignment.staffingRole,
      startDate: uatStaffingAnomaliesFixture.assignment.startDate,
    })
    .expect(400);

  expectErrorResponseShape(inactiveAssignmentAttempt.body, 400);
  const inactiveAssignmentMessage = Array.isArray(inactiveAssignmentAttempt.body.message)
    ? inactiveAssignmentAttempt.body.message.join(', ')
    : inactiveAssignmentAttempt.body.message;
  expect(inactiveAssignmentMessage).toContain('Inactive employees cannot receive new assignments.');

  const createdAssignment = await client
    .post('/assignments')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.resourceManager.role))
    .send({
      actorId: uatStaffingAnomaliesFixture.actors.resourceManager.personId,
      allocationPercent: uatStaffingAnomaliesFixture.assignment.allocationPercent,
      endDate: uatStaffingAnomaliesFixture.assignment.endDate,
      personId: activeEmployeeId,
      projectId: anomalyProjectId,
      staffingRole: uatStaffingAnomaliesFixture.assignment.staffingRole,
      startDate: uatStaffingAnomaliesFixture.assignment.startDate,
    })
    .expect(201);

  await client
    .post(`/assignments/${createdAssignment.body.id}/approve`)
    .send({
      actorId: uatStaffingAnomaliesFixture.actors.projectManager.personId,
      comment: 'Approved so the anomaly pack can validate evidence gaps and closure conflicts.',
    })
    .expect(200);

  await client
    .post('/work-evidence')
    .send({
      effortHours: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.effortHours,
      personId: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.personId,
      projectId: anomalyProjectId,
      recordedAt: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.recordedAt,
      sourceRecordKey: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.sourceRecordKey,
      sourceType: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.sourceType,
      summary: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.summary,
    })
    .expect(201);

  const plannedVsActual = await client
    .get(
      `/dashboard/workload/planned-vs-actual?projectId=${anomalyProjectId}&asOf=${encodeURIComponent(
        uatStaffingAnomaliesFixture.plannedVsActualAsOf,
      )}`,
    )
    .expect(200);

  expect(plannedVsActual.body.assignedButNoEvidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        assignmentId: createdAssignment.body.id,
        person: expect.objectContaining({ id: activeEmployeeId }),
      }),
    ]),
  );
  expect(plannedVsActual.body.evidenceButNoApprovedAssignment).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        person: expect.objectContaining({
          id: uatStaffingAnomaliesFixture.evidenceWithoutAssignment.personId,
        }),
        project: expect.objectContaining({ id: anomalyProjectId }),
      }),
    ]),
  );

  await client
    .post('/org/reporting-lines')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.resourceManager.role))
    .send({
      managerId: uatStaffingAnomaliesFixture.futureManagerChange.nextManagerId,
      personId: uatStaffingAnomaliesFixture.futureManagerChange.personId,
      startDate: uatStaffingAnomaliesFixture.futureManagerChange.startDate,
      type: uatStaffingAnomaliesFixture.futureManagerChange.type,
    })
    .expect(201);

  const previousManagerScopeBefore = await client
    .get(
      `/org/managers/${uatStaffingAnomaliesFixture.futureManagerChange.previousManagerId}/scope?page=1&pageSize=50&asOf=${encodeURIComponent(
        uatStaffingAnomaliesFixture.futureManagerChange.beforeAsOf,
      )}`,
    )
    .expect(200);
  const previousManagerScopeAfter = await client
    .get(
      `/org/managers/${uatStaffingAnomaliesFixture.futureManagerChange.previousManagerId}/scope?page=1&pageSize=50&asOf=${encodeURIComponent(
        uatStaffingAnomaliesFixture.futureManagerChange.afterAsOf,
      )}`,
    )
    .expect(200);
  const nextManagerScopeAfter = await client
    .get(
      `/org/managers/${uatStaffingAnomaliesFixture.futureManagerChange.nextManagerId}/scope?page=1&pageSize=50&asOf=${encodeURIComponent(
        uatStaffingAnomaliesFixture.futureManagerChange.afterAsOf,
      )}`,
    )
    .expect(200);

  expect(previousManagerScopeBefore.body.directReports).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: uatStaffingAnomaliesFixture.futureManagerChange.personId }),
    ]),
  );
  expect(previousManagerScopeAfter.body.directReports).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: uatStaffingAnomaliesFixture.futureManagerChange.personId }),
    ]),
  );
  expect(nextManagerScopeAfter.body.directReports).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: uatStaffingAnomaliesFixture.futureManagerChange.personId }),
    ]),
  );

  const bulkProject = await client
    .post('/projects')
    .send({
      description: uatStaffingAnomaliesFixture.projects.bulkProject.description,
      name: uatStaffingAnomaliesFixture.projects.bulkProject.name,
      plannedEndDate: uatStaffingAnomaliesFixture.projects.bulkProject.plannedEndDate,
      projectManagerId: uatStaffingAnomaliesFixture.actors.projectManager.personId,
      startDate: uatStaffingAnomaliesFixture.projects.bulkProject.startDate,
    })
    .expect(201);

  await client.post(`/projects/${bulkProject.body.id}/activate`).expect(200);
  const bulkProjectId = bulkProject.body.id as string;

  const bulkResult = await client
    .post('/assignments/bulk')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.resourceManager.role))
    .send({
      actorId: uatStaffingAnomaliesFixture.actors.resourceManager.personId,
      entries: [
        {
          allocationPercent: uatStaffingAnomaliesFixture.bulkAssignment.allocationPercent,
          personId: '11111111-1111-1111-1111-111111111011',
          projectId: bulkProjectId,
          staffingRole: uatStaffingAnomaliesFixture.bulkAssignment.staffingRole,
          startDate: uatStaffingAnomaliesFixture.bulkAssignment.startDate,
        },
        {
          allocationPercent: uatStaffingAnomaliesFixture.bulkAssignment.allocationPercent,
          personId: inactiveEmployeeId,
          projectId: bulkProjectId,
          staffingRole: uatStaffingAnomaliesFixture.bulkAssignment.staffingRole,
          startDate: uatStaffingAnomaliesFixture.bulkAssignment.startDate,
        },
      ],
    })
    .expect(200);

  expect(bulkResult.body).toEqual(
    expect.objectContaining({
      createdCount: 1,
      failedCount: 1,
      strategy: 'PARTIAL_SUCCESS',
    }),
  );
  expect(bulkResult.body.failedItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'PERSON_INACTIVE',
        message: 'Inactive employees cannot receive new assignments.',
      }),
    ]),
  );

  await client
    .post(`/projects/${anomalyProjectId}/close`)
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.projectManager.role))
    .expect(200);

  const exceptionsQueue = await client
    .get(`/exceptions?asOf=${encodeURIComponent(uatStaffingAnomaliesFixture.exceptionAsOf)}`)
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.admin.role))
    .expect(200);

  expect(exceptionsQueue.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        category: 'ASSIGNMENT_WITHOUT_EVIDENCE',
        targetEntityType: 'ASSIGNMENT',
      }),
      expect.objectContaining({
        category: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT',
        targetEntityType: 'WORK_EVIDENCE',
      }),
      expect.objectContaining({
        category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
        targetEntityType: 'PROJECT',
      }),
    ]),
  );

  const closureConflictException = (exceptionsQueue.body.items as Array<{ category: string; id: string }>).find(
    (item) => item.category === 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
  );
  expect(closureConflictException).toBeDefined();

  await client
    .get(`/exceptions/${closureConflictException!.id}?asOf=${encodeURIComponent(uatStaffingAnomaliesFixture.exceptionAsOf)}`)
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.admin.role))
    .expect(200);

  const expectM365Failure = options.expectM365Failure ?? true;
  const m365SyncRequest = client
    .post('/integrations/m365/directory/sync')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.admin.role));

  if (expectM365Failure) {
    const degradedSyncResponse = await m365SyncRequest.expect(500);

    expectSafeErrorResponseShape(
      degradedSyncResponse.body,
      500,
      'Simulated M365 degradation during anomaly UAT pack.',
    );
  } else {
    await m365SyncRequest.expect(201);
  }

  const peopleAfterSyncFailure = await client.get('/org/people?page=1&pageSize=100').expect(200);
  expect(peopleAfterSyncFailure.body.total).toBe(initialPeopleTotal + 2);

  const createdActiveEmployeeAfterFailure = await client.get(`/org/people/${activeEmployeeId}`).expect(200);
  expect(createdActiveEmployeeAfterFailure.body).toEqual(
    expect.objectContaining({
      id: activeEmployeeId,
      displayName: uatStaffingAnomaliesFixture.activeScenarioEmployee.name,
    }),
  );

  const integrationHistory = await client
    .get('/integrations/history?provider=m365&limit=5')
    .set(roleHeaders(uatStaffingAnomaliesFixture.actors.admin.role))
    .expect(200);

  expect(integrationHistory.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        integrationType: 'm365',
        status: expectM365Failure ? 'FAILED' : 'SUCCEEDED',
      }),
    ]),
  );

  return {
    activeEmployeeId,
    anomalyProjectId,
    bulkProjectId,
    closureConflictExceptionId: closureConflictException!.id,
    plannedVsActualAnomalyTypes: (plannedVsActual.body.anomalies as Array<{ type: string }>).map(
      (item) => item.type,
    ),
  };
}
