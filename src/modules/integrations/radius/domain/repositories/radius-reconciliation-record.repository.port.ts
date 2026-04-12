import { RepositoryPort } from '@src/shared/domain/repository-port';

import { RadiusReconciliationRecord } from '../entities/radius-reconciliation-record.entity';

export interface RadiusReconciliationRecordRepositoryPort
  extends RepositoryPort<RadiusReconciliationRecord> {
  findByExternalAccountId(
    provider: string,
    externalAccountId: string,
  ): Promise<RadiusReconciliationRecord | null>;
  listByProvider(provider: string): Promise<RadiusReconciliationRecord[]>;
}
