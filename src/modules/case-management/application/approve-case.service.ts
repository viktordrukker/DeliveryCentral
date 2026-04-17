import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

interface ApproveCaseCommand {
  caseId: string;
  actorId: string;
}

interface RejectCaseCommand {
  caseId: string;
  actorId: string;
  reason: string;
}

@Injectable()
export class ApproveCaseService {
  public constructor(
    private readonly caseRecordRepository: CaseRecordRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async approve(command: ApproveCaseCommand): Promise<CaseRecord> {
    const caseRecord = await this.caseRecordRepository.findById(command.caseId);
    if (!caseRecord) throw new Error('Case not found.');

    caseRecord.approve();
    await this.caseRecordRepository.save(caseRecord);

    this.auditLogger?.record({
      actionType: 'case.approved',
      actorId: command.actorId,
      category: 'approval',
      changeSummary: `Case ${command.caseId} approved.`,
      details: { caseId: command.caseId },
      metadata: { caseId: command.caseId },
      targetEntityId: command.caseId,
      targetEntityType: 'CASE',
    });

    return caseRecord;
  }

  public async reject(command: RejectCaseCommand): Promise<CaseRecord> {
    const caseRecord = await this.caseRecordRepository.findById(command.caseId);
    if (!caseRecord) throw new Error('Case not found.');

    caseRecord.reject(command.reason);
    await this.caseRecordRepository.save(caseRecord);

    this.auditLogger?.record({
      actionType: 'case.rejected',
      actorId: command.actorId,
      category: 'approval',
      changeSummary: `Case ${command.caseId} rejected. Reason: ${command.reason}`,
      details: { caseId: command.caseId, reason: command.reason },
      metadata: { caseId: command.caseId, reason: command.reason },
      targetEntityId: command.caseId,
      targetEntityType: 'CASE',
    });

    return caseRecord;
  }
}
