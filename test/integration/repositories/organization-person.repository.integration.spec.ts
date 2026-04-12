import { PrismaClient } from '@prisma/client';

import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonOrgMembership } from '@src/modules/organization/domain/entities/person-org-membership.entity';
import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { PrismaPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/prisma/prisma-person-org-membership.repository';
import { PrismaPersonRepository } from '@src/modules/organization/infrastructure/repositories/prisma/prisma-person.repository';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma person repositories', () => {
  let prisma: PrismaClient;
  let personRepository: PrismaPersonRepository;
  let membershipRepository: PrismaPersonOrgMembershipRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    personRepository = new PrismaPersonRepository(prisma.person);
    membershipRepository = new PrismaPersonOrgMembershipRepository(prisma.personOrgMembership);
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists an employee with unique email and org membership', async () => {
    const employee = Person.createEmployee(
      {
        email: 'persistence.employee@example.com',
        grade: 'G8',
        name: 'Persistence Employee',
        orgUnitId: OrgUnitId.from(persistenceReferenceIds.orgUnitId),
        role: 'Platform Engineer',
        skillsets: ['Node.js', 'Prisma'],
      },
      PersonId.from('90111111-0000-0000-0000-000000000001'),
    );

    await personRepository.save(employee);
    await membershipRepository.save(
      PersonOrgMembership.create(
        {
          effectiveDateRange: EffectiveDateRange.create(
            new Date('2025-04-01T00:00:00.000Z'),
          ),
          isPrimary: true,
          orgUnitId: OrgUnitId.from(persistenceReferenceIds.orgUnitId),
          personId: employee.personId,
        },
        '90111111-0000-0000-0000-000000000101',
      ),
    );

    const persisted = await personRepository.findByEmail('persistence.employee@example.com');
    const memberships = await membershipRepository.findActiveByPerson(
      employee.personId,
      new Date('2025-04-15T00:00:00.000Z'),
    );

    expect(persisted?.name).toBe('Persistence Employee');
    expect(persisted?.grade).toBe('G8');
    expect(persisted?.role).toBe('Platform Engineer');
    expect(persisted?.skillsets).toEqual(['Node.js', 'Prisma']);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.orgUnitId.value).toBe(persistenceReferenceIds.orgUnitId);
  });

  it('enforces unique employee email at the database layer', async () => {
    await personRepository.save(
      Person.createEmployee(
        {
          email: 'duplicate.employee@example.com',
          name: 'Duplicate Employee',
          orgUnitId: OrgUnitId.from(persistenceReferenceIds.orgUnitId),
        },
        PersonId.from('90111111-0000-0000-0000-000000000002'),
      ),
    );

    await expect(
      personRepository.save(
        Person.createEmployee(
          {
            email: 'duplicate.employee@example.com',
            name: 'Duplicate Employee Two',
            orgUnitId: OrgUnitId.from(persistenceReferenceIds.orgUnitId),
          },
          PersonId.from('90111111-0000-0000-0000-000000000003'),
        ),
      ),
    ).rejects.toThrow();
  });

  it('enforces org unit foreign key consistency for memberships', async () => {
    const employee = Person.createEmployee(
      {
        email: 'missing.org@example.com',
        name: 'Missing Org',
        orgUnitId: OrgUnitId.from(persistenceReferenceIds.orgUnitId),
      },
      PersonId.from('90111111-0000-0000-0000-000000000004'),
    );

    await personRepository.save(employee);

    await expect(
      membershipRepository.save(
        PersonOrgMembership.create(
          {
            effectiveDateRange: EffectiveDateRange.create(
              new Date('2025-04-01T00:00:00.000Z'),
            ),
            isPrimary: true,
            orgUnitId: OrgUnitId.from('93000000-0000-0000-0000-000000009999'),
            personId: employee.personId,
          },
          '90111111-0000-0000-0000-000000000102',
        ),
      ),
    ).rejects.toThrow();
  });

  it('persists employee deactivation without deleting the employee record', async () => {
    const employee = Person.createEmployee(
      {
        email: 'lifecycle.employee@example.com',
        name: 'Lifecycle Employee',
        orgUnitId: OrgUnitId.from(persistenceReferenceIds.orgUnitId),
        status: 'ACTIVE',
      },
      PersonId.from('90111111-0000-0000-0000-000000000005'),
    );

    await personRepository.save(employee);
    employee.deactivate();
    await personRepository.save(employee);

    const persisted = await personRepository.findByPersonId(employee.personId);

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe('INACTIVE');
    expect(persisted?.primaryEmail).toBe('lifecycle.employee@example.com');
  });
});
