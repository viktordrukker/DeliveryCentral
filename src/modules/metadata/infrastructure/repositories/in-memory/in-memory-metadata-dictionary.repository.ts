import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';
import { MetadataDictionaryRepositoryPort } from '@src/modules/metadata/domain/repositories/metadata-dictionary-repository.port';

export class InMemoryMetadataDictionaryRepository
  implements MetadataDictionaryRepositoryPort
{
  public constructor(private readonly items: MetadataDictionary[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByDictionaryKey(
    entityType: string,
    dictionaryKey: string,
  ): Promise<MetadataDictionary | null> {
    return (
      this.items.find(
        (item) => item.entityType === entityType && item.dictionaryKey === dictionaryKey,
      ) ?? null
    );
  }

  public async findById(id: string): Promise<MetadataDictionary | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async list(): Promise<MetadataDictionary[]> {
    return [...this.items];
  }

  public async save(aggregate: MetadataDictionary): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
