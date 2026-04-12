import { Injectable } from '@nestjs/common';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseId } from '../domain/value-objects/case-id';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

@Injectable()
export class ReopenCaseService {
  public constructor(
    private readonly caseRecordRepository: CaseRecordRepositoryPort,
  ) {}

  public async execute(caseId: string): Promise<CaseRecord> {
    const id = CaseId.from(caseId);
    const caseRecord = await this.caseRecordRepository.findByCaseId(id);

    if (!caseRecord) {
      throw new Error('Case not found.');
    }

    caseRecord.reopen();
    await this.caseRecordRepository.save(caseRecord);

    return caseRecord;
  }
}
