import { DirectorySyncState } from '../../../domain/entities/directory-sync-state.entity';
import { DirectorySyncStateRepositoryPort } from '../../../domain/repositories/directory-sync-state.repository.port';

export class InMemoryDirectorySyncStateRepository implements DirectorySyncStateRepositoryPort {
  public constructor(private readonly items: DirectorySyncState[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<DirectorySyncState | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByScope(
    provider: string,
    resourceType: string,
    scopeKey: string,
  ): Promise<DirectorySyncState | null> {
    return (
      this.items.find(
        (item) =>
          item.provider === provider &&
          item.resourceType === resourceType &&
          item.scopeKey === scopeKey,
      ) ?? null
    );
  }

  public async save(aggregate: DirectorySyncState): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
