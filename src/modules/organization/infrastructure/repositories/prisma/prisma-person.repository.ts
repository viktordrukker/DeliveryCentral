import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

import { OrganizationPrismaMapper } from './organization-prisma.mapper';

interface PersonGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaPersonRepository implements PersonRepositoryPort {
  public constructor(private readonly gateway: PersonGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByEmail(email: string): Promise<Person | null> {
    const record = await this.gateway.findFirst({
      include: {
        orgMemberships: {
          select: {
            isPrimary: true,
            orgUnitId: true,
          },
          where: {
            archivedAt: null,
          },
        },
      },
      where: {
        primaryEmail: email.trim().toLowerCase(),
      },
    });

    return record ? OrganizationPrismaMapper.toDomainPerson(record) : null;
  }

  public async findById(id: string): Promise<Person | null> {
    if (!PrismaPersonRepository.looksLikeUuid(id)) {
      return null;
    }

    const record = await this.gateway.findFirst({
      include: {
        orgMemberships: {
          select: {
            isPrimary: true,
            orgUnitId: true,
          },
          where: {
            archivedAt: null,
          },
        },
      },
      where: { id },
    });

    return record ? OrganizationPrismaMapper.toDomainPerson(record) : null;
  }

  public async findByPersonId(personId: PersonId): Promise<Person | null> {
    return this.findById(personId.value);
  }

  public async listAll(): Promise<Person[]> {
    const records = await this.gateway.findMany({
      include: {
        orgMemberships: {
          select: {
            isPrimary: true,
            orgUnitId: true,
          },
          where: {
            archivedAt: null,
          },
        },
      },
    });

    return records.map((record) => OrganizationPrismaMapper.toDomainPerson(record));
  }

  public async save(aggregate: Person): Promise<void> {
    await this.gateway.upsert({
      create: {
        displayName: aggregate.name,
        employmentStatus: aggregate.status,
        familyName: aggregate.familyName,
        grade: aggregate.grade ?? null,
        givenName: aggregate.givenName,
        id: aggregate.personId.value,
        primaryEmail: aggregate.primaryEmail ?? null,
        role: aggregate.role ?? null,
        skillsets: aggregate.skillsets,
        terminatedAt: aggregate.terminatedAt ?? null,
      },
      update: {
        displayName: aggregate.name,
        employmentStatus: aggregate.status,
        familyName: aggregate.familyName,
        grade: aggregate.grade ?? null,
        givenName: aggregate.givenName,
        primaryEmail: aggregate.primaryEmail ?? null,
        role: aggregate.role ?? null,
        skillsets: aggregate.skillsets,
        terminatedAt: aggregate.terminatedAt ?? null,
      },
      where: { id: aggregate.personId.value },
    });
  }

  private static looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
