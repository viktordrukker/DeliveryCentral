import { Prisma } from '@prisma/client';

import { CaseParticipant } from '@src/modules/case-management/domain/entities/case-participant.entity';
import { CaseRecord } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseType } from '@src/modules/case-management/domain/entities/case-type.entity';
import { CaseId } from '@src/modules/case-management/domain/value-objects/case-id';

// F-49 / 20c-11 — replace the hand-rolled `PrismaCaseRecord` interface with a
// Prisma-derived shape that mirrors the include set used by the repository.
// Callers pass the include shape verbatim so no `as unknown as` cast is needed
// to bridge the gap between Prisma's actual return type and the mapper input.
export const CASE_RECORD_MAPPER_INCLUDE = Prisma.validator<Prisma.CaseRecordInclude>()({
  caseType: true,
  participants: true,
});

type CaseRecordRow = Prisma.CaseRecordGetPayload<{ include: typeof CASE_RECORD_MAPPER_INCLUDE }>;

export class CaseManagementPrismaMapper {
  public static toDomain(record: CaseRecordRow): CaseRecord {
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
