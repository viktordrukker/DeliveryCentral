import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { TeamQueryService } from '@src/modules/organization/application/team-query.service';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';
import { seedDemoWorkEvidenceRuntimeData } from '../helpers/db/seed-demo-work-evidence-runtime-data';

describe('Team management visibility', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
    await seedDemoWorkEvidenceRuntimeData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('retrieves operational teams', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = moduleRef.get(TeamQueryService);

    const result = await service.listTeams();

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'POOL-ENG',
          id: '26666666-0000-0000-0000-000000000001',
          name: 'Engineering Pool',
        }),
        expect.objectContaining({
          code: 'POOL-CON',
          id: '26666666-0000-0000-0000-000000000002',
          name: 'Consulting Pool',
        }),
      ]),
    );

    await moduleRef.close();
  });

  it('retrieves team members', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const teamQueryService = moduleRef.get(TeamQueryService);
    const result = await teamQueryService.getTeamMembersAsOf(
      '26666666-0000-0000-0000-000000000001',
      new Date('2025-03-15T00:00:00.000Z'),
    );

    expect(result?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: 'Sophia Kim',
          id: '11111111-1111-1111-1111-111111111006',
        }),
        expect.objectContaining({
          displayName: 'Mason Singh',
          id: '11111111-1111-1111-1111-111111111007',
        }),
      ]),
    );

    await moduleRef.close();
  });

  it('aggregates team dashboard summary', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await prisma.projectAssignment.create({
      data: {
        allocationPercent: '30.00',
        approvedAt: new Date('2025-02-05T00:00:00.000Z'),
        assignmentCode: 'ASN-TEAM-SPREAD',
        notes: 'Additional cross-project load for analytics.',
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: '33333333-3333-3333-3333-333333333002',
        requestedAt: new Date('2025-02-03T00:00:00.000Z'),
        requestedByPersonId: '11111111-1111-1111-1111-111111111006',
        staffingRole: 'Platform Engineer',
        status: 'APPROVED',
        validFrom: new Date('2025-02-05T00:00:00.000Z'),
        validTo: new Date('2025-04-15T23:59:59.999Z'),
      },
    });
    await prisma.workEvidence.create({
      data: {
        evidenceType: 'JIRA_WORKLOG',
        id: '40000000-0000-0000-0000-000000000099',
        personId: '11111111-1111-1111-1111-111111111009',
        projectId: '33333333-3333-3333-3333-333333333003',
        recordedAt: new Date('2025-03-06T09:00:00.000Z'),
        sourceRecordKey: 'WL-TEAM-GAP-1',
        status: 'CAPTURED',
        summary: 'Evidence recorded against an unstaffed project.',
        workEvidenceSourceId: '39999999-0000-0000-0000-000000000001',
      },
    });

    const teamQueryService = moduleRef.get(TeamQueryService);
    const result = await teamQueryService.getTeamDashboard(
      '26666666-0000-0000-0000-000000000001',
      new Date('2025-03-15T00:00:00.000Z'),
    );

    expect(result).toEqual(
      expect.objectContaining({
        activeAssignmentsCount: 3,
        projectCount: 3,
        teamMemberCount: 4,
      }),
    );
    expect(result?.projectsInvolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '33333333-3333-3333-3333-333333333002',
          name: 'Delivery Central Platform',
        }),
        expect.objectContaining({
          id: '33333333-3333-3333-3333-333333333003',
          name: 'Atlas ERP Rollout',
        }),
        expect.objectContaining({
          id: '33333333-3333-3333-3333-333333333004',
          name: 'Beacon Mobile Revamp',
        }),
      ]),
    );
    expect(result?.peopleWithNoAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '11111111-1111-1111-1111-111111111006' }),
        expect.objectContaining({ id: '11111111-1111-1111-1111-111111111007' }),
      ]),
    );
    expect(result?.peopleWithEvidenceAlignmentGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '11111111-1111-1111-1111-111111111009' }),
      ]),
    );
    expect(result?.crossProjectSpread).toEqual(
      expect.objectContaining({
        maxProjectsPerMember: 2,
        membersOnMultipleProjects: expect.arrayContaining([
          expect.objectContaining({
            activeProjectCount: 2,
            id: '11111111-1111-1111-1111-111111111008',
          }),
        ]),
        membersOnMultipleProjectsCount: 1,
      }),
    );
    expect(result?.anomalySummary).toEqual(
      expect.objectContaining({
        assignmentWithoutEvidenceCount: 2,
        evidenceWithoutAssignmentCount: 1,
        openExceptionCount: 3,
      }),
    );

    await moduleRef.close();
  });
});

describe('Teams API', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
    await seedDemoWorkEvidenceRuntimeData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('serves team, members, and dashboard endpoints', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const teams = await request(app.getHttpServer()).get('/teams').expect(200);
    expect(teams.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '26666666-0000-0000-0000-000000000001',
        }),
      ]),
    );

    const team = await request(app.getHttpServer())
      .get('/teams/26666666-0000-0000-0000-000000000001')
      .expect(200);
    expect(team.body.name).toBe('Engineering Pool');

    const members = await request(app.getHttpServer())
      .get('/teams/26666666-0000-0000-0000-000000000001/members?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);
    expect(members.body.items).toHaveLength(4);

    const dashboard = await request(app.getHttpServer())
      .get('/teams/26666666-0000-0000-0000-000000000001/dashboard?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);
    expect(dashboard.body.teamMemberCount).toBe(4);
    expect(dashboard.body.activeAssignmentsCount).toBe(2);
    expect(dashboard.body.projectCount).toBe(2);
    expect(dashboard.body.anomalySummary).toEqual(
      expect.objectContaining({
        assignmentWithoutEvidenceCount: 1,
        openExceptionCount: 1,
      }),
    );
    expect(Array.isArray(dashboard.body.peopleWithEvidenceAlignmentGaps)).toBe(true);
    expect(dashboard.body.crossProjectSpread).toEqual(
      expect.objectContaining({
        membersOnMultipleProjectsCount: 0,
      }),
    );

    await app.close();
  });

  it('creates a team and updates members', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const createResponse = await request(app.getHttpServer())
      .post('/teams')
      .send({
        code: 'POOL-QA-NEW',
        description: 'New QA delivery team.',
        name: 'Quality Engineering Squad',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        code: 'POOL-QA-NEW',
        name: 'Quality Engineering Squad',
      }),
    );

    const addMemberResponse = await request(app.getHttpServer())
      .post(`/teams/${createResponse.body.id}/members`)
      .send({
        action: 'add',
        personId: '11111111-1111-1111-1111-111111111012',
      })
      .expect(200);

    expect(addMemberResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: 'Zoe Turner',
          id: '11111111-1111-1111-1111-111111111012',
        }),
      ]),
    );

    const removeMemberResponse = await request(app.getHttpServer())
      .post(`/teams/${createResponse.body.id}/members`)
      .send({
        action: 'remove',
        personId: '11111111-1111-1111-1111-111111111012',
      })
      .expect(200);

    expect(
      removeMemberResponse.body.items.some(
        (item: { id: string }) => item.id === '11111111-1111-1111-1111-111111111012',
      ),
    ).toBe(false);

    await app.close();
  });
});
