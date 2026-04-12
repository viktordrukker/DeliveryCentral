import { RepositoryPort } from '@src/shared/domain/repository-port';

import { MetadataDictionary } from '../entities/metadata-dictionary.entity';

export interface MetadataDictionaryRepositoryPort extends RepositoryPort<MetadataDictionary> {
  findByDictionaryKey(entityType: string, dictionaryKey: string): Promise<MetadataDictionary | null>;
  list(): Promise<MetadataDictionary[]>;
}
