import { Injectable } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { CaseReferenceRepositoryPort } from './ports/case-reference.repository.port';
import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseParticipant } from '../domain/entities/case-participant.entity';
import { CaseTypeKey, CaseType } from '../domain/entities/case-type.entity';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

interface CreateCaseCommand {
  caseTypeKey: CaseTypeKey;
  ownerPersonId: string;
  participants?: Array<{
    personId: string;
    role: 'APPROVER' | 'OBSERVER' | 'OPERATOR' | 'REVIEWER' | 'REQUESTER' | 'SUBJECT';
  }>;
  relatedAssignmentId?: string;
  relatedProjectId?: string;
  subjectPersonId: string;
  summary?: string;
}

@Injectable()
export class CreateCaseService {
  public constructor(
    private readonly caseRecordRepository: CaseRecordRepositoryPort,
    private readonly caseReferenceRepository?: CaseReferenceRepositoryPort,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(command: CreateCaseCommand): Promise<CaseRecord> {
    const validTypes: CaseTypeKey[] = ['ONBOARDING', 'OFFBOARDING', 'TRANSFER', 'PERFORMANCE'];
    if (!validTypes.includes(command.caseTypeKey)) {
      throw new Error(`Unsupported case type: ${command.caseTypeKey}`);
    }

    if (!(await this.personExists(command.subjectPersonId))) {
      throw new Error('Case subject person does not exist.');
    }

    if (!(await this.personExists(command.ownerPersonId))) {
      throw new Error('Case owner person does not exist.');
    }

    if (command.relatedProjectId && !(await this.projectExists(command.relatedProjectId))) {
      throw new Error('Related project does not exist.');
    }

    if (
      command.relatedAssignmentId &&
      !(await this.assignmentExists(command.relatedAssignmentId))
    ) {
      throw new Error('Related assignment does not exist.');
    }

    const participants = (command.participants ?? []).map((participant) =>
      CaseParticipant.create(participant),
    );

    const nextNumber = (await this.caseRecordRepository.count()) + 1;
    const caseRecord = CaseRecord.create({
      caseNumber: `CASE-${String(nextNumber).padStart(4, '0')}`,
      caseType: CaseType.from(command.caseTypeKey),
      openedAt: new Date(),
      ownerPersonId: command.ownerPersonId,
      participants,
      relatedAssignmentId: command.relatedAssignmentId,
      relatedProjectId: command.relatedProjectId,
      status: 'OPEN',
      subjectPersonId: command.subjectPersonId,
      summary: command.summary,
    });

    await this.caseRecordRepository.save(caseRecord);

    void this.notificationEventTranslator?.caseCreated({
      caseId: caseRecord.caseId.value,
      caseType: command.caseTypeKey,
      ownerPersonId: command.ownerPersonId,
      subjectPersonId: command.subjectPersonId,
    });

    return caseRecord;
  }

  private async assignmentExists(assignmentId: string): Promise<boolean> {
    if (!this.caseReferenceRepository) {
      return true;
    }

    return this.caseReferenceRepository.assignmentExists(assignmentId);
  }

  private async personExists(personId: string): Promise<boolean> {
    if (!this.caseReferenceRepository) {
      return true;
    }

    return this.caseReferenceRepository.personExists(personId);
  }

  private async projectExists(projectId: string): Promise<boolean> {
    if (!this.caseReferenceRepository) {
      return true;
    }

    return this.caseReferenceRepository.projectExists(projectId);
  }
}
