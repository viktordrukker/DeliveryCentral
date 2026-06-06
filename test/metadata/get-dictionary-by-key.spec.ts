/**
 * W1-19 — key-based dictionary lookup. `getDictionaryByKey(entityType,
 * dictionaryKey)` is the FE-friendly entry point so callers don't have to
 * embed hardcoded UUIDs to fetch a dictionary.
 */
import { MetadataDictionaryQueryService } from '@src/modules/metadata/application/metadata-dictionary-query.service';
import {
  MetadataRelatedEntitiesRepositoryPort,
  MetadataRelatedCustomFieldRow,
  MetadataRelatedLayoutRow,
  MetadataRelatedWorkflowRow,
} from '@src/modules/metadata/application/ports/metadata-related-entities.repository.port';
import { createSeededInMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-dictionary.repository';
import { createSeededInMemoryMetadataEntryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-entry.repository';

class StubRelatedEntitiesRepository implements MetadataRelatedEntitiesRepositoryPort {
  public async listCustomFieldsForDictionary(): Promise<MetadataRelatedCustomFieldRow[]> {
    return [];
  }
  public async countCustomFieldsForDictionary(): Promise<number> {
    return 0;
  }
  public async listLayoutsForEntityType(): Promise<MetadataRelatedLayoutRow[]> {
    return [];
  }
  public async listWorkflowsForEntityType(): Promise<MetadataRelatedWorkflowRow[]> {
    return [];
  }
  public async countWorkflowsForEntityType(): Promise<number> {
    return 0;
  }
}

describe('MetadataDictionaryQueryService.getDictionaryByKey', () => {
  function build(): MetadataDictionaryQueryService {
    return new MetadataDictionaryQueryService(
      createSeededInMemoryMetadataDictionaryRepository(),
      createSeededInMemoryMetadataEntryRepository(),
      new StubRelatedEntitiesRepository(),
    );
  }

  it('resolves a dictionary by (entityType, dictionaryKey) and returns full details', async () => {
    const service = build();

    const result = await service.getDictionaryByKey('Person', 'grade');

    expect(result).not.toBeNull();
    expect(result?.dictionaryKey).toBe('grade');
    expect(result?.entityType).toBe('Person');
    expect(result?.displayName).toBe('Employee Grades');
  });

  it('returns null when the (entityType, dictionaryKey) pair does not exist', async () => {
    const service = build();

    const result = await service.getDictionaryByKey('Person', 'does-not-exist');

    expect(result).toBeNull();
  });
});
