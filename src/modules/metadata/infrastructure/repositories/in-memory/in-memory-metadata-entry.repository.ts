import { MetadataEntry } from '@src/modules/metadata/domain/entities/metadata-entry.entity';
import { MetadataEntryRepositoryPort } from '@src/modules/metadata/domain/repositories/metadata-entry-repository.port';

export class InMemoryMetadataEntryRepository implements MetadataEntryRepositoryPort {
  public constructor(private readonly items: MetadataEntry[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByDictionaryId(metadataDictionaryId: string): Promise<MetadataEntry[]> {
    return this.items.filter((item) => item.metadataDictionaryId === metadataDictionaryId);
  }

  public async findByEntryKey(
    metadataDictionaryId: string,
    entryKey: string,
  ): Promise<MetadataEntry | null> {
    return (
      this.items.find(
        (item) =>
          item.metadataDictionaryId === metadataDictionaryId && item.entryKey === entryKey,
      ) ?? null
    );
  }

  public async findById(id: string): Promise<MetadataEntry | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async save(aggregate: MetadataEntry): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
