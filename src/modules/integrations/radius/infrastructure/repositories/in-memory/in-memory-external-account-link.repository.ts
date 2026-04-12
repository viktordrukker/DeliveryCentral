import { ExternalAccountLink } from '../../../domain/entities/external-account-link.entity';
import { ExternalAccountLinkRepositoryPort } from '../../../domain/repositories/external-account-link.repository.port';

export class InMemoryExternalAccountLinkRepository implements ExternalAccountLinkRepositoryPort {
  public constructor(private readonly items: ExternalAccountLink[] = []) {}

  public async countByProvider(provider: string): Promise<number> {
    return this.items.filter((item) => item.provider === provider).length;
  }

  public async countUnlinkedByProvider(provider: string): Promise<number> {
    return this.items.filter((item) => item.provider === provider && !item.personId).length;
  }

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByExternalAccountId(
    provider: string,
    externalAccountId: string,
  ): Promise<ExternalAccountLink | null> {
    return (
      this.items.find(
        (item) => item.provider === provider && item.externalAccountId === externalAccountId,
      ) ?? null
    );
  }

  public async findById(id: string): Promise<ExternalAccountLink | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async listByProvider(provider: string): Promise<ExternalAccountLink[]> {
    return this.items.filter((item) => item.provider === provider);
  }

  public async save(aggregate: ExternalAccountLink): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
