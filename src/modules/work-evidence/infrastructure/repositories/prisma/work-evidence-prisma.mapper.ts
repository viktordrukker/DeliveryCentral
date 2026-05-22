import { Prisma } from '@prisma/client';

import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';

interface PrismaWorkEvidenceRecord {
  // 20c-10 — Prisma's JSON return type is `Prisma.JsonValue` (which covers
  // primitives + arrays + objects); mapper extracts the object case below.
  details: Prisma.JsonValue | null;
  durationMinutes: number | null;
  evidenceType: string;
  id: string;
  occurredOn: Date | null;
  personId: string | null;
  projectId: string | null;
  recordedAt: Date;
  sourceRecordKey: string;
  summary: string | null;
  trace: Prisma.JsonValue | null;
  workEvidenceSource: {
    displayName: string;
    id: string;
    provider: string;
    sourceType: string;
  };
}

// 20c-10 — narrow JsonValue → Record<string, unknown> for the domain entity.
function asJsonObject(v: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return undefined;
}

export class WorkEvidencePrismaMapper {
  public static toDomain(record: PrismaWorkEvidenceRecord): WorkEvidence {
    return WorkEvidence.create(
      {
        details: asJsonObject(record.details),
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
        trace: asJsonObject(record.trace),
      },
      WorkEvidenceId.from(record.id),
    );
  }
}
