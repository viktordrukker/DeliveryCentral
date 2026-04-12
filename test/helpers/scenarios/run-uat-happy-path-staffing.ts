import { ApiTestClient } from '../api-test-client.helper';
import { roleHeaders } from '../api/auth-headers';
import { uatHappyPathStaffingFixture } from '../../scenarios/uat-happy-path-staffing/uat-happy-path-staffing.fixture';

export interface UatHappyPathStaffingResult {
  assignmentId: string;
  createdEmployeeId: string;
  notificationEvents: string[];
  projectId: string;
}

export interface RunUatHappyPathStaffingScenarioOptions {
  skipNotificationChecks?: boolean;
}

export async function runUatHappyPathStaffingScenario(
  client: ApiTestClient,
  options: RunUatHappyPathStaffingScenarioOptions = {},
): Promise<UatHappyPathStaffingResult> {
  const createdEmployee = await client
    .post('/org/people')
    .set(roleHeaders(uatHappyPathStaffingFixture.actors.hrManager.role))
    .send({
      email: uatHappyPathStaffingFixture.employee.email,
      grade: uatHappyPathStaffingFixture.employee.grade,
      name: uatHappyPathStaffingFixture.employee.name,
      orgUnitId: uatHappyPathStaffingFixture.employee.orgUnitId,
      role: uatHappyPathStaffingFixture.employee.role,
      skillsets: uatHappyPathStaffingFixture.employee.skillsets,
      status: uatHappyPathStaffingFixture.employee.status,
    })
    .expect(201);

  expect(createdEmployee.body).toEqual(
    expect.objectContaining({
      email: uatHappyPathStaffingFixture.employee.email,
      name: uatHappyPathStaffingFixture.employee.name,
      orgUnitId: uatHappyPathStaffingFixture.employee.orgUnitId,
      status: 'ACTIVE',
    }),
  );

  const createdEmployeeId = createdEmployee.body.id as string;

  const reportingLine = await client
    .post('/org/reporting-lines')
    .set(roleHeaders(uatHappyPathStaffingFixture.actors.resourceManager.role))
    .send({
      managerId: uatHappyPathStaffingFixture.actors.projectManager.personId,
      personId: createdEmployeeId,
      startDate: uatHappyPathStaffingFixture.reportingLine.startDate,
      type: uatHappyPathStaffingFixture.reportingLine.type,
    })
    .expect(201);

  expect(reportingLine.body).toEqual(
    expect.objectContaining({
      managerId: uatHappyPathStaffingFixture.actors.projectManager.personId,
      personId: createdEmployeeId,
      type: 'SOLID',
    }),
  );

  const employeeDirectoryRecord = await client
    .get(`/org/people/${createdEmployeeId}`)
    .expect(200);

  expect(employeeDirectoryRecord.body).toEqual(
    expect.objectContaining({
      currentLineManager: expect.objectContaining({
        id: uatHappyPathStaffingFixture.actors.projectManager.personId,
      }),
      displayName: uatHappyPathStaffingFixture.employee.name,
      id: createdEmployeeId,
    }),
  );

  const project = await client
    .post('/projects')
    .send({
      description: uatHappyPathStaffingFixture.project.description,
      name: uatHappyPathStaffingFixture.project.name,
      plannedEndDate: uatHappyPathStaffingFixture.project.plannedEndDate,
      projectManagerId: uatHappyPathStaffingFixture.actors.projectManager.personId,
      startDate: uatHappyPathStaffingFixture.project.startDate,
    })
    .expect(201);

  expect(project.body).toEqual(
    expect.objectContaining({
      name: uatHappyPathStaffingFixture.project.name,
      projectManagerId: uatHappyPathStaffingFixture.actors.projectManager.personId,
      status: 'DRAFT',
    }),
  );

  const projectId = project.body.id as string;

  await client.post(`/projects/${projectId}/activate`).expect(200);

  const activatedProject = await client.get(`/projects/${projectId}`).expect(200);
  expect(activatedProject.body).toEqual(
    expect.objectContaining({
      id: projectId,
      status: 'ACTIVE',
    }),
  );

  const createdAssignment = await client
    .post('/assignments')
    .set(roleHeaders(uatHappyPathStaffingFixture.actors.resourceManager.role))
    .send({
      actorId: uatHappyPathStaffingFixture.actors.resourceManager.personId,
      allocationPercent: uatHappyPathStaffingFixture.assignment.allocationPercent,
      endDate: uatHappyPathStaffingFixture.assignment.endDate,
      note: uatHappyPathStaffingFixture.assignment.note,
      personId: createdEmployeeId,
      projectId,
      staffingRole: uatHappyPathStaffingFixture.assignment.staffingRole,
      startDate: uatHappyPathStaffingFixture.assignment.startDate,
    })
    .expect(201);

  expect(createdAssignment.body).toEqual(
    expect.objectContaining({
      personId: createdEmployeeId,
      projectId,
      status: 'REQUESTED',
    }),
  );

  const assignmentId = createdAssignment.body.id as string;

  await client
    .post(`/assignments/${assignmentId}/approve`)
    .send({
      actorId: uatHappyPathStaffingFixture.actors.projectManager.personId,
      comment: uatHappyPathStaffingFixture.approval.comment,
    })
    .expect(200);

  const employeeDashboardDuringAssignment = await client
    .get(
      `/dashboard/employee/${createdEmployeeId}?asOf=${encodeURIComponent(
        uatHappyPathStaffingFixture.timeline.asOfDuringAssignment,
      )}`,
    )
    .expect(200);

  expect(employeeDashboardDuringAssignment.body).toEqual(
    expect.objectContaining({
      currentAssignments: expect.arrayContaining([
        expect.objectContaining({
          id: assignmentId,
          project: expect.objectContaining({ id: projectId }),
        }),
      ]),
      currentWorkloadSummary: expect.objectContaining({
        activeAssignmentCount: 1,
        totalAllocationPercent: uatHappyPathStaffingFixture.assignment.allocationPercent,
      }),
      person: expect.objectContaining({
        currentLineManager: expect.objectContaining({
          id: uatHappyPathStaffingFixture.actors.projectManager.personId,
        }),
        id: createdEmployeeId,
      }),
    }),
  );

  const managerScope = await client
    .get(
      `/org/managers/${uatHappyPathStaffingFixture.actors.projectManager.personId}/scope?page=1&pageSize=50&asOf=${encodeURIComponent(
        uatHappyPathStaffingFixture.timeline.asOfDuringAssignment,
      )}`,
    )
    .expect(200);

  expect(managerScope.body.directReports).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: createdEmployeeId,
      }),
    ]),
  );

  await client
    .post('/work-evidence')
    .send({
      effortHours: uatHappyPathStaffingFixture.workEvidence.effortHours,
      personId: createdEmployeeId,
      projectId,
      recordedAt: uatHappyPathStaffingFixture.workEvidence.recordedAt,
      sourceRecordKey: uatHappyPathStaffingFixture.workEvidence.sourceRecordKey,
      sourceType: uatHappyPathStaffingFixture.workEvidence.sourceType,
      summary: uatHappyPathStaffingFixture.workEvidence.summary,
    })
    .expect(201);

  const listedEvidence = await client
    .get(`/work-evidence?personId=${createdEmployeeId}&projectId=${projectId}`)
    .expect(200);

  expect(listedEvidence.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        personId: createdEmployeeId,
        projectId,
        sourceRecordKey: uatHappyPathStaffingFixture.workEvidence.sourceRecordKey,
        sourceType: uatHappyPathStaffingFixture.workEvidence.sourceType,
      }),
    ]),
  );

  await client
    .post(`/assignments/${assignmentId}/end`)
    .set(roleHeaders(uatHappyPathStaffingFixture.actors.resourceManager.role))
    .send({
      actorId: uatHappyPathStaffingFixture.actors.resourceManager.personId,
      endDate: uatHappyPathStaffingFixture.assignmentEnd.endDate,
      reason: uatHappyPathStaffingFixture.assignmentEnd.reason,
    })
    .expect(200);

  const assignmentDetail = await client.get(`/assignments/${assignmentId}`).expect(200);
  expect(assignmentDetail.body).toEqual(
    expect.objectContaining({
      approvalState: 'ENDED',
      canEnd: false,
      id: assignmentId,
      history: expect.arrayContaining([
        expect.objectContaining({ changeType: 'ASSIGNMENT_REQUESTED' }),
        expect.objectContaining({ changeType: 'ASSIGNMENT_APPROVED' }),
        expect.objectContaining({ changeType: 'ASSIGNMENT_ENDED' }),
      ]),
    }),
  );

  const employeeDashboardAfterAssignment = await client
    .get(
      `/dashboard/employee/${createdEmployeeId}?asOf=${encodeURIComponent(
        uatHappyPathStaffingFixture.timeline.asOfAfterAssignmentEnd,
      )}`,
    )
    .expect(200);

  expect(employeeDashboardAfterAssignment.body.currentAssignments).toEqual([]);
  expect(employeeDashboardAfterAssignment.body.currentWorkloadSummary).toEqual(
    expect.objectContaining({
      activeAssignmentCount: 0,
      totalAllocationPercent: 0,
    }),
  );
  expect(employeeDashboardAfterAssignment.body.recentWorkEvidenceSummary).toEqual(
    expect.objectContaining({
      recentEntryCount: 1,
      totalEffortHours: uatHappyPathStaffingFixture.workEvidence.effortHours,
    }),
  );

  let notificationEvents: string[] = [];
  if (!options.skipNotificationChecks) {
    const notificationOutcomes = await client
      .get('/notifications/outcomes')
      .set(roleHeaders(uatHappyPathStaffingFixture.actors.admin.role))
      .expect(200);

    expect(notificationOutcomes.body).toEqual(
      expect.arrayContaining(
        uatHappyPathStaffingFixture.expectedNotificationEvents.map((eventName) =>
          expect.objectContaining({
            eventName,
            status: 'SUCCEEDED',
          }),
        ),
      ),
    );

    notificationEvents = (notificationOutcomes.body as Array<{ eventName: string }>).map(
      (item) => item.eventName,
    );
  }

  const auditResponse = await client
    .get('/audit/business?limit=100')
    .set(roleHeaders(uatHappyPathStaffingFixture.actors.admin.role))
    .expect(200);

  const auditItems = auditResponse.body.items as Array<{ actionType: string; targetEntityId: string }>;
  expect(auditItems).toEqual(
    expect.arrayContaining(
      uatHappyPathStaffingFixture.expectedBusinessAuditActionTypes
        .filter((actionType) => !options.skipNotificationChecks || actionType !== 'notification.send_result')
        .map((actionType) => expect.objectContaining({ actionType })),
    ),
  );
  expect(auditItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        actionType: 'employee.created',
        targetEntityId: createdEmployeeId,
      }),
      expect.objectContaining({
        actionType: 'project.activated',
        targetEntityId: projectId,
      }),
      expect.objectContaining({
        actionType: 'assignment.ended',
        targetEntityId: assignmentId,
      }),
    ]),
  );

  return {
    assignmentId,
    createdEmployeeId,
    notificationEvents,
    projectId,
  };
}
