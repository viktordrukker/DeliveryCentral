import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { CreateWorkEvidenceService } from '@src/modules/work-evidence/application/create-work-evidence.service';
import { ListWorkEvidenceService } from '@src/modules/work-evidence/application/list-work-evidence.service';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

describe('Work evidence ingestion', () => {
  it('creates valid evidence', async () => {
    const repository = new InMemoryWorkEvidenceRepository();
    const service = new CreateWorkEvidenceService(repository);

    const evidence = await service.execute({
      details: { activity: 'timesheet' },
      effortHours: 4,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      recordedAt: '2025-03-20T12:00:00.000Z',
      sourceRecordKey: 'MANUAL-001',
      sourceType: 'MANUAL',
      summary: 'Manual effort entry',
      trace: {
        correlationId: 'corr-1',
      },
    });

    expect(evidence.workEvidenceId.value).toBeDefined();
    expect(evidence.personId).toBe('11111111-1111-1111-1111-111111111012');
  });

  it('allows evidence for an unassigned person', async () => {
    const repository = new InMemoryWorkEvidenceRepository();
    const service = new CreateWorkEvidenceService(repository);

    const evidence = await service.execute({
      effortHours: 2.5,
      personId: '11111111-1111-1111-1111-111111111011',
      projectId: '33333333-3333-3333-3333-333333333005',
      recordedAt: '2025-03-20T12:00:00.000Z',
      sourceRecordKey: 'MANUAL-002',
      sourceType: 'MANUAL',
      summary: 'Observed backlog support',
    });

    expect(evidence.personId).toBe('11111111-1111-1111-1111-111111111011');
  });

  it('rejects invalid input', async () => {
    const repository = new InMemoryWorkEvidenceRepository();
    const service = new CreateWorkEvidenceService(repository);

    await expect(
      service.execute({
        effortHours: -1,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        recordedAt: 'invalid-date',
        sourceRecordKey: '',
        sourceType: 'MANUAL',
      }),
    ).rejects.toThrow('Work evidence recordedAt is invalid.');
  });

  it('lists and filters evidence', async () => {
    const repository = new InMemoryWorkEvidenceRepository();
    const createService = new CreateWorkEvidenceService(repository);
    const listService = new ListWorkEvidenceService(repository);

    await createService.execute({
      effortHours: 1,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      recordedAt: '2025-03-20T10:00:00.000Z',
      sourceRecordKey: 'MANUAL-003',
      sourceType: 'MANUAL',
    });
    await createService.execute({
      effortHours: 2,
      personId: '11111111-1111-1111-1111-111111111010',
      projectId: '33333333-3333-3333-3333-333333333002',
      recordedAt: '2025-03-21T10:00:00.000Z',
      sourceRecordKey: 'MANUAL-004',
      sourceType: 'TIMESHEET',
    });

    const result = await listService.execute({
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      sourceType: 'MANUAL',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.personId).toBe('11111111-1111-1111-1111-111111111012');
  });
});

describe('Work evidence API', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /work-evidence creates evidence and GET /work-evidence lists it', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/work-evidence')
      .send({
        effortHours: 3.5,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        recordedAt: '2025-03-20T12:00:00.000Z',
        sourceRecordKey: 'MANUAL-API-001',
        sourceType: 'MANUAL',
        summary: 'Manual API evidence',
      })
      .expect(201);

    expect(created.body.projectId).toBe('33333333-3333-3333-3333-333333333002');

    const listed = await request(app.getHttpServer())
      .get('/work-evidence?personId=11111111-1111-1111-1111-111111111012&sourceType=MANUAL')
      .expect(200);

    expect(listed.body.items.some((item: { id: string }) => item.id === created.body.id)).toBe(true);

    await app.close();
  });
});
