import { Prisma } from '@prisma/client';

import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { ReportingLineRepositoryPort } from '@src/modules/organization/domain/repositories/reporting-line-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';

import { OrganizationPrismaMapper } from './organization-prisma.mapper';

// F-81 / 20c-10 — drop the hand-rolled gateway (~12 lines of inline
// enum-literal payload duplication) in favor of `Pick<>` over Prisma's
// typed delegate.
type ReportingLinePersistenceGateway = Pick<
  Prisma.ReportingLineDelegate,
  'delete' | 'findMany' | 'upsert'
>;

export class PrismaReportingLineRepository implements ReportingLineRepositoryPort {
  public constructor(private readonly gateway: ReportingLinePersistenceGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<ReportingLine | null> {
    const records = await this.gateway.findMany({
      where: {
        id,
      },
    });

    return records[0] ? OrganizationPrismaMapper.toDomainReportingLine(records[0]) : null;
  }

  public async findActiveByManager(
    managerId: PersonId,
    asOf: Date,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]> {
    const records = await this.gateway.findMany({
      where: {
        managerPersonId: managerId.value,
        ...(relationshipTypes && relationshipTypes.length > 0
          ? {
              relationshipType: {
                in: relationshipTypes.map((item) => item.value),
              },
            }
          : {}),
        validFrom: {
          lte: asOf,
        },
        OR: [
          {
            validTo: null,
          },
          {
            validTo: {
              gte: asOf,
            },
          },
        ],
      },
    });

    return records.map((record) => OrganizationPrismaMapper.toDomainReportingLine(record));
  }

  public async findActiveBySubject(
    subjectId: PersonId,
    asOf: Date,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]> {
    const records = await this.gateway.findMany({
      where: {
        subjectPersonId: subjectId.value,
        ...(relationshipTypes && relationshipTypes.length > 0
          ? {
              relationshipType: {
                in: relationshipTypes.map((item) => item.value),
              },
            }
          : {}),
        validFrom: {
          lte: asOf,
        },
        OR: [
          {
            validTo: null,
          },
          {
            validTo: {
              gte: asOf,
            },
          },
        ],
      },
    });

    return records.map((record) => OrganizationPrismaMapper.toDomainReportingLine(record));
  }

  public async findBySubject(
    subjectId: PersonId,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]> {
    const records = await this.gateway.findMany({
      where: {
        subjectPersonId: subjectId.value,
        ...(relationshipTypes && relationshipTypes.length > 0
          ? {
              relationshipType: {
                in: relationshipTypes.map((item) => item.value),
              },
            }
          : {}),
      },
    });

    return records.map((record) => OrganizationPrismaMapper.toDomainReportingLine(record));
  }

  public async save(aggregate: ReportingLine): Promise<void> {
    await this.gateway.upsert({
      create: {
        authority: aggregate.authority,
        id: aggregate.id,
        isPrimary: aggregate.isPrimary,
        managerPersonId: aggregate.managerId.value,
        relationshipType: aggregate.type.value,
        subjectPersonId: aggregate.subjectId.value,
        validFrom: aggregate.effectiveDateRange.startsAt,
        validTo: aggregate.effectiveDateRange.endsAt ?? null,
      },
      update: {
        authority: aggregate.authority,
        isPrimary: aggregate.isPrimary,
        managerPersonId: aggregate.managerId.value,
        relationshipType: aggregate.type.value,
        subjectPersonId: aggregate.subjectId.value,
        validFrom: aggregate.effectiveDateRange.startsAt,
        validTo: aggregate.effectiveDateRange.endsAt ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
