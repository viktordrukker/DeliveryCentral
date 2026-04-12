import { RepositoryPort } from '@src/shared/domain/repository-port';

import { M365DirectoryReconciliationRecord } from '../entities/m365-directory-reconciliation-record.entity';

export interface M365DirectoryReconciliationRecordRepositoryPort
  extends RepositoryPort<M365DirectoryReconciliationRecord> {
  findByExternalUserId(
    provider: string,
    externalUserId: string,
  ): Promise<M365DirectoryReconciliationRecord | null>;
  listByProvider(provider: string): Promise<M365DirectoryReconciliationRecord[]>;
}
