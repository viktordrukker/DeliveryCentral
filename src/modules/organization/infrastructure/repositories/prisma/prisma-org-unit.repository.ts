import { OrgUnit } from '@src/modules/organization/domain/entities/org-unit.entity';
import { OrgUnitRepositoryPort } from '@src/modules/organization/domain/repositories/org-unit-repository.port';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';

import { OrganizationPrismaMapper } from './organization-prisma.mapper';

interface OrgUnitGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<{
    code: string;
    id: string;
    managerPersonId: string | null;
    name: string;
    parentOrgUnitId: string | null;
  } | null>;
  findMany(args?: any): Promise<
    Array<{
      code: string;
      id: string;
      managerPersonId: string | null;
      name: string;
      parentOrgUnitId: string | null;
    }>
  >;
  upsert(args: any): Promise<unknown>;
}

export class PrismaOrgUnitRepository implements OrgUnitRepositoryPort {
  public constructor(private readonly gateway: OrgUnitGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<OrgUnit | null> {
    if (!PrismaOrgUnitRepository.looksLikeUuid(id)) {
      return null;
    }

    const record = await this.gateway.findFirst({ where: { id } });
    return record ? OrganizationPrismaMapper.toDomainOrgUnit(record) : null;
  }

  public async findByOrgUnitId(orgUnitId: OrgUnitId): Promise<OrgUnit | null> {
    return this.findById(orgUnitId.value);
  }

  public async findChildren(parentOrgUnitId: OrgUnitId): Promise<OrgUnit[]> {
    const records = await this.gateway.findMany({
      where: {
        parentOrgUnitId: parentOrgUnitId.value,
      },
    });

    return records.map((record) => OrganizationPrismaMapper.toDomainOrgUnit(record));
  }

  public async listAll(): Promise<OrgUnit[]> {
    const records = await this.gateway.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return records.map((record) => OrganizationPrismaMapper.toDomainOrgUnit(record));
  }

  public async save(aggregate: OrgUnit): Promise<void> {
    await this.gateway.upsert({
      create: {
        code: aggregate.code,
        id: aggregate.orgUnitId.value,
        managerPersonId: aggregate.managerPersonId?.value ?? null,
        name: aggregate.name,
        parentOrgUnitId: aggregate.parentOrgUnitId?.value ?? null,
      },
      update: {
        code: aggregate.code,
        managerPersonId: aggregate.managerPersonId?.value ?? null,
        name: aggregate.name,
        parentOrgUnitId: aggregate.parentOrgUnitId?.value ?? null,
      },
      where: { id: aggregate.orgUnitId.value },
    });
  }

  private static looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
