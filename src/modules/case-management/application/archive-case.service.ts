import { Injectable, NotFoundException } from '@nestjs/common';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseId } from '../domain/value-objects/case-id';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

@Injectable()
export class ArchiveCaseService {
  public constructor(private readonly caseRecordRepository: CaseRecordRepositoryPort) {}

  public async execute(caseId: string, actorId?: string): Promise<CaseRecord> {
    const id = CaseId.from(caseId);
    const caseRecord = await this.caseRecordRepository.findByCaseId(id);

    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }

    caseRecord.archive();
    // F-130 / D-103-write-path round 40 — stamp archiver before save.
    caseRecord.setUpdatedBy(actorId);
    await this.caseRecordRepository.save(caseRecord);

    return caseRecord;
  }
}
