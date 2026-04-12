import { PersonOrgMembership } from '@src/modules/organization/domain/entities/person-org-membership.entity';
import { PersonOrgMembershipRepositoryPort } from '@src/modules/organization/domain/repositories/person-org-membership-repository.port';
import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

interface PersonOrgMembershipGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaPersonOrgMembershipRepository
  implements PersonOrgMembershipRepositoryPort
{
  public constructor(private readonly gateway: PersonOrgMembershipGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<PersonOrgMembership | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  public async findActiveByOrgUnit(
    orgUnitId: OrgUnitId,
    asOf: Date,
  ): Promise<PersonOrgMembership[]> {
    const records = await this.gateway.findMany({
      where: {
        archivedAt: null,
        orgUnitId: orgUnitId.value,
        validFrom: { lte: asOf },
        OR: [{ validTo: null }, { validTo: { gte: asOf } }],
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  public async findActiveByPerson(
    personId: PersonId,
    asOf: Date,
  ): Promise<PersonOrgMembership[]> {
    const records = await this.gateway.findMany({
      where: {
        archivedAt: null,
        personId: personId.value,
        validFrom: { lte: asOf },
        OR: [{ validTo: null }, { validTo: { gte: asOf } }],
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  public async save(aggregate: PersonOrgMembership): Promise<void> {
    await this.gateway.upsert({
      create: {
        id: aggregate.id,
        isPrimary: aggregate.isPrimary,
        orgUnitId: aggregate.orgUnitId.value,
        personId: aggregate.personId.value,
        positionId: aggregate.positionId ?? null,
        validFrom: aggregate.effectiveDateRange.startsAt,
        validTo: aggregate.effectiveDateRange.endsAt ?? null,
      },
      update: {
        isPrimary: aggregate.isPrimary,
        orgUnitId: aggregate.orgUnitId.value,
        personId: aggregate.personId.value,
        positionId: aggregate.positionId ?? null,
        validFrom: aggregate.effectiveDateRange.startsAt,
        validTo: aggregate.effectiveDateRange.endsAt ?? null,
      },
      where: { id: aggregate.id },
    });
  }

  private toDomain(record: {
    id: string;
    isPrimary: boolean;
    orgUnitId: string;
    personId: string;
    positionId: string | null;
    validFrom: Date;
    validTo: Date | null;
  }): PersonOrgMembership {
    return PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(record.validFrom, record.validTo ?? undefined),
        isPrimary: record.isPrimary,
        orgUnitId: OrgUnitId.from(record.orgUnitId),
        personId: PersonId.from(record.personId),
        positionId: record.positionId ?? undefined,
      },
      record.id,
    );
  }
}
