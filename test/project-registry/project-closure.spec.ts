import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { ActivateProjectService } from '@src/modules/project-registry/application/activate-project.service';
import { CloseProjectService } from '@src/modules/project-registry/application/close-project.service';
import { CreateProjectService } from '@src/modules/project-registry/application/create-project.service';
import { ProjectLifecycleConflictError } from '@src/modules/project-registry/application/project-lifecycle-conflict.error';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { AppConfig } from '@src/shared/config/app-config';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';

describe('Close project', () => {
  it('closes an active project and aggregates workspend from work evidence', async () => {
    const projectRepository = new InMemoryProjectRepository([
      Project.create(
        {
          name: 'Closure Candidate',
          projectCode: 'PRJ-CLOSE-1',
          status: 'ACTIVE',
        },
        ProjectId.from('70000000-0000-0000-0000-000000000001'),
      ),
    ]);
    const personRepository = new InMemoryPersonRepository([
      Person.register(
        {
          displayName: 'Taylor Engineer',
          employmentStatus: 'ACTIVE',
          familyName: 'Engineer',
          givenName: 'Taylor',
          orgUnitId: OrgUnitId.from('22222222-2222-2222-2222-222222222005'),
          primaryEmail: 'taylor.engineer@example.com',
          role: 'Engineer',
          skillsets: ['Architecture', 'TypeScript'],
        },
        PersonId.from('71000000-0000-0000-0000-000000000001'),
      ),
      Person.register(
        {
          displayName: 'Jordan Analyst',
          employmentStatus: 'ACTIVE',
          familyName: 'Analyst',
          givenName: 'Jordan',
          orgUnitId: OrgUnitId.from('22222222-2222-2222-2222-222222222006'),
          primaryEmail: 'jordan.analyst@example.com',
          role: 'Analyst',
          skillsets: ['SQL'],
        },
        PersonId.from('71000000-0000-0000-0000-000000000002'),
      ),
    ]);
    const workEvidenceRepository = new InMemoryWorkEvidenceRepository([
      WorkEvidence.create(
        {
          durationMinutes: 480,
          evidenceType: 'MANUAL',
          personId: '71000000-0000-0000-0000-000000000001',
          projectId: '70000000-0000-0000-0000-000000000001',
          recordedAt: new Date('2025-06-05T00:00:00.000Z'),
          source: WorkEvidenceSource.create(
            {
              displayName: 'Manual Entry',
              provider: 'INTERNAL',
              sourceType: 'MANUAL',
            },
            '72000000-0000-0000-0000-000000000001',
          ),
          sourceRecordKey: 'MANUAL-1',
        },
        WorkEvidenceId.from('73000000-0000-0000-0000-000000000001'),
      ),
      WorkEvidence.create(
        {
          durationMinutes: 240,
          evidenceType: 'MANUAL',
          personId: '71000000-0000-0000-0000-000000000002',
          projectId: '70000000-0000-0000-0000-000000000001',
          recordedAt: new Date('2025-06-06T00:00:00.000Z'),
          source: WorkEvidenceSource.create(
            {
              displayName: 'Manual Entry',
              provider: 'INTERNAL',
              sourceType: 'MANUAL',
            },
            '72000000-0000-0000-0000-000000000002',
          ),
          sourceRecordKey: 'MANUAL-2',
        },
        WorkEvidenceId.from('73000000-0000-0000-0000-000000000002'),
      ),
    ]);
    const projectAssignmentRepository = new InMemoryProjectAssignmentRepository();
    const appConfig = new AppConfig();
    const service = new CloseProjectService(
      projectRepository,
      workEvidenceRepository,
      personRepository,
      projectAssignmentRepository,
      appConfig,
    );

    const result = await service.execute('70000000-0000-0000-0000-000000000001');

    expect(result.project.status).toBe('CLOSED');
    expect(result.project.version).toBe(2);
    expect(result.workspend.totalMandays).toBe(1.5);
    expect(result.workspend.byRole).toEqual([
      { key: 'Engineer', mandays: 1 },
      { key: 'Analyst', mandays: 0.5 },
    ]);
    expect(result.workspend.bySkillset).toEqual([
      { key: 'Architecture', mandays: 0.5 },
      { key: 'SQL', mandays: 0.5 },
      { key: 'TypeScript', mandays: 0.5 },
    ]);
  });

  it('detects a stale close conflict from concurrent lifecycle state', async () => {
    const projectRepository = new InMemoryProjectRepository([
      Project.create(
        {
          name: 'Concurrent Close Candidate',
          projectCode: 'PRJ-CLOSE-2',
          status: 'ACTIVE',
        },
        ProjectId.from('70000000-0000-0000-0000-000000000002'),
      ),
    ]);
    const personRepository = new InMemoryPersonRepository();
    const workEvidenceRepository = new InMemoryWorkEvidenceRepository();
    const projectAssignmentRepository = new InMemoryProjectAssignmentRepository();
    const service = new CloseProjectService(
      projectRepository,
      workEvidenceRepository,
      personRepository,
      projectAssignmentRepository,
      new AppConfig(),
    );

    const staleOne = await projectRepository.findByProjectId(
      ProjectId.from('70000000-0000-0000-0000-000000000002'),
    );
    const staleTwo = await projectRepository.findByProjectId(
      ProjectId.from('70000000-0000-0000-0000-000000000002'),
    );

    expect(staleOne).not.toBeNull();
    expect(staleTwo).not.toBeNull();

    staleOne!.close();
    staleTwo!.close();

    await projectRepository.save(staleOne!);

    await expect(projectRepository.save(staleTwo!)).rejects.toBeInstanceOf(ProjectLifecycleConflictError);
    await expect(service.execute('70000000-0000-0000-0000-000000000002')).rejects.toThrow(
      'Project can only be closed from ACTIVE.',
    );
  });

  it('blocks normal closure while active assignments still exist and allows explicit override with a reason', async () => {
    const projectRepository = new InMemoryProjectRepository([
      Project.create(
        {
          name: 'Governed Closure Candidate',
          projectCode: 'PRJ-CLOSE-3',
          status: 'ACTIVE',
        },
        ProjectId.from('70000000-0000-0000-0000-000000000003'),
      ),
    ]);
    const personRepository = new InMemoryPersonRepository();
    const workEvidenceRepository = new InMemoryWorkEvidenceRepository();
    const projectAssignmentRepository = new InMemoryProjectAssignmentRepository([
      ProjectAssignment.create({
        personId: '71000000-0000-0000-0000-000000000003',
        projectId: '70000000-0000-0000-0000-000000000003',
        requestedAt: new Date('2025-06-01T00:00:00.000Z'),
        requestedByPersonId: 'director-1',
        staffingRole: 'Engineer',
        status: AssignmentStatus.booked(),
        validFrom: new Date('2025-06-01T00:00:00.000Z'),
      }),
    ]);
    const service = new CloseProjectService(
      projectRepository,
      workEvidenceRepository,
      personRepository,
      projectAssignmentRepository,
      new AppConfig(),
    );

    await expect(service.execute('70000000-0000-0000-0000-000000000003')).rejects.toBeInstanceOf(
      ProjectLifecycleConflictError,
    );
    await expect(service.execute('70000000-0000-0000-0000-000000000003')).rejects.toThrow(
      'Project closure is blocked because active assignments still exist. Use the explicit override flow with a reason to close anyway.',
    );

    const result = await service.execute('70000000-0000-0000-0000-000000000003', {
      actorId: 'director-1',
      allowActiveAssignmentOverride: true,
      overrideReason: 'Closure approved by governance after staffing exception review.',
    });

    expect(result.project.status).toBe('CLOSED');
    expect(result.project.version).toBe(2);
  });
});

describe('Project closure API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /projects/:id/close closes a project and returns workspend summary', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Closure API Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/work-evidence')
      .send({
        effortHours: 8,
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: createResponse.body.id,
        recordedAt: '2025-06-10T00:00:00.000Z',
        sourceRecordKey: 'CLOSE-API-1',
        sourceType: 'MANUAL',
        summary: 'Closure validation effort',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/close`)
      .set(roleHeaders('project_manager'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        projectCode: createResponse.body.projectCode,
        status: 'CLOSED',
        version: 3,
        workspend: expect.objectContaining({
          totalMandays: 1,
        }),
      }),
    );
  });

  it('POST /projects/:id/close blocks normal closure when active assignments still exist', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Blocked Closure API Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    const assignmentResponse = await request(app.getHttpServer())
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        allocationPercent: 100,
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: createResponse.body.id,
        staffingRole: 'Engineer',
        startDate: '2025-06-05T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/assignments/${assignmentResponse.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/close`)
      .set(roleHeaders('project_manager'))
      .expect(409);

    expect(response.body.message).toBe(
      'Project closure is blocked because active assignments still exist. Use the explicit override flow with a reason to close anyway.',
    );
  });

  it('POST /projects/:id/close-override allows an authorized override with audit reason capture', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Override Closure API Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    const assignmentResponse = await request(app.getHttpServer())
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        allocationPercent: 100,
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: createResponse.body.id,
        staffingRole: 'Engineer',
        startDate: '2025-06-05T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/assignments/${assignmentResponse.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
      })
      .expect(200);

    const overrideResponse = await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/close-override`)
      .set(roleHeaders('director'))
      .send({
        reason: 'Project must be closed after governance review while staffing cleanup continues.',
        expectedProjectVersion: 2,
      })
      .expect(200);

    expect(overrideResponse.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        projectCode: createResponse.body.projectCode,
        status: 'CLOSED',
        version: 3,
      }),
    );

    const auditResponse = await request(app.getHttpServer())
      .get('/audit/business')
      .set(roleHeaders('admin'))
      .query({
        actionType: 'project.close_overridden',
        targetEntityId: createResponse.body.id,
      })
      .expect(200);

    expect(auditResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: 'project.close_overridden',
          actorId: 'test-person',
          metadata: expect.objectContaining({
            overrideReason:
              'Project must be closed after governance review while staffing cleanup continues.',
          }),
          targetEntityId: createResponse.body.id,
        }),
      ]),
    );
  });

  it('POST /projects/:id/close-override rejects callers without override authority', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Unauthorized Override Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/close-override`)
      .set(roleHeaders('project_manager'))
      .send({
        reason: 'Trying to bypass closure guard without elevated authority.',
      })
      .expect(403);
  });
});
