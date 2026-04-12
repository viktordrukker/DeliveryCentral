import { ExternalSyncState } from '@src/modules/project-registry/domain/entities/external-sync-state.entity';
import { ExternalSyncStateRepositoryPort } from '@src/modules/project-registry/domain/repositories/external-sync-state-repository.port';

export class InMemoryExternalSyncStateRepository implements ExternalSyncStateRepositoryPort {
  public constructor(private readonly items: ExternalSyncState[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<ExternalSyncState | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByProjectExternalLinkId(
    projectExternalLinkId: string,
  ): Promise<ExternalSyncState | null> {
    return (
      this.items.find((item) => item.projectExternalLinkId === projectExternalLinkId) ?? null
    );
  }

  public async save(aggregate: ExternalSyncState): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
