import { Logger } from '@nestjs/common';

import { MetadataEntry } from '@src/modules/metadata/domain/entities/metadata-entry.entity';
import { MetadataEntryRepositoryPort } from '@src/modules/metadata/domain/repositories/metadata-entry-repository.port';

import { MetadataPrismaMapper } from './metadata-prisma.mapper';

interface MetadataEntryGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

// F-18 / 20c-12 — cap on findByDictionaryId(). Dictionaries are
// admin-curated; typical sizes are 5–50 entries. Real workloads
// won't approach the cap; the warn surfaces drift.
const FIND_BY_DICTIONARY_MAX = 2000;

export class PrismaMetadataEntryRepository implements MetadataEntryRepositoryPort {
  private readonly logger = new Logger(PrismaMetadataEntryRepository.name);

  public constructor(private readonly gateway: MetadataEntryGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByDictionaryId(metadataDictionaryId: string): Promise<MetadataEntry[]> {
    const records = await this.gateway.findMany({
      where: { metadataDictionaryId },
      orderBy: { sortOrder: 'asc' },
      take: FIND_BY_DICTIONARY_MAX,
    });
    if (records.length === FIND_BY_DICTIONARY_MAX) {
      this.logger.warn(
        `findByDictionaryId(${metadataDictionaryId}) hit the ${FIND_BY_DICTIONARY_MAX}-row cap; some entries omitted.`,
      );
    }
    return records.map((record) => MetadataPrismaMapper.toEntry(record));
  }

  public async findByEntryKey(
    metadataDictionaryId: string,
    entryKey: string,
  ): Promise<MetadataEntry | null> {
    const record = await this.gateway.findFirst({
      where: { metadataDictionaryId, entryKey },
    });
    return record ? MetadataPrismaMapper.toEntry(record) : null;
  }

  public async findById(id: string): Promise<MetadataEntry | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? MetadataPrismaMapper.toEntry(record) : null;
  }

  public async save(aggregate: MetadataEntry): Promise<void> {
    await this.gateway.upsert({
      create: {
        archivedAt: aggregate.archivedAt ?? null,
        displayName: aggregate.displayName,
        entryKey: aggregate.entryKey,
        entryValue: aggregate.entryValue,
        id: aggregate.id,
        isEnabled: aggregate.isEnabled,
        metadataDictionaryId: aggregate.metadataDictionaryId,
        sortOrder: aggregate.sortOrder,
      },
      update: {
        archivedAt: aggregate.archivedAt ?? null,
        displayName: aggregate.displayName,
        entryKey: aggregate.entryKey,
        entryValue: aggregate.entryValue,
        isEnabled: aggregate.isEnabled,
        metadataDictionaryId: aggregate.metadataDictionaryId,
        sortOrder: aggregate.sortOrder,
      },
      where: { id: aggregate.id },
    });
  }
}
