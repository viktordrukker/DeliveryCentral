import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { CreateCaseService } from '@src/modules/case-management/application/create-case.service';
import { InMemoryCaseRecordRepository } from '@src/modules/case-management/infrastructure/repositories/in-memory/in-memory-case-record.repository';

describe('Case management', () => {
  it('creates an onboarding case linked to person and optional assignment context', async () => {
    const repository = new InMemoryCaseRecordRepository();
    const service = new CreateCaseService(repository);

    const result = await service.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111006',
      participants: [
        {
          personId: '11111111-1111-1111-1111-111111111006',
          role: 'OPERATOR',
        },
      ],
      relatedAssignmentId: '36666666-0000-0000-0000-000000000001',
      relatedProjectId: '33333333-3333-3333-3333-333333333003',
      subjectPersonId: '11111111-1111-1111-1111-111111111012',
      summary: 'Prepare onboarding for project delivery.',
    });

    expect(result.caseType.key).toBe('ONBOARDING');
    expect(result.subjectPersonId).toBe('11111111-1111-1111-1111-111111111012');
    expect(result.relatedAssignmentId).toBe('36666666-0000-0000-0000-000000000001');
    expect(result.participants).toHaveLength(1);
    expect(result.status).toBe('OPEN');
  });

  it('retrieves a created case by id', async () => {
    const repository = new InMemoryCaseRecordRepository();
    const service = new CreateCaseService(repository);

    const created = await service.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111006',
      subjectPersonId: '11111111-1111-1111-1111-111111111012',
      summary: 'Laptop and access setup.',
    });

    const fetched = await repository.findByCaseId(created.caseId);

    expect(fetched?.caseId.equals(created.caseId)).toBe(true);
    expect(fetched?.summary).toBe('Laptop and access setup.');
  });

  it('lists cases', async () => {
    const repository = new InMemoryCaseRecordRepository();
    const service = new CreateCaseService(repository);

    await service.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111006',
      subjectPersonId: '11111111-1111-1111-1111-111111111012',
      summary: 'First case.',
    });
    await service.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111007',
      subjectPersonId: '11111111-1111-1111-1111-111111111011',
      summary: 'Second case.',
    });

    const listed = await repository.list({});

    expect(listed).toHaveLength(2);
  });
});

describe('Case management API', () => {
  it('creates, lists, and retrieves onboarding cases', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/cases')
      .send({
        caseTypeKey: 'ONBOARDING',
        ownerPersonId: '11111111-1111-1111-1111-111111111006',
        participants: [
          {
            personId: '11111111-1111-1111-1111-111111111006',
            role: 'OPERATOR',
          },
        ],
        relatedAssignmentId: '36666666-0000-0000-0000-000000000001',
        relatedProjectId: '33333333-3333-3333-3333-333333333003',
        subjectPersonId: '11111111-1111-1111-1111-111111111012',
        summary: 'Onboard consultant to delivery project.',
      })
      .expect(201);

    expect(created.body.caseTypeKey).toBe('ONBOARDING');
    expect(created.body.subjectPersonId).toBe('11111111-1111-1111-1111-111111111012');

    const listed = await request(app.getHttpServer()).get('/cases').expect(200);
    expect(listed.body.items.some((item: { id: string }) => item.id === created.body.id)).toBe(
      true,
    );

    const fetched = await request(app.getHttpServer())
      .get(`/cases/${created.body.id}`)
      .expect(200);

    expect(fetched.body.id).toBe(created.body.id);
    expect(fetched.body.ownerPersonId).toBe('11111111-1111-1111-1111-111111111006');

    await app.close();
  });
});
