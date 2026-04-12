import { RadiusReconciliationRecord } from '../../../domain/entities/radius-reconciliation-record.entity';
import { RadiusReconciliationRecordRepositoryPort } from '../../../domain/repositories/radius-reconciliation-record.repository.port';

export class InMemoryRadiusReconciliationRecordRepository
  implements RadiusReconciliationRecordRepositoryPort
{
  public constructor(private readonly items: RadiusReconciliationRecord[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByExternalAccountId(
    provider: string,
    externalAccountId: string,
  ): Promise<RadiusReconciliationRecord | null> {
    return (
      this.items.find(
        (item) => item.provider === provider && item.externalAccountId === externalAccountId,
      ) ?? null
    );
  }

  public async findById(id: string): Promise<RadiusReconciliationRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async listByProvider(provider: string): Promise<RadiusReconciliationRecord[]> {
    return this.items.filter((item) => item.provider === provider);
  }

  public async save(aggregate: RadiusReconciliationRecord): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
