import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { GetProjectByIdService } from '@src/modules/project-registry/application/get-project-by-id.service';
import { ProjectDirectoryQueryService } from '@src/modules/project-registry/application/project-directory-query.service';
import { demoProjectExternalLinks } from '../../prisma/seeds/demo-dataset';
import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { createSeededInMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/create-seeded-in-memory-project-assignment.repository';
import { createSeededInMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/create-seeded-in-memory-project.repository';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

describe('Project directory', () => {
  const createSeededExternalLinkRepository = (): InMemoryProjectExternalLinkRepository =>
    new InMemoryProjectExternalLinkRepository(
      demoProjectExternalLinks.map((link) =>
        ProjectExternalLink.create(
          {
            connectionKey: link.connectionKey,
            externalProjectKey: ExternalProjectKey.from(link.externalProjectKey),
            externalProjectName: link.externalProjectName ?? undefined,
            externalUrl: link.externalUrl ?? undefined,
            projectId: ProjectId.from(link.projectId),
            providerEnvironment: link.providerEnvironment ?? undefined,
            systemType: ExternalSystemType.create(link.provider),
          },
          link.id,
        ),
      ),
    );

  it('lists internal projects with external link summaries', async () => {
    const service = new ProjectDirectoryQueryService(
      createSeededInMemoryProjectRepository(),
      createSeededExternalLinkRepository(),
      createSeededInMemoryProjectAssignmentRepository(),
    );

    const result = await service.execute({});

    expect(result.items).toHaveLength(6);
    expect(result.items.find((item) => item.projectCode === 'PRJ-102')?.externalLinksCount).toBe(1);
  });

  it('filters projects by external source', async () => {
    const service = new ProjectDirectoryQueryService(
      createSeededInMemoryProjectRepository(),
      createSeededExternalLinkRepository(),
      createSeededInMemoryProjectAssignmentRepository(),
    );

    const result = await service.execute({ source: 'jira' });

    expect(result.items).toHaveLength(3);
    expect(result.items.every((item) => item.externalLinksCount > 0)).toBe(true);
  });

  it('gets a project by id with external links', async () => {
    const service = new GetProjectByIdService(
      createSeededInMemoryProjectRepository(),
      createSeededExternalLinkRepository(),
      createSeededInMemoryProjectAssignmentRepository(),
    );

    const result = await service.execute('33333333-3333-3333-3333-333333333003');

    expect(result?.projectCode).toBe('PRJ-102');
    expect(result?.externalLinks).toHaveLength(1);
    expect(result?.externalLinks[0]?.provider).toBe('JIRA');
  });
});

describe('Projects API', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /projects returns project registry data', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/projects?source=JIRA')
      .expect(200);

    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0]).toHaveProperty('projectCode');
    expect(response.body.items[0]).toHaveProperty('externalLinksSummary');

    await app.close();
  });

  it('GET /projects/{id} returns project details', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/projects/33333333-3333-3333-3333-333333333003')
      .expect(200);

    expect(response.body.projectCode).toBe('PRJ-102');
    expect(response.body.externalLinks).toHaveLength(1);

    await app.close();
  });
});
