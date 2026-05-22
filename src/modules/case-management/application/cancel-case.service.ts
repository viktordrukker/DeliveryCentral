import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseId } from '../domain/value-objects/case-id';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

interface CancelCaseCommand {
  caseId: string;
  reason: string;
  // F-130 / D-103-write-path round 40 — actor for updatedByPersonId.
  actorId?: string;
}

@Injectable()
export class CancelCaseService {
  public constructor(private readonly caseRecordRepository: CaseRecordRepositoryPort) {}

  public async execute(command: CancelCaseCommand): Promise<CaseRecord> {
    const id = CaseId.from(command.caseId);
    const caseRecord = await this.caseRecordRepository.findByCaseId(id);

    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }

    if (!command.reason || command.reason.trim().length === 0) {
      throw new BadRequestException('A cancellation reason is required.');
    }

    caseRecord.cancel(command.reason.trim());
    // F-130 / D-103-write-path round 40 — stamp canceller before save.
    caseRecord.setUpdatedBy(command.actorId);
    await this.caseRecordRepository.save(caseRecord);

    return caseRecord;
  }
}
