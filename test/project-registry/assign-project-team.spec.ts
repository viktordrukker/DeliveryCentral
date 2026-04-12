import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { InMemoryAssignmentReferenceRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-assignment-reference.repository';
import { createSeededInMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/create-seeded-in-memory-project-assignment.repository';
import { AssignProjectTeamService } from '@src/modules/project-registry/application/assign-project-team.service';
import { createSeededInMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/create-seeded-in-memory-project.repository';
import { createSeededInMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-org-unit.repository';
import { createSeededInMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person-org-membership.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

describe('Assign project team', () => {
  it('expands the active primary team roster into individual assignments', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const assignmentRepository = createSeededInMemoryProjectAssignmentRepository();
    const service = new AssignProjectTeamService(
      createSeededInMemoryProjectRepository(),
      createSeededInMemoryOrgUnitRepository(),
      personRepository,
      createSeededInMemoryPersonOrgMembershipRepository(),
      assignmentRepository,
      new CreateProjectAssignmentService(
        assignmentRepository,
        new InMemoryAssignmentReferenceRepository(personRepository),
      ),
    );

    const result = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 25,
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Shared Engineering Team',
      startDate: '2025-04-01T00:00:00.000Z',
      teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
    });

    expect(result.teamName).toBe('Application Engineering');
    expect(result.createdAssignments).toHaveLength(3);
    expect(result.createdAssignments.map((item) => item.personId)).toEqual([
      '11111111-1111-1111-1111-111111111006',
      '11111111-1111-1111-1111-111111111008',
      '11111111-1111-1111-1111-111111111009',
    ]);
    expect(result.skippedDuplicates).toHaveLength(0);
  });

  it('skips duplicate overlapping person-project assignments and preserves other team members', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const assignmentRepository = createSeededInMemoryProjectAssignmentRepository();
    const service = new AssignProjectTeamService(
      createSeededInMemoryProjectRepository(),
      createSeededInMemoryOrgUnitRepository(),
      personRepository,
      createSeededInMemoryPersonOrgMembershipRepository(),
      assignmentRepository,
      new CreateProjectAssignmentService(
        assignmentRepository,
        new InMemoryAssignmentReferenceRepository(personRepository),
      ),
    );

    const result = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 30,
      projectId: '33333333-3333-3333-3333-333333333003',
      staffingRole: 'Atlas Support Team',
      startDate: '2025-03-01T00:00:00.000Z',
      teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
    });

    expect(result.createdAssignments.map((item) => item.personId)).toEqual([
      '11111111-1111-1111-1111-111111111006',
      '11111111-1111-1111-1111-111111111009',
    ]);
    expect(result.skippedDuplicates).toEqual([
      {
        personId: '11111111-1111-1111-1111-111111111008',
        personName: 'Ethan Brooks',
        reason: 'Overlapping assignment for the same person and project already exists.',
      },
    ]);
  });

  it('blocks assign-team when the project lifecycle is no longer active', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const assignmentRepository = createSeededInMemoryProjectAssignmentRepository();
    const projectRepository = createSeededInMemoryProjectRepository();
    const service = new AssignProjectTeamService(
      projectRepository,
      createSeededInMemoryOrgUnitRepository(),
      personRepository,
      createSeededInMemoryPersonOrgMembershipRepository(),
      assignmentRepository,
      new CreateProjectAssignmentService(
        assignmentRepository,
        new InMemoryAssignmentReferenceRepository(personRepository),
      ),
    );

    const project = await projectRepository.findById('33333333-3333-3333-3333-333333333001');
    expect(project).not.toBeNull();
    project!.close();
    await projectRepository.save(project!);

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 25,
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Shared Engineering Team',
        startDate: '2025-04-01T00:00:00.000Z',
        teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
      }),
    ).rejects.toThrow('Team assignments can only be created for ACTIVE projects.');
  });
});

describe('Assign project team API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);

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

  it('POST /projects/:id/assign-team expands a team into individual assignments', async () => {
    const response = await request(app.getHttpServer())
      .post('/projects/33333333-3333-3333-3333-333333333001/assign-team')
      .set(roleHeaders('resource_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 25,
        staffingRole: 'Shared Engineering Team',
        startDate: '2025-04-01T00:00:00.000Z',
        teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        allocationPercent: 25,
        createdCount: 3,
        projectId: '33333333-3333-3333-3333-333333333001',
        skippedDuplicateCount: 0,
        staffingRole: 'Shared Engineering Team',
        teamName: 'Application Engineering',
        teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
      }),
    );
    expect(response.body.createdAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personId: '11111111-1111-1111-1111-111111111006',
          personName: 'Sophia Kim',
        }),
        expect.objectContaining({
          personId: '11111111-1111-1111-1111-111111111008',
          personName: 'Ethan Brooks',
        }),
        expect.objectContaining({
          personId: '11111111-1111-1111-1111-111111111009',
          personName: 'Mia Lopez',
        }),
      ]),
    );
  });

  it('POST /projects/:id/assign-team reports duplicates without losing person-level traceability', async () => {
    const response = await request(app.getHttpServer())
      .post('/projects/33333333-3333-3333-3333-333333333003/assign-team')
      .set(roleHeaders('resource_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 30,
        staffingRole: 'Atlas Support Team',
        startDate: '2025-03-01T00:00:00.000Z',
        teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
      })
      .expect(200);

    expect(response.body.createdCount).toBe(2);
    expect(response.body.skippedDuplicateCount).toBe(1);
    expect(response.body.createdAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ personId: '11111111-1111-1111-1111-111111111006' }),
        expect.objectContaining({ personId: '11111111-1111-1111-1111-111111111009' }),
      ]),
    );
    expect(response.body.skippedDuplicates).toEqual([
      expect.objectContaining({
        personId: '11111111-1111-1111-1111-111111111008',
        personName: 'Ethan Brooks',
        reason: 'Overlapping assignment for the same person and project already exists.',
      }),
    ]);
  });

  it('POST /projects/:id/assign-team returns conflict for a stale lifecycle version', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Assign Team Concurrency Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    const staleVersion = createResponse.body.version;

    const response = await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/assign-team`)
      .set(roleHeaders('resource_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 25,
        expectedProjectVersion: staleVersion,
        staffingRole: 'Shared Engineering Team',
        startDate: '2025-07-01T00:00:00.000Z',
        teamOrgUnitId: '22222222-2222-2222-2222-222222222005',
      })
      .expect(409);

    expect(response.body.message).toBe(
      'Project was changed by another operation. Refresh and try again.',
    );
  });
});
