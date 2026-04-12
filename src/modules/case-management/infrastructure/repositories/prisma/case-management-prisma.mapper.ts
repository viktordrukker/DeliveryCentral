import { CaseParticipant } from '@src/modules/case-management/domain/entities/case-participant.entity';
import { CaseRecord } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseType } from '@src/modules/case-management/domain/entities/case-type.entity';
import { CaseId } from '@src/modules/case-management/domain/value-objects/case-id';

interface PrismaCaseRecord {
  caseNumber: string;
  caseType: {
    displayName: string;
    key: 'OFFBOARDING' | 'ONBOARDING' | 'PERFORMANCE' | 'TRANSFER';
  };
  id: string;
  openedAt: Date;
  participants: Array<{
    id: string;
    personId: string;
    role: 'APPROVER' | 'OBSERVER' | 'OPERATOR' | 'REVIEWER' | 'REQUESTER' | 'SUBJECT';
  }>;
  relatedAssignmentId: string | null;
  relatedProjectId: string | null;
  status: 'ARCHIVED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED' | 'IN_PROGRESS' | 'OPEN' | 'REJECTED';
  subjectPersonId: string;
}

export class CaseManagementPrismaMapper {
  public static toDomain(record: PrismaCaseRecord & { ownerPersonId: string; summary: string | null }): CaseRecord {
    return CaseRecord.create(
      {
        caseNumber: record.caseNumber,
        caseType: CaseType.from(record.caseType.key),
        openedAt: record.openedAt,
        ownerPersonId: record.ownerPersonId,
        participants: record.participants.map((participant) =>
          CaseParticipant.create(
            {
              personId: participant.personId,
              role: participant.role,
            },
            participant.id,
          ),
        ),
        relatedAssignmentId: record.relatedAssignmentId ?? undefined,
        relatedProjectId: record.relatedProjectId ?? undefined,
        status: record.status,
        subjectPersonId: record.subjectPersonId,
        summary: record.summary ?? undefined,
      },
      CaseId.from(record.id),
    );
  }
}
