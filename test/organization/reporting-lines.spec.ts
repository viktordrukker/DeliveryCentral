import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { AssignLineManagerService } from '@src/modules/organization/application/assign-line-manager.service';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { createSeededInMemoryReportingLineRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-reporting-line.repository';
import { roleHeaders } from '../helpers/api/auth-headers';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';

describe('Assign line manager', () => {
  it('creates a valid future-dated solid-line manager assignment', async () => {
    const repository = createSeededInMemoryReportingLineRepository();
    const service = new AssignLineManagerService(
      createSeededInMemoryPersonRepository(),
      repository,
    );

    const reportingLine = await service.execute({
      endDate: '2025-12-31T23:59:59.999Z',
      managerId: '11111111-1111-1111-1111-111111111007',
      personId: '11111111-1111-1111-1111-111111111008',
      startDate: '2025-07-01T00:00:00.000Z',
      type: 'SOLID',
    });

    const lines = await repository.findBySubject(PersonId.from('11111111-1111-1111-1111-111111111008'), [
      ReportingLineType.solidLine(),
    ]);

    expect(reportingLine.managerId.value).toBe('11111111-1111-1111-1111-111111111007');
    expect(lines).toHaveLength(2);
    expect(lines.some((line) => line.id === reportingLine.id)).toBe(true);
  });

  it('rejects overlapping solid-line manager assignments', async () => {
    const repository = createSeededInMemoryReportingLineRepository();
    const service = new AssignLineManagerService(
      createSeededInMemoryPersonRepository(),
      repository,
    );

    await service.execute({
      managerId: '11111111-1111-1111-1111-111111111007',
      personId: '11111111-1111-1111-1111-111111111008',
      startDate: '2025-07-01T00:00:00.000Z',
      type: 'SOLID',
    });

    await expect(
      service.execute({
        managerId: '11111111-1111-1111-1111-111111111005',
        personId: '11111111-1111-1111-1111-111111111008',
        startDate: '2025-03-15T00:00:00.000Z',
        type: 'SOLID',
      }),
    ).rejects.toThrow('Overlapping solid-line manager assignment already exists.');
  });
});

describe('Reporting lines API', () => {
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

  it('POST /org/reporting-lines creates a valid future-dated solid-line manager assignment', async () => {
    const response = await request(app.getHttpServer())
      .post('/org/reporting-lines')
      .set(roleHeaders('resource_manager'))
      .send({
        managerId: '11111111-1111-1111-1111-111111111007',
        personId: '11111111-1111-1111-1111-111111111008',
        startDate: '2025-07-01T00:00:00.000Z',
        type: 'SOLID',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        managerId: '11111111-1111-1111-1111-111111111007',
        personId: '11111111-1111-1111-1111-111111111008',
        startDate: '2025-07-01T00:00:00.000Z',
        type: 'SOLID',
      }),
    );
  });

  it('POST /org/reporting-lines rejects overlapping solid-line manager assignments', async () => {
    await request(app.getHttpServer())
      .post('/org/reporting-lines')
      .set(roleHeaders('resource_manager'))
      .send({
        managerId: '11111111-1111-1111-1111-111111111007',
        personId: '11111111-1111-1111-1111-111111111008',
        startDate: '2024-01-01T00:00:00.000Z',
        type: 'SOLID',
      })
      .expect(400);
  });
});
