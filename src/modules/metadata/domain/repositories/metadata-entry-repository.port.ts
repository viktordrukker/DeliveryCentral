import { RepositoryPort } from '@src/shared/domain/repository-port';

import { MetadataEntry } from '../entities/metadata-entry.entity';

export interface MetadataEntryRepositoryPort extends RepositoryPort<MetadataEntry> {
  findByDictionaryId(metadataDictionaryId: string): Promise<MetadataEntry[]>;
  findByEntryKey(
    metadataDictionaryId: string,
    entryKey: string,
  ): Promise<MetadataEntry | null>;
}
