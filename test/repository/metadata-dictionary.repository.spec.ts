import { InMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/in-memory-metadata-dictionary.repository';
import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';

describe('metadata dictionary repository', () => {
  it('saves and reloads a dictionary by key', async () => {
    const repository = new InMemoryMetadataDictionaryRepository();
    const dictionary = MetadataDictionary.create({
      dictionaryKey: 'employment-grades',
      displayName: 'Employment Grades',
      entityType: 'Person',
    }, 'dict-1');

    await repository.save(dictionary);

    const result = await repository.findByDictionaryKey('Person', 'employment-grades');

    expect(result?.id).toBe('dict-1');
  });
});
