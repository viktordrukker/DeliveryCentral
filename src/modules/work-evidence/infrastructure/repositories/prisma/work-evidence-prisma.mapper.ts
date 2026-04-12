import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';

interface PrismaWorkEvidenceRecord {
  details: Record<string, unknown> | null;
  durationMinutes: number | null;
  evidenceType: string;
  id: string;
  occurredOn: Date | null;
  personId: string | null;
  projectId: string | null;
  recordedAt: Date;
  sourceRecordKey: string;
  summary: string | null;
  trace: Record<string, unknown> | null;
  workEvidenceSource: {
    displayName: string;
    id: string;
    provider: string;
    sourceType: string;
  };
}

export class WorkEvidencePrismaMapper {
  public static toDomain(record: PrismaWorkEvidenceRecord): WorkEvidence {
    return WorkEvidence.create(
      {
        details: record.details ?? undefined,
        durationMinutes: record.durationMinutes ?? undefined,
        evidenceType: record.evidenceType,
        occurredOn: record.occurredOn ?? undefined,
        personId: record.personId ?? undefined,
        projectId: record.projectId ?? undefined,
        recordedAt: record.recordedAt,
        source: WorkEvidenceSource.create(
          {
            displayName: record.workEvidenceSource.displayName,
            provider: record.workEvidenceSource.provider,
            sourceType: record.workEvidenceSource.sourceType,
          },
          record.workEvidenceSource.id,
        ),
        sourceRecordKey: record.sourceRecordKey,
        summary: record.summary ?? undefined,
        trace: record.trace ?? undefined,
      },
      WorkEvidenceId.from(record.id),
    );
  }
}
