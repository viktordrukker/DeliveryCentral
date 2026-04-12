import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { ActivateProjectService } from '@src/modules/project-registry/application/activate-project.service';
import { CreateProjectService } from '@src/modules/project-registry/application/create-project.service';
import { ProjectLifecycleConflictError } from '@src/modules/project-registry/application/project-lifecycle-conflict.error';
import { createSeededInMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/create-seeded-in-memory-project.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';

describe('Create project', () => {
  it('creates a draft internal project with charter fields', async () => {
    const service = new CreateProjectService(
      createSeededInMemoryProjectRepository(),
      createSeededInMemoryPersonRepository(),
    );

    const project = await service.execute({
      description: 'New internal chartered initiative.',
      name: 'Workload Insights Rollout',
      plannedEndDate: '2025-09-30T00:00:00.000Z',
      projectManagerId: '11111111-1111-1111-1111-111111111004',
      startDate: '2025-05-01T00:00:00.000Z',
    });

    expect(project.name).toBe('Workload Insights Rollout');
    expect(project.status).toBe('DRAFT');
    expect(project.projectCode).toMatch(/^PRJ-/);
    expect(project.projectManagerId?.value).toBe('11111111-1111-1111-1111-111111111004');
    expect(project.startsOn?.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    expect(project.endsOn?.toISOString()).toBe('2025-09-30T00:00:00.000Z');
    expect(project.version).toBe(1);
  });

  it('rejects invalid project manager', async () => {
    const service = new CreateProjectService(
      createSeededInMemoryProjectRepository(),
      createSeededInMemoryPersonRepository(),
    );

    await expect(
      service.execute({
        name: 'Invalid Manager Project',
        projectManagerId: 'missing-manager',
        startDate: '2025-05-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('Project manager does not exist.');
  });
});

describe('Activate project', () => {
  it('activates a draft project successfully', async () => {
    const repository = createSeededInMemoryProjectRepository();
    const createProjectService = new CreateProjectService(
      repository,
      createSeededInMemoryPersonRepository(),
    );
    const activateProjectService = new ActivateProjectService(repository);

    const project = await createProjectService.execute({
      name: 'Activation Candidate',
      projectManagerId: '11111111-1111-1111-1111-111111111004',
      startDate: '2025-05-01T00:00:00.000Z',
    });

    const activatedProject = await activateProjectService.execute(project.projectId.value);

    expect(activatedProject.status).toBe('ACTIVE');
  });

  it('blocks an invalid activation state transition', async () => {
    const repository = createSeededInMemoryProjectRepository();
    const createProjectService = new CreateProjectService(
      repository,
      createSeededInMemoryPersonRepository(),
    );
    const activateProjectService = new ActivateProjectService(repository);

    const project = await createProjectService.execute({
      name: 'Already Active Candidate',
      projectManagerId: '11111111-1111-1111-1111-111111111004',
      startDate: '2025-05-01T00:00:00.000Z',
    });

    await activateProjectService.execute(project.projectId.value);

    await expect(
      activateProjectService.execute(project.projectId.value),
    ).rejects.toThrow('Project can only be activated from DRAFT.');
  });

  it('detects a stale activate conflict from concurrent project state', async () => {
    const repository = createSeededInMemoryProjectRepository();
    const createProjectService = new CreateProjectService(
      repository,
      createSeededInMemoryPersonRepository(),
    );

    const project = await createProjectService.execute({
      name: 'Concurrent Activation Candidate',
      projectManagerId: '11111111-1111-1111-1111-111111111004',
      startDate: '2025-05-01T00:00:00.000Z',
    });

    const staleOne = await repository.findByProjectId(project.projectId);
    const staleTwo = await repository.findByProjectId(project.projectId);

    expect(staleOne).not.toBeNull();
    expect(staleTwo).not.toBeNull();

    staleOne!.activate();
    staleTwo!.activate();

    await repository.save(staleOne!);

    await expect(repository.save(staleTwo!)).rejects.toBeInstanceOf(ProjectLifecycleConflictError);
  });
});

describe('Projects API', () => {
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

  it('POST /projects creates an internal draft project', async () => {
    const response = await request(app.getHttpServer())
      .post('/projects')
      .send({
        description: 'Operational project creation test.',
        name: 'Platform Metrics Hub',
        plannedEndDate: '2025-10-31T00:00:00.000Z',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        description: 'Operational project creation test.',
        id: expect.any(String),
        name: 'Platform Metrics Hub',
        plannedEndDate: '2025-10-31T00:00:00.000Z',
        projectCode: expect.stringMatching(/^PRJ-/),
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
        status: 'DRAFT',
        version: 1,
      }),
    );
  });

  it('POST /projects rejects an invalid project manager', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Manager Missing Project',
        projectManagerId: 'missing-manager',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(404);
  });

  it('POST /projects/:id/activate activates a draft project', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Activation API Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        status: 'ACTIVE',
        version: 2,
      }),
    );
  });

  it('POST /projects/:id/activate blocks activating a project twice', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Double Activation API Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/projects/${createResponse.body.id}/activate`)
      .expect(400);
  });

  it('POST /projects/:id/activate returns conflict for a stale concurrent lifecycle mutation', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ActivateProjectService)
      .useValue({
        execute: jest.fn().mockRejectedValue(new ProjectLifecycleConflictError()),
      })
      .compile();

    const conflictApp = moduleRef.createNestApplication();
    await conflictApp.init();

    const response = await request(conflictApp.getHttpServer())
      .post('/projects/94444444-0000-0000-0000-000000000099/activate')
      .expect(409);

    expect(response.body.message).toBe(
      'Project was changed by another operation. Refresh and try again.',
    );

    await conflictApp.close();
  });
});
