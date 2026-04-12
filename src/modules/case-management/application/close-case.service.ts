import { Injectable } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseId } from '../domain/value-objects/case-id';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

@Injectable()
export class CloseCaseService {
  public constructor(
    private readonly caseRecordRepository: CaseRecordRepositoryPort,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(caseId: string): Promise<CaseRecord> {
    const id = CaseId.from(caseId);
    const caseRecord = await this.caseRecordRepository.findByCaseId(id);

    if (!caseRecord) {
      throw new Error('Case not found.');
    }

    caseRecord.close();
    await this.caseRecordRepository.save(caseRecord);

    void this.notificationEventTranslator?.caseClosed({
      caseId: caseRecord.caseId.value,
      subjectPersonId: caseRecord.subjectPersonId,
    });

    return caseRecord;
  }
}
