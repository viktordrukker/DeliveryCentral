import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { CreateEmployeeService } from '@src/modules/organization/application/create-employee.service';
import { DeactivateEmployeeService } from '@src/modules/organization/application/deactivate-employee.service';
import { createSeededInMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-org-unit.repository';
import { createSeededInMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person-org-membership.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';

describe('Create employee', () => {
  it('creates an employee with inactive default status and org membership', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const orgUnitRepository = createSeededInMemoryOrgUnitRepository();
    const membershipRepository = createSeededInMemoryPersonOrgMembershipRepository();
    const service = new CreateEmployeeService(
      personRepository,
      orgUnitRepository,
      membershipRepository,
    );

    const employee = await service.execute({
      email: 'new.employee@example.com',
      grade: 'G7',
      name: 'Riley Morgan',
      orgUnitId: '22222222-2222-2222-2222-222222222005',
      role: 'Solutions Analyst',
      skillsets: ['Facilitation', 'SQL', 'SQL'],
    });

    const persisted = await personRepository.findByEmail('new.employee@example.com');
    const memberships = await membershipRepository.findActiveByPerson(
      employee.personId,
      new Date('2100-01-01T00:00:00.000Z'),
    );

    expect(employee.name).toBe('Riley Morgan');
    expect(employee.status).toBe('INACTIVE');
    expect(employee.skillsets).toEqual(['Facilitation', 'SQL']);
    expect(persisted?.primaryEmail).toBe('new.employee@example.com');
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.orgUnitId.value).toBe('22222222-2222-2222-2222-222222222005');
  });

  it('rejects duplicate employee email', async () => {
    const service = new CreateEmployeeService(
      createSeededInMemoryPersonRepository(),
      createSeededInMemoryOrgUnitRepository(),
      createSeededInMemoryPersonOrgMembershipRepository(),
    );

    await expect(
      service.execute({
        email: 'ava.rowe@example.com',
        name: 'Jordan Price',
        orgUnitId: '22222222-2222-2222-2222-222222222003',
      }),
    ).rejects.toThrow('Employee email already exists.');
  });

  it('rejects missing org unit', async () => {
    const service = new CreateEmployeeService(
      createSeededInMemoryPersonRepository(),
      createSeededInMemoryOrgUnitRepository(),
      createSeededInMemoryPersonOrgMembershipRepository(),
    );

    await expect(
      service.execute({
        email: 'jordan.price@example.com',
        name: 'Jordan Price',
        orgUnitId: 'missing-org-unit',
      }),
    ).rejects.toThrow('Org unit does not exist.');
  });

  it('deactivates an active employee without deleting history-bearing records', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const service = new DeactivateEmployeeService(personRepository);

    const employee = await service.execute('11111111-1111-1111-1111-111111111001');
    const persisted = await personRepository.findById('11111111-1111-1111-1111-111111111001');

    expect(employee.status).toBe('INACTIVE');
    expect(persisted?.status).toBe('INACTIVE');
  });
});

describe('Org people API', () => {
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

  it('POST /org/people creates an employee', async () => {
    const response = await request(app.getHttpServer())
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: 'casey.nguyen@example.com',
        grade: 'G6',
        name: 'Casey Nguyen',
        orgUnitId: '22222222-2222-2222-2222-222222222006',
        role: 'Data Consultant',
        skillsets: ['Python', 'ETL'],
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        email: 'casey.nguyen@example.com',
        grade: 'G6',
        id: expect.any(String),
        name: 'Casey Nguyen',
        orgUnitId: '22222222-2222-2222-2222-222222222006',
        role: 'Data Consultant',
        skillsets: ['Python', 'ETL'],
        status: 'INACTIVE',
      }),
    );
  });

  it('POST /org/people rejects duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: 'ava.rowe@example.com',
        name: 'Duplicate Ava',
        orgUnitId: '22222222-2222-2222-2222-222222222003',
      })
      .expect(409);
  });

  it('POST /org/people rejects missing org unit', async () => {
    await request(app.getHttpServer())
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: 'org.missing@example.com',
        name: 'Org Missing',
        orgUnitId: 'does-not-exist',
      })
      .expect(404);
  });

  it('POST /org/people/{id}/deactivate deactivates an active employee', async () => {
    const response = await request(app.getHttpServer())
      .post('/org/people/11111111-1111-1111-1111-111111111001/deactivate')
      .set(roleHeaders('hr_manager'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111001',
        status: 'INACTIVE',
      }),
    );
  });

  it('POST /org/people/{id}/deactivate rejects already inactive employee', async () => {
    await request(app.getHttpServer())
      .post('/org/people/11111111-1111-1111-1111-111111111002/deactivate')
      .set(roleHeaders('hr_manager'))
      .expect(200);

    await request(app.getHttpServer())
      .post('/org/people/11111111-1111-1111-1111-111111111002/deactivate')
      .set(roleHeaders('hr_manager'))
      .expect(400);
  });
});
