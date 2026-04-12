import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { HrManagerDashboardQueryService } from '@src/modules/dashboard/application/hr-manager-dashboard-query.service';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import {
  ListPersonDirectoryResult,
  PersonDirectoryQueryRepositoryPort,
  PersonDirectoryRecord,
} from '@src/modules/organization/application/ports/person-directory-query.repository.port';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';

class StaticDirectoryRepository implements PersonDirectoryQueryRepositoryPort {
  public constructor(private readonly items: PersonDirectoryRecord[]) {}

  public async findById(id: string): Promise<PersonDirectoryRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async listManagerScope(): Promise<{
    directReports: PersonDirectoryRecord[];
    dottedLinePeople: PersonDirectoryRecord[];
    managerId: string;
    page: number;
    pageSize: number;
    totalDirectReports: number;
    totalDottedLinePeople: number;
  }> {
    return {
      directReports: [],
      dottedLinePeople: [],
      managerId: '',
      page: 1,
      pageSize: this.items.length,
      totalDirectReports: 0,
      totalDottedLinePeople: 0,
    };
  }

  public async list(): Promise<ListPersonDirectoryResult> {
    return {
      items: [...this.items],
      total: this.items.length,
    };
  }
}

describe('HR manager dashboard query', () => {
  let moduleRef: TestingModule;
  let service: HrManagerDashboardQueryService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = moduleRef.get(HrManagerDashboardQueryService);
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('returns headcount and distribution summaries for a populated organization', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111005',
    });

    expect(result.person.displayName).toBe('Emma Garcia');
    expect(result.headcountSummary.totalHeadcount).toBeGreaterThan(0);
    expect(result.headcountSummary.activeHeadcount).toBeGreaterThan(0);
    expect(result.orgDistribution.length).toBeGreaterThan(0);
    expect(result.gradeDistribution.find((item) => item.key === 'G13')?.count).toBeGreaterThan(0);
    expect(result.roleDistribution.find((item) => item.key === 'Engineering Manager')?.count).toBe(1);
  });

  it('surfaces missing relationship edge cases explicitly', async () => {
    const people = new InMemoryPersonRepository([
      Person.register(
        {
          displayName: 'HR Owner',
          employmentStatus: 'ACTIVE',
          familyName: 'Owner',
          givenName: 'HR',
          primaryEmail: 'hr.owner@example.com',
          role: 'HR Manager',
        },
        PersonId.from('hr-owner'),
      ),
      Person.register(
        {
          displayName: 'Orphan Employee',
          employmentStatus: 'ACTIVE',
          familyName: 'Employee',
          givenName: 'Orphan',
          grade: 'G5',
          orgUnitId: OrgUnitId.from('missing-org'),
          primaryEmail: 'orphan@example.com',
          role: 'Coordinator',
        },
        PersonId.from('orphan-employee'),
      ),
    ]);
    const directoryService = new PersonDirectoryQueryService(
      new StaticDirectoryRepository([
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: null,
          displayName: 'HR Owner',
          dottedLineManagers: [],
          id: 'hr-owner',
          lifecycleStatus: 'ACTIVE',
          primaryEmail: 'hr.owner@example.com',
          resourcePoolIds: [],
          resourcePools: [],
        },
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: null,
          displayName: 'Orphan Employee',
          dottedLineManagers: [],
          id: 'orphan-employee',
          lifecycleStatus: 'ACTIVE',
          primaryEmail: 'orphan@example.com',
          resourcePoolIds: [],
          resourcePools: [],
        },
      ]),
    );
    const auditLogger = {
      list: () => [],
    } as unknown as AuditLoggerService;
    const isolatedService = new HrManagerDashboardQueryService(directoryService, people, auditLogger);

    const result = await isolatedService.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: 'hr-owner',
    });

    expect(result.employeesWithoutManager.map((item) => item.personId)).toEqual(
      expect.arrayContaining(['orphan-employee']),
    );
    expect(result.employeesWithoutOrgUnit.map((item) => item.personId)).toEqual(
      expect.arrayContaining(['orphan-employee']),
    );
  });
});

describe('HR manager dashboard API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /dashboard/hr-manager/{personId} returns HR dashboard data', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard/hr-manager/11111111-1111-1111-1111-111111111005?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body.person.displayName).toBe('Emma Garcia');
    expect(response.body).toHaveProperty('headcountSummary');
    expect(response.body).toHaveProperty('orgDistribution');
    expect(response.body).toHaveProperty('gradeDistribution');
    expect(response.body).toHaveProperty('roleDistribution');
    expect(response.body).toHaveProperty('recentJoinerActivity');
  });
});
