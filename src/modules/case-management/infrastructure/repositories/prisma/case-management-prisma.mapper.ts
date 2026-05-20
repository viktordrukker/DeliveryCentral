import { Prisma } from '@prisma/client';

import { CaseParticipant, CaseParticipantRole } from '@src/modules/case-management/domain/entities/case-participant.entity';
import { CaseRecord, CaseStatus } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseType, CaseTypeKey } from '@src/modules/case-management/domain/entities/case-type.entity';
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
    // F-49 — Prisma generates `$Enums.CaseTypeKey` / `$Enums.CaseStatus` /
    // `$Enums.CaseParticipantRole` from the schema; the domain side keeps its
    // own string-literal unions with identical members. The values are
    // identical at runtime — these targeted casts only paper over the
    // nominal difference between the two declarations.
    return CaseRecord.create(
      {
        caseNumber: record.caseNumber,
        caseType: CaseType.from(record.caseType.key as CaseTypeKey),
        openedAt: record.openedAt,
        ownerPersonId: record.ownerPersonId,
        participants: record.participants.map((participant) =>
          CaseParticipant.create(
            {
              personId: participant.personId,
              role: participant.role as CaseParticipantRole,
            },
            participant.id,
          ),
        ),
        relatedAssignmentId: record.relatedAssignmentId ?? undefined,
        relatedProjectId: record.relatedProjectId ?? undefined,
        status: record.status as CaseStatus,
        subjectPersonId: record.subjectPersonId,
        summary: record.summary ?? undefined,
      },
      CaseId.from(record.id),
    );
  }
}
