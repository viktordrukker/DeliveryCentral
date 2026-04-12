import { RepositoryPort } from '@src/shared/domain/repository-port';

import { CaseRecord } from '../entities/case-record.entity';
import { CaseId } from '../value-objects/case-id';

export interface CaseRecordRepositoryPort extends RepositoryPort<CaseRecord> {
  count(): Promise<number>;
  findByCaseId(caseId: CaseId): Promise<CaseRecord | null>;
  list(query: { caseTypeKey?: string; ownerPersonId?: string; subjectPersonId?: string }): Promise<CaseRecord[]>;
}
