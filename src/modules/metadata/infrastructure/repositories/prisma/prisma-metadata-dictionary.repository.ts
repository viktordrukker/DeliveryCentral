import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';
import { MetadataDictionaryRepositoryPort } from '@src/modules/metadata/domain/repositories/metadata-dictionary-repository.port';

import { MetadataPrismaMapper } from './metadata-prisma.mapper';

interface MetadataDictionaryGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaMetadataDictionaryRepository
  implements MetadataDictionaryRepositoryPort
{
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
    const records = await this.gateway.findMany();
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
