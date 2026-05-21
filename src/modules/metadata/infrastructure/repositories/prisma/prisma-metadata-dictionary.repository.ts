import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';
import { MetadataDictionaryRepositoryPort } from '@src/modules/metadata/domain/repositories/metadata-dictionary-repository.port';

import { MetadataPrismaMapper } from './metadata-prisma.mapper';

// F-73 / 20c-10 — drop the hand-rolled Gateway interface (4 methods with
// `any` args + `any` returns) in favor of `Pick<>` over Prisma's typed
// delegate — narrows to just the methods this repo uses so unit-test
// mocks stay a tight surface (and Prisma still type-checks args/returns).
type MetadataDictionaryGateway = Pick<
  Prisma.MetadataDictionaryDelegate,
  'delete' | 'findFirst' | 'findMany' | 'upsert'
>;

/**
 * F-6.2 / D-144 — cap on list(). MetadataDictionary tables stay in the
 * low hundreds even at bank-IT scale; this cap is defensive against
 * tenant-driven growth (T-09 dictionary expansion will eventually use
 * pagination via a dedicated query service).
 */
const LIST_MAX = 1000;

export class PrismaMetadataDictionaryRepository
  implements MetadataDictionaryRepositoryPort
{
  private readonly logger = new Logger(PrismaMetadataDictionaryRepository.name);

  public constructor(private readonly gateway: MetadataDictionaryGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByDictionaryKey(
    entityType: string,
    dictionaryKey: string,
  ): Promise<MetadataDictionary | null> {
    const record = await this.gateway.findFirst({
      where: { entityType, dictionaryKey },
    });
    return record ? MetadataPrismaMapper.toDictionary(record) : null;
  }

  public async findById(id: string): Promise<MetadataDictionary | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? MetadataPrismaMapper.toDictionary(record) : null;
  }

  public async list(): Promise<MetadataDictionary[]> {
    const records = await this.gateway.findMany({
      orderBy: [{ entityType: 'asc' }, { dictionaryKey: 'asc' }],
      take: LIST_MAX,
    });
    if (records.length === LIST_MAX) {
      this.logger.warn(
        `list() hit the ${LIST_MAX}-row cap; older dictionaries omitted.`,
      );
    }
    return records.map((record) => MetadataPrismaMapper.toDictionary(record));
  }

  public async save(aggregate: MetadataDictionary): Promise<void> {
    await this.gateway.upsert({
      create: {
        archivedAt: aggregate.archivedAt ?? null,
        description: aggregate.description ?? null,
        dictionaryKey: aggregate.dictionaryKey,
        displayName: aggregate.displayName,
        entityType: aggregate.entityType,
        id: aggregate.id,
        isSystemManaged: aggregate.isSystemManaged,
        scopeOrgUnitId: aggregate.scopeOrgUnitId ?? null,
      },
      update: {
        archivedAt: aggregate.archivedAt ?? null,
        description: aggregate.description ?? null,
        dictionaryKey: aggregate.dictionaryKey,
        displayName: aggregate.displayName,
        entityType: aggregate.entityType,
        isSystemManaged: aggregate.isSystemManaged,
        scopeOrgUnitId: aggregate.scopeOrgUnitId ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
