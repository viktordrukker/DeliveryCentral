import { M365DirectoryReconciliationRecord } from '../../../domain/entities/m365-directory-reconciliation-record.entity';
import { M365DirectoryReconciliationRecordRepositoryPort } from '../../../domain/repositories/m365-directory-reconciliation-record.repository.port';

export class InMemoryM365DirectoryReconciliationRecordRepository
  implements M365DirectoryReconciliationRecordRepositoryPort
{
  public constructor(private readonly items: M365DirectoryReconciliationRecord[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByExternalUserId(
    provider: string,
    externalUserId: string,
  ): Promise<M365DirectoryReconciliationRecord | null> {
    return (
      this.items.find(
        (item) => item.provider === provider && item.externalUserId === externalUserId,
      ) ?? null
    );
  }

  public async findById(id: string): Promise<M365DirectoryReconciliationRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async listByProvider(provider: string): Promise<M365DirectoryReconciliationRecord[]> {
    return this.items.filter((item) => item.provider === provider);
  }

  public async save(aggregate: M365DirectoryReconciliationRecord): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
