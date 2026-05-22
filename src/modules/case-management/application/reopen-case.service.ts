import { Injectable, NotFoundException } from '@nestjs/common';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseId } from '../domain/value-objects/case-id';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

@Injectable()
export class ReopenCaseService {
  public constructor(
    private readonly caseRecordRepository: CaseRecordRepositoryPort,
  ) {}

  public async execute(caseId: string, actorId?: string): Promise<CaseRecord> {
    const id = CaseId.from(caseId);
    const caseRecord = await this.caseRecordRepository.findByCaseId(id);

    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }

    caseRecord.reopen();
    // F-130 / D-103-write-path round 40 — stamp reopener before save.
    caseRecord.setUpdatedBy(actorId);
    await this.caseRecordRepository.save(caseRecord);

    return caseRecord;
  }
}
