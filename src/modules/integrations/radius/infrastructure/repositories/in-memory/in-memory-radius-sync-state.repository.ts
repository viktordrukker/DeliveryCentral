import { RadiusSyncState } from '../../../domain/entities/radius-sync-state.entity';
import { RadiusSyncStateRepositoryPort } from '../../../domain/repositories/radius-sync-state.repository.port';

export class InMemoryRadiusSyncStateRepository implements RadiusSyncStateRepositoryPort {
  public constructor(private readonly items: RadiusSyncState[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<RadiusSyncState | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByScope(
    provider: string,
    resourceType: string,
    scopeKey: string,
  ): Promise<RadiusSyncState | null> {
    return (
      this.items.find(
        (item) =>
          item.provider === provider &&
          item.resourceType === resourceType &&
          item.scopeKey === scopeKey,
      ) ?? null
    );
  }

  public async save(aggregate: RadiusSyncState): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
